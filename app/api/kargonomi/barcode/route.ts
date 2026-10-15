import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { KargonomiError, getKargonomiBarcode } from "@/lib/kargonomi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/kargonomi/barcode?orderId=...&format=pdf — Basic Auth ile korunur. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const orderId = params.get("orderId");
  const format = (params.get("format") || "pdf") as "pdf" | "png" | "zpl";

  if (!orderId) return NextResponse.json({ error: "orderId zorunludur." }, { status: 400 });
  if (!["pdf", "png", "zpl"].includes(format)) {
    return NextResponse.json({ error: "Geçersiz format." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { kargonomiShipmentId: true, id: true } });
  if (!order?.kargonomiShipmentId) {
    return NextResponse.json({ error: "Bu sipariş için Kargonomi gönderisi yok." }, { status: 404 });
  }

  try {
    const { data, contentType } = await getKargonomiBarcode(order.kargonomiShipmentId, format);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="barkod-${order.id.slice(0, 8)}.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const status = err instanceof KargonomiError && err.status >= 400 && err.status < 600 ? err.status : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
