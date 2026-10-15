"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface TrackingResult {
  orderCode: string;
  status: string;
  stage: number;
  steps: string[];
  statusLabel: string | null;
  provider: string | null;
  trackingCode: string | null;
  barcode: string | null;
  destination: string | null;
  createdAt: string;
  isStorePickup: boolean;
}

function TrackingInner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("code") ?? "";
  const [code, setCode] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const search = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/kargonomi/tracking?code=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sorgulama başarısız.");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) void search(initial);
  }, [initial, search]);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-emerald-600 dark:text-emerald-300">Kargonomi Entegre Takip</span>
          <h1 className="mt-2 font-serif text-3xl font-black sm:text-4xl">
            Kargo <span className="gold-text">Takip</span>
          </h1>
          <p className="mt-2 text-sm opacity-60">Sipariş kodunuz, takip numaranız veya paket barkodunuzla (YA-XXXXXXXX) sorgulayın.</p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search(code);
          }}
          className="glass flex flex-col gap-3 rounded-3xl p-4 sm:flex-row"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Sipariş kodu / takip no / barkod"
            aria-label="Takip kodu"
            className="flex-1 rounded-2xl border border-[var(--glass-border)] bg-white/10 px-4 py-3 text-sm outline-none transition focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="rounded-2xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Sorgulanıyor…" : "Sorgula"}
          </button>
        </form>

        {error && (
          <p role="alert" className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm font-medium text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        {result && (
          <section className="glass space-y-6 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="block text-[10px] uppercase tracking-widest opacity-50">Sipariş</span>
                <span className="font-mono text-lg font-bold">#{result.orderCode}</span>
              </div>
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                  result.status === "CANCELLED"
                    ? "bg-red-500/20 text-red-600 dark:text-red-300"
                    : result.status === "DELIVERED"
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                }`}
              >
                {result.status === "CANCELLED" ? "İptal Edildi" : result.statusLabel || result.steps[Math.max(0, result.stage - 1)]}
              </span>
            </div>

            {result.status !== "CANCELLED" && (
              <ol className="grid grid-cols-4 gap-2">
                {result.steps.map((step, i) => {
                  const done = i + 1 <= result.stage;
                  return (
                    <li key={step} className="text-center">
                      <div
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition ${
                          done ? "border-amber-500 bg-amber-500 text-black" : "border-[var(--glass-border)] opacity-50"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <span className={`mt-2 block text-[10px] leading-tight ${done ? "font-semibold" : "opacity-50"}`}>{step}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <dl className="grid gap-3 border-t border-[var(--glass-border)] pt-5 text-xs sm:grid-cols-2">
              {result.provider && (
                <div>
                  <dt className="opacity-50">Kargo Firması</dt>
                  <dd className="font-semibold">{result.provider}</dd>
                </div>
              )}
              {result.trackingCode && (
                <div>
                  <dt className="opacity-50">Takip No</dt>
                  <dd className="font-mono font-semibold">{result.trackingCode}</dd>
                </div>
              )}
              {result.barcode && (
                <div>
                  <dt className="opacity-50">Paket Barkodu</dt>
                  <dd className="font-mono font-semibold">{result.barcode}</dd>
                </div>
              )}
              {result.destination && (
                <div>
                  <dt className="opacity-50">Varış</dt>
                  <dd className="font-semibold">{result.destination}</dd>
                </div>
              )}
              <div>
                <dt className="opacity-50">Sipariş Tarihi</dt>
                <dd className="font-semibold">{new Date(result.createdAt).toLocaleDateString("tr-TR")}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  // useSearchParams, Suspense sınırı gerektirir
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm opacity-60">Yükleniyor…</div>}>
      <TrackingInner />
    </Suspense>
  );
}
