"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  initialStatus: string;
  shippingType: string;
}

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-900 border-amber-300",
  READY_FOR_PICKUP: "bg-purple-50 text-purple-900 border-purple-300",
  SHIPPED: "bg-blue-50 text-blue-900 border-blue-300",
  DELIVERED: "bg-emerald-50 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-red-50 text-red-800 border-red-300",
};

export default function OrderStatusSelector({ orderId, initialStatus, shippingType }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  // Webhook / senkronizasyon durumu değiştirdiğinde (router.refresh) seçiciyi güncel tut
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleStatusChange = async (newStatus: string) => {
    const previous = status;
    setStatus(newStatus);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setStatus(previous);
        alert("Durum güncellenemedi: " + data.error);
      }
    } catch {
      setStatus(previous);
      alert("Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const isBeyoglu = shippingType === "BEYOGLU_MAGAZA_TESLIM";

  return (
    <div className="flex items-center gap-2">
      <select
        disabled={loading}
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        aria-label="Sipariş durumu"
        className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition-all ${STYLES[status] ?? STYLES.PENDING}`}
      >
        <option value="PENDING">⏳ Hazırlanıyor</option>
        {isBeyoglu ? (
          <option value="READY_FOR_PICKUP">📍 Mağazada Teslime Hazır</option>
        ) : (
          <option value="SHIPPED">🚚 Kargoya Verildi</option>
        )}
        <option value="DELIVERED">✅ Teslim Edildi</option>
        <option value="CANCELLED">✕ İptal Edildi</option>
      </select>

      {loading && <span className="animate-pulse text-[10px] opacity-60">…</span>}
    </div>
  );
}