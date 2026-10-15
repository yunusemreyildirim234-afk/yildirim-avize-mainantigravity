import { prisma } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tüm Ürünler | Yıldırım Avize" };

export default async function AllProductsPage() {
  const products = await prisma.product
    .findMany({
      include: { variations: { select: { stock: true } } },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 border-l-4 border-amber-500 pl-4">
          <h1 className="font-serif text-4xl font-black uppercase tracking-widest">
            Tüm <span className="gold-text">Ürünler</span>
          </h1>
          <p className="mt-1 text-sm italic opacity-60">{products ? `${products.length} model listeleniyor` : ""}</p>
        </div>

        {products === null ? (
          <div className="glass rounded-3xl p-10 text-center text-sm opacity-70">Ürünler şu anda yüklenemiyor.</div>
        ) : products.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-sm opacity-70">Henüz ürün bulunmuyor.</div>
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
