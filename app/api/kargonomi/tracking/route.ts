import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public kargo takip: sipariş kodu, takip numarası veya paket barkodu (YA-XXXXXXXX) ile sorgular.
 * Kişisel veri (ad, adres, telefon) ASLA döndürülmez.
 */
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") || "").trim();
  if (code.length < 6 || code.length > 64) {
    return NextResponse.json({ error: "Lütfen geçerli bir sipariş kodu, takip numarası veya barkod girin." }, { status: 400 });
  }

  const barcode = /^YA-([0-9A-F]{8})$/i.exec(code);
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: code },
        { shippingTrackingCode: code },
        { shippingBarcode: code },
        ...(barcode ? [{ id: { startsWith: barcode[1].toLowerCase() } }] : []),
      ],
    },
    select: {
      id: true,
      status: true,
      shippingType: true,
      createdAt: true,
      kargonomiStatusLabel: true,
      shippingProviderName: true,
      shippingTrackingCode: true,
      shippingBarcode: true,
      buyerStateName: true,
      buyerCityName: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Bu koda ait bir sipariş bulunamadı." }, { status: 404 });
  }

  // 4 aşamalı ilerleme: Sipariş alındı → Hazırlanıyor → Kargoda / Teslime hazır → Teslim edildi
  const isStore = order.shippingType === "BEYOGLU_MAGAZA_TESLIM";
  const stage =
    order.status === "DELIVERED" ? 4 : order.status === "SHIPPED" || order.status === "READY_FOR_PICKUP" ? 3 : order.status === "PENDING" && order.kargonomiStatusLabel ? 2 : order.status === "CANCELLED" ? 0 : 1;

  return NextResponse.json({
    orderCode: order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    stage,
    steps: ["Sipariş Alındı", "Hazırlanıyor", isStore ? "Mağazada Teslime Hazır" : "Kargoda", "Teslim Edildi"],
    statusLabel: order.kargonomiStatusLabel,
    provider: order.shippingProviderName,
    trackingCode: order.shippingTrackingCode,
    barcode: order.shippingBarcode,
    destination: [order.buyerCityName, order.buyerStateName].filter(Boolean).join(" / ") || null,
    createdAt: order.createdAt,
    isStorePickup: isStore,
  });
}
