"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useTheme } from "@/context/ThemeContext";
import SearchBar from "@/components/SearchBar";

const NAV_ITEMS: { href: string; label: string; accent?: boolean }[] = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/urunler", label: "Tüm Ürünler" },
  { href: "/kategori/modern", label: "Modern Avizeler" },
  { href: "/kategori/klasik", label: "Klasik Avizeler" },
  { href: "/kategori/kristal", label: "Kristal Serisi" },
  { href: "/kategori/sarkit", label: "Sarkıt & Aplik" },
  { href: "/kategori/yedek-parca", label: "Yedek Parça & Cam" },
  { href: "/kargo-takip", label: "Kargo Takip", accent: true },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Açık moda geç" : "Koyu moda geç"}
      title={isDark ? "Açık mod" : "Koyu mod"}
      className="flex h-10 w-full items-center justify-between rounded-xl border border-[var(--glass-border)] bg-white/5 px-3 text-xs font-medium transition hover:border-amber-400/60"
    >
      <span>{isDark ? "Koyu Mod" : "Açık Mod"}</span>
      <span className="relative h-5 w-9 rounded-full bg-neutral-400/40 transition dark:bg-amber-500/40">
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${isDark ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export default function SidePanels() {
  const pathname = usePathname();
  const { totalItems, totalPrice } = useCart();
  const { totalFavorites } = useWishlist();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Sayfa değişince çekmeceleri kapat
  useEffect(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const overlayOpen = leftOpen || rightOpen;

  return (
    <>
      {/* ── Mobil / tablet üst çubuk ─────────────────────────── */}
      <div className="glass-panel fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between px-3 xl:hidden">
        <button
          type="button"
          onClick={() => {
            setRightOpen(false);
            setLeftOpen((v) => !v);
          }}
          aria-label="Menüyü aç"
          aria-expanded={leftOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] lg:invisible"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <Link href="/" className="font-serif text-base font-bold tracking-widest">
          YILDIRIM <span className="gold-text">AVİZE</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen((v) => !v);
          }}
          aria-label="Sepet ve hesap panelini aç"
          aria-expanded={rightOpen}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {overlayOpen && (
        <button
          type="button"
          aria-label="Paneli kapat"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(false);
          }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
        />
      )}

      {/* ── SOL PANEL: logo + gezinme ───────────────────────── */}
      <aside
        aria-label="Ana gezinme"
        className={`glass-panel fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col gap-5 overflow-y-auto border-y-0 border-l-0 p-5 transition-transform duration-500 ease-out lg:translate-x-0 ${
          leftOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/" className="group flex flex-col items-center gap-3 pt-1 text-center">
          <span className="relative block h-24 w-24 overflow-hidden rounded-3xl border border-amber-400/30 shadow-xl transition duration-500 group-hover:border-amber-400/80 group-hover:shadow-amber-500/20">
            <Image src="/avizelogo.png" alt="Yıldırım Avize" fill sizes="96px" className="object-cover" priority />
          </span>
          <span className="font-serif text-lg font-bold tracking-[0.25em]">
            YILDIRIM <span className="gold-text block text-sm tracking-[0.5em]">AVİZE</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nav-link flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                    : item.accent
                    ? "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                    : "opacity-80 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-amber-500" : "bg-current opacity-30"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-[var(--glass-border)] pt-4 text-[11px] leading-relaxed opacity-70">
          <p className="font-semibold uppercase tracking-widest">Beyoğlu • İstanbul</p>
          <p>Tevfikiye Han, İskender Cad. No:6 D:11</p>
          <a href="tel:+905372114223" className="font-semibold hover:text-amber-500">
            0537 211 42 23
          </a>
        </div>
      </aside>

      {/* ── SAĞ PANEL: arama, sepet, hesap ──────────────────── */}
      <aside
        aria-label="Hesap ve sepet"
        className={`glass-panel fixed right-0 top-0 z-50 flex h-dvh w-64 flex-col gap-4 overflow-y-auto border-y-0 border-r-0 p-5 transition-transform duration-500 ease-out xl:w-60 xl:translate-x-0 ${
          rightOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <span className="text-center text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Yıldırım Avize Paneli</span>

        <SearchBar />

        <Link
          href="/sepet"
          className="group rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 transition hover:border-amber-400/70 hover:bg-amber-500/15"
        >
          <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
            Sepetim
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-black">
              {totalItems}
            </span>
          </span>
          <span className="mt-2 block text-xl font-bold tracking-tight">{totalPrice.toLocaleString("tr-TR")} ₺</span>
          <span className="mt-1 block text-[11px] opacity-60 transition group-hover:opacity-100">Ödemeye geç →</span>
        </Link>

        <div className="flex flex-col gap-1 text-sm">
          <Link href="/giris" className="nav-link rounded-xl px-3 py-2 font-medium opacity-80 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5">
            Hesabım & Siparişlerim
          </Link>
          <Link
            href="/favorilerim"
            className="nav-link flex items-center justify-between rounded-xl px-3 py-2 font-medium opacity-80 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
          >
            Favorilerim
            {totalFavorites > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 text-[11px] font-bold text-red-500">{totalFavorites}</span>
            )}
          </Link>
          <Link
            href="/kargo-takip"
            className="nav-link rounded-xl px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
          >
            Kargo Takip
          </Link>
          <a
            href="https://wa.me/905372114223"
            target="_blank"
            rel="noreferrer"
            className="nav-link rounded-xl px-3 py-2 font-semibold text-green-600 hover:bg-green-500/10 dark:text-green-400"
          >
            Teknik Destek (WhatsApp)
          </a>
        </div>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Kuveyt Türk Havale Aktif
            <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal opacity-80">Havale ile %5 ek indirim</span>
          </div>
          <ThemeToggle />
          <Link href="/admin" className="block text-center text-[10px] uppercase tracking-widest opacity-40 transition hover:opacity-100">
            Yönetim
          </Link>
        </div>
      </aside>
    </>
  );
}
