import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pickShipmentFields, verifyKargonomiWebhookSignature, type KargonomiShipment } from "@/lib/kargonomi";
import { applyShipmentToOrder, findOrderForShipment } from "@/lib/kargonomi-sync";

// Ham gövde (raw body) ve Node crypto gerektiğinden statik/edge olmamalı
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Kargonomi → `shipment.updated` webhook alıcısı.
 *
 * Güvenlik:
 *  1. KARGONOMI_WEBHOOK_SECRET tanımlı değilse istek reddedilir (503) — "varsayılan açık" yoktur.
 *  2. X-Webhook-Signature, HAM gövde üzerinden HMAC-SHA256 ile sabit-zamanlı doğrulanır.
 *  3. Her olay KargonomiWebhookEvent tablosunda tekil anahtarla kaydedilir → retry'lar mükerrer işlem yapmaz.
 *
 * Yanıt kodları (Kargonomi 2xx dışındakini yeniden dener: 60s → 120s → 300s → 600s):
 *  401 imza geçersiz · 400 gövde geçersiz · 503 secret yok · 500 geçici hata (retry istenir) · 200 işlendi/yoksayıldı
 */
export async function POST(req: Request) {
  const secret = process.env.KARGONOMI_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[kargonomi-webhook] KARGONOMI_WEBHOOK_SECRET tanımlı değil; istek reddedildi.");
    return NextResponse.json({ error: "Webhook yapılandırılmamış." }, { status: 503 });
  }

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Gövde çok büyük." }, { status: 413 });
  }

  const signature = req.headers.get("x-webhook-signature");
  if (!verifyKargonomiWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const eventType: string = String(payload?.event ?? payload?.type ?? payload?.event_type ?? "unknown");
  const shipment: KargonomiShipment | null =
    payload?.data?.shipment ?? payload?.shipment ?? (payload?.data && typeof payload.data === "object" ? payload.data : null);

  const fields = shipment ? pickShipmentFields(shipment) : null;
  const eventId = payload?.id ?? payload?.event_id ?? payload?.uuid;
  const eventKey = eventId
    ? `evt:${eventId}`
    : `sha:${crypto.createHash("sha256").update(rawBody).digest("hex")}`;

  // Idempotency: aynı olay daha önce işlendiyse tekrar işleme
  const existing = await prisma.kargonomiWebhookEvent.findUnique({ where: { eventKey } });
  if (existing?.processedAt) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const eventRow =
    existing ??
    (await prisma.kargonomiWebhookEvent.create({
      data: {
        eventKey,
        eventType,
        shipmentId: fields?.id ?? null,
        payload: payload as Prisma.InputJsonValue,
      },
    }));

  try {
    if (eventType !== "shipment.updated" && eventType !== "shipment.created") {
      await prisma.kargonomiWebhookEvent.update({ where: { id: eventRow.id }, data: { processedAt: new Date() } });
      return NextResponse.json({ received: true, ignored: eventType });
    }

    if (!shipment || !fields?.id) {
      await prisma.kargonomiWebhookEvent.update({
        where: { id: eventRow.id },
        data: { processedAt: new Date(), error: "Gönderi verisi yok" },
      });
      return NextResponse.json({ received: true, ignored: "no-shipment" });
    }

    const order = await findOrderForShipment(shipment);
    if (!order) {
      // Bilinmeyen gönderi: yeniden denemenin faydası yok → 200
      await prisma.kargonomiWebhookEvent.update({
        where: { id: eventRow.id },
        data: { processedAt: new Date(), error: "Eşleşen sipariş bulunamadı" },
      });
      return NextResponse.json({ received: true, matched: false });
    }

    const updated = await applyShipmentToOrder(order.id, shipment);
    await prisma.kargonomiWebhookEvent.update({
      where: { id: eventRow.id },
      data: { processedAt: new Date(), error: null },
    });

    return NextResponse.json({ received: true, matched: true, orderId: order.id, status: updated?.status });
  } catch (err) {
    console.error("[kargonomi-webhook] işleme hatası:", err);
    await prisma.kargonomiWebhookEvent
      .update({ where: { id: eventRow.id }, data: { error: (err as Error).message.slice(0, 500) } })
      .catch(() => {});
    // 500 → Kargonomi yeniden dener
    return NextResponse.json({ error: "İşleme hatası." }, { status: 500 });
  }
}

// Kargonomi panelinden URL doğrulaması için sağlık kontrolü
export async function GET() {
  return NextResponse.json({ ok: true, service: "kargonomi-webhook" });
}
