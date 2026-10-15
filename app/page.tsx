import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

// Katalog veritabanından okunur; derleme sırasında DB gerektirmesin
export const dynamic = "force-dynamic";

const CATEGORIES = [
  { href: "/kategori/modern", title: "Modern", desc: "LED halkalar, minimal formlar" },
  { href: "/kategori/klasik", title: "Klasik", desc: "Eskitme gövde, nostaljik detay" },
  { href: "/kategori/kristal", title: "Kristal", desc: "El kesimi prizmatik taşlar" },
  { href: "/kategori/sarkit", title: "Sarkıt & Aplik", desc: "Tekli ve çoklu sarkıtlar" },
];

const TRUST = [
  { title: "Yarım Asırlık Tecrübe", text: "Beyoğlu atölyesinde el işçiliği" },
  { title: "Sigortalı Sandık Kargo", text: "Kargonomi ile ahşap koruma" },
  { title: "Havale %5 İndirim", text: "Kuveyt Türk havale aktif" },
];

async function getFeatured() {
  try {
    return await prisma.product.findMany({
      include: { variations: { select: { stock: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  } catch (error) {
    console.error("[home] ürünler alınamadı:", (error as Error).message);
    return null;
  }
}

export default async function HomePage() {
  const products = await getFeatured();

  return (
    <div className="space-y-16 px-4 pb-8 pt-8 sm:px-6 lg:px-8">
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="animate-fade-up mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="glass rounded-[2.5rem] p-8 sm:p-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-amber-600 dark:text-amber-300">Beyoğlu • İstanbul</span>
          <h1 className="mt-4 font-serif text-4xl font-black leading-tight sm:text-5xl">
            Işığın <span className="gold-text">Zarif</span> Mimarı
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed opacity-70">
            Kristal ve modern avize imalatında yarım asırlık tecrübe. Her renk ve formda kristal avize taşı, avize camı ve özel tasarım avizeler —
            kapınıza kadar sigortalı ahşap sandıkla.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/urunler" className="rounded-2xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95">
              Koleksiyonu Keşfet
            </Link>
            <Link href="/iletisim" className="rounded-2xl border border-[var(--glass-border)] px-6 py-3 text-xs font-bold uppercase tracking-widest transition hover:border-amber-400/70">
              Mağazayı Ziyaret Et
            </Link>
          </div>
        </div>

        <div className="relative aspect-[16/11] overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] shadow-2xl">
          <Image src="/anaekran.jpg" alt="Yıldırım Avize Lighting tabelası" fill priority sizes="(min-width:1280px) 36vw, 90vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      </section>

      {/* ── GÜVEN ŞERİDİ ─────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
        {TRUST.map((t) => (
          <div key={t.title} className="glass-card rounded-2xl p-5 text-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-300">{t.title}</h3>
            <p className="mt-1 text-xs opacity-60">{t.text}</p>
          </div>
        ))}
      </section>

      {/* ── KATEGORİLER ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.href} href={c.href} className="glass-card group rounded-3xl p-6 transition duration-500 hover:-translate-y-1 hover:border-amber-400/60">
              <h3 className="font-serif text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-[11px] opacity-60">{c.desc}</p>
              <span className="mt-4 inline-block text-[11px] font-bold uppercase tracking-widest text-amber-600 transition group-hover:translate-x-1 dark:text-amber-300">
                Görüntüle →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── ÇOK SATANLAR ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 border-l-4 border-amber-500 pl-4">
          <h2 className="font-serif text-3xl font-black uppercase tracking-widest">
            Çok <span className="gold-text">Satanlar</span>
          </h2>
          <p className="mt-1 text-sm italic opacity-60">Yıldırım Avize&apos;nin en çok tercih edilen şaheserleri.</p>
        </div>

        {products === null ? (
          <div className="glass rounded-3xl p-10 text-center text-sm opacity-70">Ürünler şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.</div>
        ) : products.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-sm opacity-70">Henüz ürün eklenmemiş. Yönetim panelinden ilk avizenizi ekleyin.</div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}