import Link from "next/link";

export interface ProductCardData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  basePrice: number;
  imageUrl: string | null;
  variations: { stock: number }[];
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const inStock = product.variations.some((v) => v.stock > 0);

  return (
    <Link
      href={`/urun/${product.id}`}
      className="glass-card group flex flex-col overflow-hidden rounded-[2rem] transition duration-500 hover:-translate-y-1 hover:border-amber-400/60"
    >
      <div className="relative h-64 overflow-hidden bg-black/5 dark:bg-white/5">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-contain p-4 transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-amber-500/70">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v3m0 0a4 4 0 00-4 4v2m4-6a4 4 0 014 4v2M6 14h12m-10 0v2a2 2 0 002 2h4a2 2 0 002-2v-2m-8 0a2 2 0 01-2-2v-1m12 3a2 2 0 002-2v-1"
              />
            </svg>
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full border border-[var(--glass-border)] bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200 backdrop-blur">
          {product.category}
        </span>
        {!inStock && (
          <span className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase text-white">Tükendi</span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-6">
        <div>
          <h3 className="font-serif text-lg font-bold leading-snug">{product.title}</h3>
          {product.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed opacity-60">{product.description}</p>}
        </div>
        <div className="flex items-end justify-between border-t border-[var(--glass-border)] pt-4">
          <div>
            <span className="block text-[10px] uppercase tracking-widest opacity-50">Başlangıç</span>
            <span className="gold-text text-2xl font-black tracking-tight">{product.basePrice.toLocaleString("tr-TR")} ₺</span>
          </div>
          <span className="rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-black uppercase text-black transition group-hover:bg-amber-400">
            İncele
          </span>
        </div>
      </div>
    </Link>
  );
}
