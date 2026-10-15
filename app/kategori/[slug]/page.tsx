import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const categoryMap: Record<string, { title: string; dbCategory: string; desc: string }> = {
  modern: {
    title: "Modern Avizeler",
    dbCategory: "Modern",
    desc: "Minimalist çizgiler, ayarlanabilir LED aydınlatmalar ve çağdaş mekanlar için mimari formlar.",
  },
  klasik: {
    title: "Klasik Avizeler",
    dbCategory: "Klasik",
    desc: "Beyoğlu'nun tarihi dokusundan ilham alan antik eskitme gövdeler ve nostaljik detaylar.",
  },
  kristal: {
    title: "Kristal Serisi",
    dbCategory: "Kristal",
    desc: "Işıltıyı odanıza taşıyan el kesimi prizmatik taşlar ve pirinç döküm iskelet.",
  },
  sarkit: {
    title: "Sarkıt & Aplik Modelleri",
    dbCategory: "Sarkıt",
    desc: "Yemek masası üstleri, antre ve dinlenme köşeleri için özel tasarlanmış tekli ve çoklu sarkıtlar.",
  },
  "yedek-parca": {
    title: "Yedek Parça & Cam",
    dbCategory: "Yedek Parça",
    desc: "Kristal avize taşı, avize camı ve her renk ve formda yedek parça imalatı.",
  },
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const cat = categoryMap[slug];
  return { title: cat ? `${cat.title} | Yıldırım Avize` : "Kategori | Yıldırım Avize" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const currentCategory = categoryMap[slug];
  if (!currentCategory) notFound();

  const products = await prisma.product
    .findMany({
      where: { category: currentCategory.dbCategory },
      include: { variations: { select: { stock: true } } },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="glass mb-10 rounded-[2.5rem] p-8 text-center sm:p-12">
          <nav className="mb-3 text-xs opacity-60">
            <Link href="/" className="hover:text-amber-500">
              Ana Sayfa
            </Link>{" "}
            / <span>{currentCategory.title}</span>
          </nav>
          <h1 className="font-serif text-3xl font-black sm:text-4xl">{currentCategory.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-light opacity-70">{currentCategory.desc}</p>
        </section>

        <div className="mb-8 flex items-center justify-between border-b border-[var(--glass-border)] pb-4 text-xs opacity-70">
          <span>{products ? `Toplam ${products.length} ürün listeleniyor` : "Ürünler yüklenemedi"}</span>
          <span className="font-medium text-amber-600 dark:text-amber-300">Beyoğlu Mağazasında Sergilenen Modeller</span>
        </div>

        {!products || products.length === 0 ? (
          <div className="glass mx-auto max-w-md space-y-3 rounded-3xl p-12 text-center">
            <h3 className="font-serif text-base font-bold">Bu Kategoride Henüz Ürün Yok</h3>
            <p className="text-xs opacity-60">Yönetim panelinden bu kategoriye yeni bir ürün ekleyebilirsiniz.</p>
            <Link href="/urunler" className="mt-2 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400">
              Tüm Kataloğu Gör
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}