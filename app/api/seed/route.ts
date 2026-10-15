import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SeedProduct {
  title: string;
  description: string;
  category: "Modern" | "Klasik" | "Kristal" | "Sarkıt" | "Yedek Parça";
  basePrice: number;
  imageUrl: string;
  variations: Array<{
    variationType: string;
    variationValue: string;
    extraPrice: number;
    stock: number;
  }>;
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    title: "Kontes 6'lı Eskitme Avize Üçgen Sarkıt Taşlı",
    description: "Yıldırım Avize'nin Beyoğlu atölyesinde el işçiliğiyle üretilen, mekanınıza asalet katan klasik eskitme şaheser.",
    category: "Klasik",
    basePrice: 14099,
    imageUrl: "/avize1.jpg",
    variations: [
      { variationType: "Gövde Kaplama", variationValue: "Kahve Eskitme", extraPrice: 0, stock: 8 },
      { variationType: "Gövde Kaplama", variationValue: "Parlak Gold", extraPrice: 750, stock: 5 },
      { variationType: "Gövde Kaplama", variationValue: "Antik Bakır", extraPrice: 950, stock: 3 },
    ],
  },
  {
    title: "Kontes 6'lı Eskitme Avize Paraşüt Sarkıt Taşlı",
    description: "Zarif paraşüt sarkıt detayları ve birinci sınıf pirinç gövdesiyle kristal parıltısının mükemmel uyumu.",
    category: "Klasik",
    basePrice: 14499,
    imageUrl: "/avize2.jpg",
    variations: [
      { variationType: "Gövde Kaplama", variationValue: "Kahve Eskitme", extraPrice: 0, stock: 6 },
      { variationType: "Gövde Kaplama", variationValue: "Parlak Gold", extraPrice: 750, stock: 4 },
    ],
  },
  {
    title: "12'li Kontes (8+4) Çift Katlı Kahve Eskitme Kristal Avize",
    description: "Geniş salonlar, villa girişleri ve yüksek tavanlar için tasarlanmış çift katlı, görkemli Beyoğlu klasiği.",
    category: "Kristal",
    basePrice: 29299,
    imageUrl: "/avize3.jpg",
    variations: [
      { variationType: "Gövde Kaplama", variationValue: "Kahve Eskitme", extraPrice: 0, stock: 4 },
      { variationType: "Gövde Kaplama", variationValue: "24K Altın Kaplama", extraPrice: 2800, stock: 2 },
    ],
  },
  {
    title: "Dolmabahçe 8 Kollu Asil Kristal Şamdan Avize",
    description: "Saray zarafetini evinize taşıyan el kesimi kristal kollar ve parlak pirinç döküm detaylar.",
    category: "Kristal",
    basePrice: 22850,
    imageUrl: "/avize3.jpg",
    variations: [
      { variationType: "Taş Kalitesi", variationValue: "Bohem Kristal Kesim", extraPrice: 0, stock: 5 },
      { variationType: "Taş Kalitesi", variationValue: "Asfour Mısır Kristal", extraPrice: 3500, stock: 3 },
    ],
  },
  {
    title: "Galata Modern Spiral LED Gold Sarkıt Avize",
    description: "Minimalist mimariye uygun, homojen ışık dağılımına sahip yüksek verimli dahili LED aydınlatma.",
    category: "Modern",
    basePrice: 8750,
    imageUrl: "/avize1.jpg",
    variations: [
      { variationType: "Işık Rengi", variationValue: "Günışığı (3000K)", extraPrice: 0, stock: 12 },
      { variationType: "Işık Rengi", variationValue: "Doğal Beyaz (4000K)", extraPrice: 0, stock: 8 },
      { variationType: "Işık Rengi", variationValue: "Kısılabilir (Triac Dimmable)", extraPrice: 950, stock: 6 },
    ],
  },
  {
    title: "Pera Geometrik Ring Mat Siyah 3'lü Salon Avizesi",
    description: "Endüstriyel ve modern iç mekanlar için elektrostatik fırın boyalı şık halka gövde tasarımı.",
    category: "Modern",
    basePrice: 6490,
    imageUrl: "/avize2.jpg",
    variations: [
      { variationType: "Gövde Rengi", variationValue: "Mat Siyah", extraPrice: 0, stock: 10 },
      { variationType: "Gövde Rengi", variationValue: "Fırçalanmış Titanyum Gold", extraPrice: 600, stock: 7 },
    ],
  },
  {
    title: "Karaköy Vintage Halatlı Rustik Tekli Cam Sarkıt",
    description: "Doğal jüt halat ve üfleme cam kombinasyonu; mutfak adaları, kafeler ve antreler için ideal.",
    category: "Sarkıt",
    basePrice: 2150,
    imageUrl: "/avize1.jpg",
    variations: [
      { variationType: "Cam Tipi", variationValue: "Bal Rengi Amber Cam", extraPrice: 0, stock: 15 },
      { variationType: "Cam Tipi", variationValue: "Füme Kristal Cam", extraPrice: 200, stock: 10 },
    ],
  },
  {
    title: "Boğaziçi Kristal Avize Yedek Taşı ve Askı Pimi Seti (10'lu Paket)",
    description: "Kristal avizeleriniz için birinci sınıf optik şeffaf yedek damla taş ve paslanmaz pirinç pim seti.",
    category: "Yedek Parça",
    basePrice: 650,
    imageUrl: "/avize3.jpg",
    variations: [
      { variationType: "Ölçü", variationValue: "38mm Damla Kristal", extraPrice: 0, stock: 50 },
      { variationType: "Ölçü", variationValue: "50mm Badem Kristal", extraPrice: 150, stock: 35 },
    ],
  },
];

