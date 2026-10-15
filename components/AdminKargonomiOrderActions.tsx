"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderLite {
  id: string;
  shippingType: string;
  kargonomiShipmentId: number | null;
  kargonomiStatus: string | null;
  kargonomiStatusLabel: string | null;
  shippingProviderId: number | null;
  shippingProviderName: string | null;
  shippingTrackingCode: string | null;
  shippingBarcode: string | null;
  shippingPrice: string | null;
}

interface Quote {
  providerId: number;
  providerName: string;
  price: number | null;
  currency: string;
  estimatedDays: string | null;
}

// -1 = Kargonomi otomatik (en uygun) seçim; sunucudaki KARGONOMI_PROVIDERS ile aynı kimlikler
const AUTO_OPTION: Quote = { providerId: -1, providerName: "Otomatik (En Uygun)", price: null, currency: "TRY", estimatedDays: null };

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/kargonomi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `İstek başarısız (HTTP ${res.status})`);
  return data;
}

type Busy = "create" | "quotes" | "select" | "sync" | "cancel" | null;

export default function AdminKargonomiOrderActions({ order }: { order: OrderLite }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [selected, setSelected] = useState<number | null>(order.shippingProviderId);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setMessage({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (order.shippingType !== "STANDART_KARGO") {
    return <span className="text-[11px] italic text-neutral-400">Mağazadan teslim — kargo işlemi gerekmez</span>;
  }

  const hasShipment = Boolean(order.kargonomiShipmentId);

  const createShipment = () =>
    run("create", async () => {
      await api({ action: "create-shipment", orderId: order.id });
      setMessage({ type: "ok", text: "Kargonomi taslak gönderisi oluşturuldu." });
    });

  const loadQuotes = () =>
    run("quotes", async () => {
      const data = await api({ action: "quotes", orderId: order.id });
      setQuotes([AUTO_OPTION, ...((data.quotes as Quote[]) ?? [])]);
      setSelected((cur) => cur ?? -1);
    });

  const selectProvider = () =>
    run("select", async () => {
      if (selected === null) throw new Error("Önce bir kargo firması seçin.");
      await api({ action: "select-provider", orderId: order.id, providerId: selected });
      setMessage({ type: "ok", text: selected === -1 ? "Otomatik firma seçimi kaydedildi." : "Kargo firması seçildi." });
      setQuotes(null);
    });

  const sync = () =>
    run("sync", async () => {
      await api({ action: "sync", orderId: order.id });
      setMessage({ type: "ok", text: "Durum Kargonomi ile senkronize edildi." });
    });

  const cancelShipment = () => {
    if (!confirm("Kargonomi gönderisi iptal edilsin mi? Sipariş kargo bilgileri temizlenecek.")) return;
    return run("cancel", async () => {
      await api({ action: "cancel", orderId: order.id });
      setMessage({ type: "ok", text: "Gönderi iptal edildi." });
      setQuotes(null);
    });
  };

  const btn =
    "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-w-[250px] max-w-xs space-y-2">
      {hasShipment ? (
        <div className="space-y-0.5 text-[11px]">
          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900">
            #{order.kargonomiShipmentId} • {order.kargonomiStatusLabel || order.kargonomiStatus || "Taslak"}
          </span>
          {order.shippingProviderName && (
            <span className="block text-neutral-600">
              🚚 {order.shippingProviderName}
              {order.shippingPrice ? ` • ${Number(order.shippingPrice).toLocaleString("tr-TR")} ₺` : ""}
            </span>
          )}
          {order.shippingTrackingCode && (
            <span className="block font-mono text-neutral-500">Takip: {order.shippingTrackingCode}</span>
          )}
          {order.shippingBarcode && <span className="block font-mono text-neutral-400">Barkod: {order.shippingBarcode}</span>}
        </div>
      ) : (
        <span className="text-[11px] text-neutral-500">Henüz Kargonomi gönderisi yok.</span>
      )}

      <div className="flex flex-wrap gap-1.5">
        {!hasShipment ? (
          <button onClick={createShipment} disabled={busy !== null} className={`${btn} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}>
            {busy === "create" ? "Oluşturuluyor…" : "📦 Taslak Oluştur"}
          </button>
        ) : (
          <>
            <button onClick={loadQuotes} disabled={busy !== null} className={`${btn} border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100`}>
              {busy === "quotes" ? "Teklifler…" : "💰 Fiyat Teklifleri"}
            </button>
            <a
              href={`/api/kargonomi/barcode?orderId=${order.id}&format=pdf`}
              target="_blank"
              rel="noreferrer"
              className={`${btn} border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100`}
            >
              🏷️ PDF Barkod
            </a>
            <button onClick={sync} disabled={busy !== null} className={`${btn} border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100`}>
              {busy === "sync" ? "Senkron…" : "↻ Senkronize Et"}
            </button>
            <button onClick={cancelShipment} disabled={busy !== null} className={`${btn} border-red-300 bg-red-50 text-red-800 hover:bg-red-100`}>
              {busy === "cancel" ? "İptal…" : "✕ İptal"}
            </button>
          </>
        )}
      </div>

      {quotes && (
        <div className="space-y-1.5 rounded-xl border border-amber-200 bg-white/70 p-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Kargo firması seçin</span>
          {quotes.map((q) => (
            <label
              key={q.providerId}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
                selected === q.providerId ? "border-amber-500 bg-amber-50 text-amber-950" : "border-neutral-200 hover:border-amber-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`provider-${order.id}`}
                  checked={selected === q.providerId}
                  onChange={() => setSelected(q.providerId)}
                  className="accent-amber-600"
                />
                <span className="font-semibold">{q.providerName}</span>
              </span>
              <span className="font-mono text-neutral-600">
                {q.providerId === -1
                  ? "en uygun"
                  : q.price !== null
                  ? `${q.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`
                  : "—"}
                {q.estimatedDays ? ` • ${q.estimatedDays}` : ""}
              </span>
            </label>
          ))}
          <div className="flex gap-1.5 pt-1">
            <button onClick={selectProvider} disabled={busy !== null || selected === null} className={`${btn} flex-1 border-amber-600 bg-amber-600 text-white hover:bg-amber-700`}>
              {busy === "select" ? "Kaydediliyor…" : "✓ Seçimi Onayla"}
            </button>
            <button onClick={() => setQuotes(null)} className={`${btn} border-neutral-300 bg-white text-neutral-700`}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className={`rounded-md px-2 py-1 text-[11px] font-medium ${message.type === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
