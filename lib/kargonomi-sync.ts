import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  mapKargonomiStatusToOrderStatus,
  pickShipmentFields,
  type KargonomiShipment,
} from "@/lib/kargonomi";

/** Durumlar yalnızca ileri gider; CANCELLED her zaman uygulanır, DELIVERED/CANCELLED sonlandırıcıdır. */
const RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  READY_FOR_PICKUP: 0,
  SHIPPED: 1,
  DELIVERED: 2,
  CANCELLED: 3,
};

export function resolveNextOrderStatus(current: OrderStatus, incoming: OrderStatus): OrderStatus {
  if (current === "DELIVERED" || current === "CANCELLED") return current;
  if (incoming === "CANCELLED") return "CANCELLED";
  return RANK[incoming] > RANK[current] ? incoming : current;
}

/** Kargonomi gönderi nesnesini siparişe yansıtır (webhook + manuel senkronizasyon ortak kullanır). */
export async function applyShipmentToOrder(orderId: string, shipment: KargonomiShipment) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  const f = pickShipmentFields(shipment);
  const nextStatus = resolveNextOrderStatus(order.status, mapKargonomiStatusToOrderStatus(f.status));

  const data: Prisma.OrderUpdateInput = {
    status: nextStatus,
    kargonomiStatus: f.status ?? order.kargonomiStatus,
    kargonomiStatusLabel: f.statusLabel ?? order.kargonomiStatusLabel,
  };
  if (f.id) data.kargonomiShipmentId = f.id;
  if (f.trackingCode) data.shippingTrackingCode = f.trackingCode;
  if (f.barcode) data.shippingBarcode = f.barcode;
  if (f.providerId !== null) data.shippingProviderId = f.providerId;
  if (f.providerName) data.shippingProviderName = f.providerName;
  if (f.price !== null) data.shippingPrice = String(f.price);

  return prisma.order.update({ where: { id: orderId }, data });
}

/** Gönderi kimliği (öncelikli) veya barkod (YA-XXXXXXXX → sipariş kimliği öneki) ile sipariş bulur. */
export async function findOrderForShipment(shipment: KargonomiShipment) {
  const f = pickShipmentFields(shipment);

  if (f.id) {
    const byShipment = await prisma.order.findFirst({ where: { kargonomiShipmentId: f.id } });
    if (byShipment) return byShipment;
  }

  const code = String(f.barcode ?? shipment.shipment_packages?.[0]?.barcode ?? "");
  const match = /^YA-([0-9A-F]{8})$/i.exec(code);
  if (match) {
    return prisma.order.findFirst({ where: { id: { startsWith: match[1].toLowerCase() } } });
  }
  return null;
}
