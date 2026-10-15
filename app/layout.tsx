import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import SidePanels from "@/components/SidePanels";
import WhatsAppButton from "@/components/WhatsAppButton";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { themeInitScript } from "@/lib/theme-script";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: "Yıldırım Avize | Kristal ve Modern Aydınlatma",
  description: "Beyoğlu, İstanbul'da yarım asırlık tecrübeyle kristal ve modern avize imalatı. Türkiye geneli sigortalı ahşap sandık kargo.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07070a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: <html class="dark"> init script tarafından istemcide ayarlanır
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative min-h-dvh overflow-x-hidden antialiased">
        <ThemeProvider>
          <CartProvider>
            <WishlistProvider>
              {/* ── ARKA PLAN: "Yıldırım Avize" filigranı ─────────────── */}
              <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(231_200_115_/_0.18),_transparent_60%)]" />
                <Image
                  src="/avizelogo.png"
                  alt=""
                  fill
                  sizes="100vw"
                  priority
                  className="object-contain p-10 opacity-[var(--watermark-opacity)] blur-[0.5px] saturate-75 lg:px-72"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/40 to-[var(--background)]/90" />
              </div>

              {/* ── SOL & SAĞ PANELLER ────────────────────────────────── */}
              <SidePanels />

              {/* ── İÇERİK ALANI ──────────────────────────────────────── */}
              <div className="flex min-h-dvh flex-col pt-14 lg:pl-64 xl:pr-60 xl:pt-0">
                <main id="site-content" className="flex-1">
                  {children}
                </main>

                <footer className="glass mx-4 mb-4 mt-12 rounded-3xl p-6 text-xs sm:mx-6">
                  <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row">
                    <div className="flex-1">
                      <h4 className="mb-2 font-serif text-sm font-bold uppercase tracking-[0.25em]">Yıldırım Avize</h4>
                      <p className="max-w-xs leading-relaxed opacity-60">
                        Kristal ve modern avize imalatında yarım asırlık tecrübe. Beyoğlu&apos;ndan dünyaya aydınlık…
                      </p>
                    </div>
                    <div className="flex-1 space-y-1 md:text-center">
                      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest">İletişim & Konum</h4>
                      <p className="opacity-70">Tevfikiye Han, İskender Cad. Nazlı Hanım Sk. No:6 D:11</p>
                      <p className="opacity-70">Şişhane / Beyoğlu • İstanbul</p>
                      <p className="font-bold">0537 211 42 23</p>
                    </div>
                    <div className="flex-1 md:text-right">
                      <p className="italic opacity-50">© {new Date().getFullYear()} Yunus Emre Yıldırım</p>
                      <p className="mt-2 font-bold uppercase tracking-tighter text-emerald-600 dark:text-emerald-400">
                        Kuveyt Türk Havale Aktif
                      </p>
                    </div>
                  </div>
                </footer>
              </div>

              <WhatsAppButton />
            </WishlistProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}