async function seedDatabase(force = false) {
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of SEED_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { title: item.title },
      include: { variations: true },
    });

    if (!existing) {
      // Yeni ürün oluştur
      await prisma.product.create({
        data: {
          title: item.title,
          description: item.description,
          category: item.category,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          variations: {
            create: item.variations,
          },
        },
      });
      createdCount++;
    } else if (force) {
      // Mevcut ürünü ve stoklarını güncelle
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          description: item.description,
          category: item.category,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
        },
      });

      // Eksik varyasyonları tamamla
      for (const v of item.variations) {
        const varExists = existing.variations.find(
          (exV) => exV.variationType === v.variationType && exV.variationValue === v.variationValue
        );
        if (!varExists) {
          await prisma.productVariation.create({
            data: {
              productId: existing.id,
              ...v,
            },
          });
        } else {
          await prisma.productVariation.update({
            where: { id: varExists.id },
            data: { stock: v.stock, extraPrice: v.extraPrice },
          });
        }
      }
      updatedCount++;
    }
  }

  const totalProducts = await prisma.product.count();
  return { createdCount, updatedCount, totalProducts };
}

/**
 * GET: Test amacıyla tarayıcıdan doğrudan çağrılabilir.
 * Örn: /api/seed veya /api/seed?force=true
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const result = await seedDatabase(force);

    return NextResponse.json({
      success: true,
      message: `Katalog test tohumlaması tamamlandı. Eklenen: ${result.createdCount}, Güncellenen: ${result.updatedCount}, Toplam Ürün: ${result.totalProducts}`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST: Yönetim paneli veya scriptler üzerinden çağrılır.
 */
export async function POST(req: Request) {
  try {
    let force = false;
    try {
      const body = await req.json();
      force = Boolean(body?.force);
    } catch {
      // body yoksa varsayılan false
    }

    const result = await seedDatabase(force);

    return NextResponse.json({
      success: true,
      message: `Katalog tohumlaması tamamlandı. Eklenen: ${result.createdCount}, Güncellenen: ${result.updatedCount}, Toplam Ürün: ${result.totalProducts}`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}