"use client";

import { useCallback, useEffect, useState } from "react";

interface CreditState {
  loading: boolean;
  configured: boolean;
  credit: number | null;
  currency: string;
  error: string | null;
}

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

export default function AdminKargonomiHeader() {
  const [state, setState] = useState<CreditState>({ loading: true, configured: true, credit: null, currency: "TRY", error: null });
  const [busy, setBusy] = useState<"warehouse" | "webhook" | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadCredit = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/kargonomi?resource=credit", { cache: "no-store" });
      const data = await res.json();
      if (data.configured === false) {
        setState({ loading: false, configured: false, credit: null, currency: "TRY", error: null });
      } else if (!res.ok || data.success === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      } else {
        setState({ loading: false, configured: true, credit: data.credit, currency: data.currency || "TRY", error: null });
      }
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, []);

  useEffect(() => {
    void loadCredit();
  }, [loadCredit]);

  const createWarehouse = async () => {
    if (!confirm("Beyoğlu / Şişhane atölye deposu Kargonomi'de oluşturulsun mu?")) return;
    setBusy("warehouse");
    setNotice(null);
    try {
      const data = await api({ action: "create-warehouse" });
      setNotice({ type: "ok", text: data.hint || "Depo kaydı oluşturuldu." });
    } catch (e) {
      setNotice({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const setupWebhook = async () => {
    const baseUrl = window.location.origin;
    if (!baseUrl.startsWith("https://")) {
      setNotice({ type: "err", text: "Webhook yalnızca herkese açık https:// adresinde tanımlanabilir (yerelde ngrok vb. kullanın)." });
      return;
    }
    if (!confirm(`Webhook şu adrese tanımlansın mı?\n${baseUrl}/api/kargonomi/webhook`)) return;
    setBusy("webhook");
    setNotice(null);
    try {
      const data = await api({ action: "setup-webhook", baseUrl });
      setNotice({ type: "ok", text: data.hint || "Webhook tanımlandı." });
    } catch (e) {
      setNotice({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="glass-card rounded-2xl border border-emerald-300/60 bg-emerald-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">📦</div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-widest text-emerald-800">Kargonomi API v1 • Canlı Bakiye</span>
            {state.loading ? (
              <span className="block animate-pulse text-2xl font-bold text-emerald-900">Yükleniyor…</span>
            ) : !state.configured ? (
              <span className="block text-sm font-semibold text-red-700">KARGONOMI_API_TOKEN tanımlı değil (.env)</span>
            ) : state.error ? (
              <span className="block text-sm font-semibold text-red-700">Bakiye alınamadı: {state.error}</span>
            ) : (
              <span className="block text-2xl font-bold text-emerald-900">
                {state.credit !== null
                  ? `${state.credit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${state.currency === "TRY" ? "₺" : state.currency}`
                  : "—"}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadCredit}
            disabled={state.loading}
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            ↻ Bakiyeyi Yenile
          </button>
          <button
            onClick={createWarehouse}
            disabled={busy !== null || !state.configured}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy === "warehouse" ? "Oluşturuluyor…" : "🏭 Beyoğlu Depo Kaydı Oluştur"}
          </button>
          <button
            onClick={setupWebhook}
            disabled={busy !== null || !state.configured}
            className="rounded-xl border border-emerald-700 px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {busy === "webhook" ? "Tanımlanıyor…" : "🔔 Webhook Tanımla"}
          </button>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className={`mt-4 rounded-lg px-3 py-2 text-xs font-medium ${
            notice.type === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-800"
          }`}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}
