import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Başlangıç kataloğunu yükler (orijinal yildirim-avize sitesindeki 3 avize).
 * ESKİ sürümün aksine ASLA veri silmez: katalog doluysa hiçbir şey yapmaz.
 * proxy.ts tarafından Basic Auth ile korunur. Kullanım: POST /api/seed
 */
export async function POST() {
  try {
    const count = await prisma.product.count();
    if (count > 0) {
      return NextResponse.json({ success: true, skipped: true, message: `Katalog zaten dolu (${count} ürün).` });
    }

    const seed = [
      {
        title: "Kontes 6'lı Eskitme Avize Üçgen Sarkıt Taşlı",
        description: "Yıldırım Avize'nin lüks ve estetiği bir araya getiren özel tasarımı.",
        category: "Klasik",
        basePrice: 14099,
        imageUrl: "/avize1.jpg",
      },
      {
        title: "Kontes 6'lı Eskitme Avize Paraşüt Sarkıt Taşlı",
        description: "Zarif paraşüt sarkıt detaylarıyla mekanınıza asalet katar.",
        category: "Klasik",
        basePrice: 14499,
        imageUrl: "/avize2.jpg",
      },
      {
        title: "12'li Kontes (8+4) Çift Katlı Kahve Eskitme Avize",
        description: "Geniş mekanlar için çift katlı, görkemli ve klasik bir şaheser.",
        category: "Kristal",
        basePrice: 29299,
        imageUrl: "/avize3.jpg",
      },
    ];

    for (const p of seed) {
      await prisma.product.create({
        data: {
          ...p,
          variations: {
            create: [
              { variationType: "Gövde Kaplama", variationValue: "Kahve Eskitme", extraPrice: 0, stock: 5 },
              { variationType: "Gövde Kaplama", variationValue: "Parlak Gold", extraPrice: 750, stock: 3 },
            ],
          },
        },
      });
    }

    return NextResponse.json({ success: true, created: seed.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}