import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  KargonomiError,
  KARGONOMI_PROVIDERS,
  createDefaultKargonomiWarehouse,
  createKargonomiShipment,
  createKargonomiWebhook,
  deleteKargonomiShipment,
  getKargonomiCredit,
  getKargonomiPriceQuotes,
  getKargonomiShipment,
  isKargonomiConfigured,
  isValidTrPhone,
  listKargonomiWarehouses,
  listKargonomiWebhooks,
  pickShipmentFields,
  selectKargonomiProvider,
} from "@/lib/kargonomi";
import { applyShipmentToOrder } from "@/lib/kargonomi-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bu uç nokta proxy.ts tarafından Basic Auth ile korunur. */

function fail(err: unknown) {
  if (err instanceof KargonomiError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status >= 400 && err.status < 600 ? err.status : 502 });
  }
  return NextResponse.json({ success: false, error: (err as Error).message || "Beklenmeyen hata" }, { status: 500 });
}

async function loadOrder(orderId: unknown) {
  if (typeof orderId !== "string" || !orderId) throw new KargonomiError("orderId zorunludur.", 400);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: { include: { variation: { include: { product: true } } } } },
  });
  if (!order) throw new KargonomiError("Sipariş bulunamadı.", 404);
  return order;
}

function requireShipmentId(order: { kargonomiShipmentId: number | null }): number {
  if (!order.kargonomiShipmentId) {
    throw new KargonomiError("Bu sipariş için henüz Kargonomi gönderisi oluşturulmadı.", 409);
  }
  return order.kargonomiShipmentId;
}

// ── GET: bakiye / depo / webhook / firma listesi ─────────────────────────────
export async function GET(req: Request) {
  const resource = new URL(req.url).searchParams.get("resource") || "credit";

  if (resource === "providers") {
    return NextResponse.json({ success: true, providers: KARGONOMI_PROVIDERS });
  }
  if (!isKargonomiConfigured()) {
    return NextResponse.json(
      { success: false, configured: false, error: "KARGONOMI_API_TOKEN tanımlı değil." },
      { status: 200 }
    );
  }

  try {
    if (resource === "credit") {
      const credit = await getKargonomiCredit();
      return NextResponse.json({ success: true, configured: true, ...credit });
    }
    if (resource === "warehouses") {
      return NextResponse.json({ success: true, warehouses: await listKargonomiWarehouses() });
    }
    if (resource === "webhooks") {
      return NextResponse.json({ success: true, webhooks: await listKargonomiWebhooks() });
    }
    return NextResponse.json({ success: false, error: "Geçersiz kaynak." }, { status: 400 });
  } catch (err) {
    return fail(err);
  }
}

