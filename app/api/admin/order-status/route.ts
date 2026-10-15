import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALLOWED = ["PENDING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
type Status = (typeof ALLOWED)[number];

/** proxy.ts tarafından Basic Auth ile korunur. */
export async function POST(req: Request) {
  try {
    const { orderId, status } = await req.json();

    if (typeof orderId !== "string" || !orderId || !ALLOWED.includes(status as Status)) {
      return NextResponse.json({ error: "Eksik veya geçersiz parametre" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as Status },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}