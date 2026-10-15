import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderNotificationEmails } from "@/lib/email";
import {
  createKargonomiShipment,
  getKargonomiCities,
  isKargonomiConfigured,
  isValidTrPhone,
  normalizePhone,
  pickShipmentFields,
} from "@/lib/kargonomi";
import { applyShipmentToOrder } from "@/lib/kargonomi-sync";

export const runtime = "nodejs";

const CARGO_FEE = 250;
const BANK_TRANSFER_DISCOUNT = 0.05;
const COUPONS: Record<string, { type: "percent" | "fixed"; value: number }> = {
  BEYOGLU10: { type: "percent", value: 10 },
  YILDIRIM15: { type: "percent", value: 15 },
  USTA500: { type: "fixed", value: 500 },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IncomingItem {
  variationId?: string;
  quantity?: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const shippingType = body.shippingType === "STANDART_KARGO" ? "STANDART_KARGO" : "BEYOGLU_MAGAZA_TESLIM";
    const paymentMethod = body.paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CREDIT_CARD";
    const incoming: IncomingItem[] = Array.isArray(body.items) ? body.items : [];

    if (incoming.length === 0) {
      return NextResponse.json({ error: "Sepetiniz boş olamaz" }, { status: 400 });
    }
    if (!name || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Geçerli bir ad ve e-posta adresi girin." }, { status: 400 });
    }

    const isCargo = shippingType === "STANDART_KARGO";
    const buyerStateId = Number(body.buyerStateId) || 34;
    const buyerCityId = Number(body.buyerCityId) || 425;

    if (isCargo) {
      if (!isValidTrPhone(phone)) {
        return NextResponse.json({ error: "Kargo için geçerli bir cep telefonu girin (5XX XXX XX XX)." }, { status: 400 });
      }
      if (address.length < 10) {
        return NextResponse.json({ error: "Kargo için açık teslimat adresi girin." }, { status: 400 });
      }
      // İlçe, seçilen ile ait mi? (Kargonomi erişilemezse doğrulama atlanır; admin taslakta yakalar)
      if (isKargonomiConfigured()) {
        const cities = await getKargonomiCities(buyerStateId).catch(() => []);
        if (cities.length > 0 && !cities.some((c) => c.id === buyerCityId)) {
          return NextResponse.json({ error: "Seçilen ilçe, seçilen ile ait değil." }, { status: 400 });
        }
      }
    }

    // 1. Müşteriyi bul / misafir olarak oluştur
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name, email, password: "guest_checkout", role: "USER" },
      });
    }

    // 2. Fiyatları SUNUCUDA hesapla (istemciden gelen fiyat/tutara güvenilmez)
    const ids = [...new Set(incoming.map((i) => String(i.variationId ?? "")))];
    const variations = await prisma.productVariation.findMany({
      where: { id: { in: ids } },
      include: { product: true },
    });
    const byId = new Map(variations.map((v) => [v.id, v]));

    const lines: { variationId: string; quantity: number; unitPrice: number; title: string; variationName: string }[] = [];
    for (const item of incoming) {
      const variation = byId.get(String(item.variationId ?? ""));
      const quantity = Math.floor(Number(item.quantity));
      if (!variation || !Number.isFinite(quantity) || quantity < 1 || quantity > 50) {
        return NextResponse.json(
          { error: "Sepetinizdeki bir ürün artık mevcut değil. Lütfen sepeti yenileyip tekrar deneyin." },
          { status: 400 }
        );
      }
      if (variation.stock < quantity) {
        return NextResponse.json(
          { error: `"${variation.product.title}" için yeterli stok yok (kalan: ${variation.stock}).` },
          { status: 409 }
        );
      }
      lines.push({
        variationId: variation.id,
        quantity,
        unitPrice: variation.product.basePrice + variation.extraPrice,
        title: variation.product.title,
        variationName: `${variation.variationType}: ${variation.variationValue}`,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const coupon = COUPONS[String(body.couponCode ?? "").trim().toUpperCase()];
    const couponDiscount = coupon
      ? coupon.type === "percent"
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(subtotal, coupon.value)
      : 0;
    const afterCoupon = Math.max(0, subtotal + (isCargo ? CARGO_FEE : 0) - couponDiscount);
    const bankDiscount = paymentMethod === "BANK_TRANSFER" ? Math.round(afterCoupon * BANK_TRANSFER_DISCOUNT) : 0;
    const totalAmount = Math.max(0, afterCoupon - bankDiscount);

    const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
    const packageDesi = Number(body.packageDesi) > 0 ? Number(body.packageDesi) : Math.max(3, totalQty * 3);

    // 3. Sipariş + stok düşümü tek işlemde (yarış durumlarına karşı koşullu güncelleme)
    const order = await prisma.$transaction(async (tx) => {
      for (const l of lines) {
        const res = await tx.productVariation.updateMany({
          where: { id: l.variationId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count !== 1) throw new Error(`"${l.title}" için stok yetersiz.`);
      }
      return tx.order.create({
        data: {
          userId: user.id,
          totalAmount,
          shippingType,
          status: "PENDING",
          phone: phone ? normalizePhone(phone) : null,
          address: address || null,
          buyerStateId: isCargo ? buyerStateId : 34,
          buyerCityId: isCargo ? buyerCityId : 425,
          buyerStateName: String(body.buyerStateName || "İSTANBUL"),
          buyerCityName: String(body.buyerCityName || "BEYOĞLU"),
          packageDesi,
          items: {
            create: lines.map((l) => ({ variationId: l.variationId, quantity: l.quantity, unitPrice: l.unitPrice })),
          },
        },
      });
    });

    // 4. Kargo ise Kargonomi'de taslak gönderi oluştur (başarısızlık siparişi engellemez; admin panelinden tekrar denenir)
    let kargonomiInfo: { shipmentId: number; status: string | null; statusLabel: string; barcode: string | null } | null = null;
    let kargonomiWarning: string | null = null;
    let finalOrder = order;

    if (isCargo && isKargonomiConfigured()) {
      try {
        const shipment = await createKargonomiShipment({
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
          buyer_address: address,
          buyer_state_id: buyerStateId,
          buyer_city_id: buyerCityId,
          packages: [
            {
              content: lines.map((l) => `${l.quantity}x ${l.title}`).join(", ").slice(0, 200),
              barcode: `YA-${order.id.slice(0, 8).toUpperCase()}`,
              desi: packageDesi,
            },
          ],
        });
        const f = pickShipmentFields(shipment);
        if (f.id) {
          finalOrder = (await applyShipmentToOrder(order.id, shipment)) ?? order;
          kargonomiInfo = { shipmentId: f.id, status: f.status, statusLabel: f.statusLabel, barcode: f.barcode };
        } else {
          kargonomiWarning = "Kargonomi gönderi kimliği döndürmedi.";
        }
      } catch (kargoErr) {
        kargonomiWarning = (kargoErr as Error).message;
        console.warn("[order] Kargonomi taslak gönderi oluşturulamadı (admin panelinden tekrar denenebilir):", kargonomiWarning);
      }
    }

    // 5. E-posta (hata siparişi etkilemez)
    void Promise.resolve(
      sendOrderNotificationEmails({
        orderId: finalOrder.id,
        customerName: name,
        customerEmail: email,
        totalAmount,
        shippingType,
        kargonomiShipmentId: finalOrder.kargonomiShipmentId,
        shippingBarcode: finalOrder.shippingBarcode,
        items: lines.map((l) => ({ title: l.title, variationName: l.variationName, quantity: l.quantity, price: l.unitPrice })),
      })
    ).catch((e) => console.error("[order] e-posta hatası:", e));

    return NextResponse.json({
      success: true,
      orderId: finalOrder.id,
      totalAmount,
      kargonomi: kargonomiInfo,
      kargonomiWarning,
    });
  } catch (error) {
    console.error("[order] hata:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}