// ── POST: işlem tabanlı (action) ─────────────────────────────────────────────
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Geçersiz JSON." }, { status: 400 });
  }
  const action = String(body.action ?? "");

  if (!isKargonomiConfigured()) {
    return NextResponse.json({ success: false, error: "KARGONOMI_API_TOKEN tanımlı değil." }, { status: 503 });
  }

  try {
    switch (action) {
      // Depo kaydı (Beyoğlu / Şişhane atölyesi)
      case "create-warehouse": {
        const warehouse = await createDefaultKargonomiWarehouse();
        return NextResponse.json({
          success: true,
          warehouse,
          hint: warehouse?.id
            ? `Depo oluşturuldu. .env dosyasına KARGONOMI_WAREHOUSE_ID="${warehouse.id}" ekleyin.`
            : undefined,
        });
      }

      // Webhook tanımla (public URL gerekir)
      case "setup-webhook": {
        const base = String(body.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
        if (!/^https:\/\//.test(base)) {
          throw new KargonomiError("Webhook için herkese açık bir https:// adresi gerekir (NEXT_PUBLIC_SITE_URL).", 400);
        }
        const hook = await createKargonomiWebhook(`${base}/api/kargonomi/webhook`);
        return NextResponse.json({
          success: true,
          webhook: hook,
          hint: "Yanıttaki secret değerini KARGONOMI_WEBHOOK_SECRET olarak .env dosyasına kaydedin.",
        });
      }

      // Taslak gönderi oluştur
      case "create-shipment": {
        const order = await loadOrder(body.orderId);
        if (order.shippingType !== "STANDART_KARGO") {
          throw new KargonomiError("Mağazadan teslim siparişler için kargo gönderisi oluşturulamaz.", 400);
        }
        if (order.kargonomiShipmentId) {
          throw new KargonomiError("Bu sipariş için zaten bir Kargonomi gönderisi var.", 409);
        }
        if (!isValidTrPhone(order.phone)) {
          throw new KargonomiError("Siparişteki telefon numarası geçersiz (5XXXXXXXXX formatında olmalı).", 400);
        }
        if (!order.address || !order.buyerStateId || !order.buyerCityId) {
          throw new KargonomiError("Siparişte teslimat adresi veya il/ilçe bilgisi eksik.", 400);
        }

        const content = order.items
          .map((i) => `${i.quantity}x ${i.variation.product.title}`)
          .join(", ")
          .slice(0, 200);
        const shipment = await createKargonomiShipment({
          buyer_name: order.user.name,
          buyer_email: order.user.email,
          buyer_phone: order.phone as string,
          buyer_address: order.address,
          buyer_state_id: order.buyerStateId,
          buyer_city_id: order.buyerCityId,
          packages: [
            {
              content: content || "Yıldırım Avize – Ahşap Sandık Kargo",
              barcode: `YA-${order.id.slice(0, 8).toUpperCase()}`,
              desi: order.packageDesi ?? 3,
            },
          ],
        });
        if (!pickShipmentFields(shipment).id) {
          throw new KargonomiError("Kargonomi gönderi kimliği döndürmedi.", 502, shipment);
        }
        const updated = await applyShipmentToOrder(order.id, shipment);
        return NextResponse.json({ success: true, order: updated });
      }

      // Fiyat tekliflerini getir
      case "quotes": {
        const order = await loadOrder(body.orderId);
        const quotes = await getKargonomiPriceQuotes(requireShipmentId(order));
        return NextResponse.json({ success: true, quotes: quotes.map(({ raw: _raw, ...q }) => q) });
      }

      // Kargo firması seç (-1 = otomatik)
      case "select-provider": {
        const order = await loadOrder(body.orderId);
        const providerId = Number(body.providerId);
        if (!Number.isInteger(providerId) || providerId === 0 || providerId < -1) {
          throw new KargonomiError("Geçersiz kargo firması.", 400);
        }
        const shipmentId = requireShipmentId(order);
        const quotes = providerId === -1 ? [] : await getKargonomiPriceQuotes(shipmentId).catch(() => []);
        const quote = quotes.find((q) => q.providerId === providerId);

        const shipment = await selectKargonomiProvider(shipmentId, providerId);
        const known = KARGONOMI_PROVIDERS.find((p) => p.id === providerId);

        await applyShipmentToOrder(order.id, { ...shipment, id: shipment?.id ?? shipmentId });
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            shippingProviderId: providerId,
            shippingProviderName: quote?.providerName ?? known?.name ?? order.shippingProviderName,
            ...(quote?.price != null ? { shippingPrice: String(quote.price) } : {}),
          },
        });
        return NextResponse.json({ success: true, order: updated });
      }

      // Canlı durum senkronizasyonu
      case "sync": {
        const order = await loadOrder(body.orderId);
        const shipment = await getKargonomiShipment(requireShipmentId(order));
        const updated = await applyShipmentToOrder(order.id, shipment);
        return NextResponse.json({ success: true, order: updated });
      }

      // Gönderiyi iptal et (Kargonomi'de sil + siparişten ayır)
      case "cancel": {
        const order = await loadOrder(body.orderId);
        await deleteKargonomiShipment(requireShipmentId(order));
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            kargonomiShipmentId: null,
            kargonomiStatus: null,
            kargonomiStatusLabel: null,
            shippingProviderId: null,
            shippingProviderName: null,
            shippingTrackingCode: null,
            shippingBarcode: null,
            shippingPrice: null,
          },
        });
        return NextResponse.json({ success: true, order: updated });
      }

      default:
        return NextResponse.json({ success: false, error: "Geçersiz işlem." }, { status: 400 });
    }
  } catch (err) {
    return fail(err);
  }
}
