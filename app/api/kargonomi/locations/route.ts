import { NextResponse } from "next/server";
import {
  getKargonomiCities,
  getKargonomiStates,
  isKargonomiConfigured,
  type KargonomiLocation,
} from "@/lib/kargonomi";

export const runtime = "nodejs";

const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: KargonomiLocation[] }>();

// Çevrimdışı yedek: Kargonomi il kimlikleri plaka kodlarıyla eşleşir (34 = İstanbul)
const FALLBACK_STATES: KargonomiLocation[] = [
  "ADANA", "ADIYAMAN", "AFYONKARAHİSAR", "AĞRI", "AMASYA", "ANKARA", "ANTALYA", "ARTVİN", "AYDIN", "BALIKESİR",
  "BİLECİK", "BİNGÖL", "BİTLİS", "BOLU", "BURDUR", "BURSA", "ÇANAKKALE", "ÇANKIRI", "ÇORUM", "DENİZLİ",
  "DİYARBAKIR", "EDİRNE", "ELAZIĞ", "ERZİNCAN", "ERZURUM", "ESKİŞEHİR", "GAZİANTEP", "GİRESUN", "GÜMÜŞHANE", "HAKKARİ",
  "HATAY", "ISPARTA", "MERSİN", "İSTANBUL", "İZMİR", "KARS", "KASTAMONU", "KAYSERİ", "KIRKLARELİ", "KIRŞEHİR",
  "KOCAELİ", "KONYA", "KÜTAHYA", "MALATYA", "MANİSA", "KAHRAMANMARAŞ", "MARDİN", "MUĞLA", "MUŞ", "NEVŞEHİR",
  "NİĞDE", "ORDU", "RİZE", "SAKARYA", "SAMSUN", "SİİRT", "SİNOP", "SİVAS", "TEKİRDAĞ", "TOKAT",
  "TRABZON", "TUNCELİ", "ŞANLIURFA", "UŞAK", "VAN", "YOZGAT", "ZONGULDAK", "AKSARAY", "BAYBURT", "KARAMAN",
  "KIRIKKALE", "BATMAN", "ŞIRNAK", "BARTIN", "ARDAHAN", "IĞDIR", "YALOVA", "KARABÜK", "KİLİS", "OSMANİYE", "DÜZCE",
].map((name, i) => ({ id: i + 1, name }));

const FALLBACK_CITIES: Record<number, KargonomiLocation[]> = {
  34: [{ id: 425, name: "BEYOĞLU" }],
};

async function cached(key: string, loader: () => Promise<KargonomiLocation[]>): Promise<KargonomiLocation[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await loader();
  if (data.length > 0) cache.set(key, { at: Date.now(), data });
  return data;
}

/** Public: sepet sayfasındaki il/ilçe seçicileri için. Kargonomi erişilemezse yedek listeye düşer. */
export async function GET(req: Request) {
  const stateIdParam = new URL(req.url).searchParams.get("stateId");
  const live = isKargonomiConfigured();

  try {
    if (stateIdParam) {
      const stateId = Number(stateIdParam);
      if (!Number.isInteger(stateId) || stateId <= 0) {
        return NextResponse.json({ error: "Geçersiz stateId" }, { status: 400 });
      }
      const cities = live ? await cached(`c:${stateId}`, () => getKargonomiCities(stateId)) : [];
      return NextResponse.json({
        cities: cities.length ? cities : FALLBACK_CITIES[stateId] ?? [],
        source: cities.length ? "kargonomi" : "fallback",
      });
    }

    const states = live ? await cached("s", () => getKargonomiStates()) : [];
    return NextResponse.json({
      states: states.length ? states : FALLBACK_STATES,
      source: states.length ? "kargonomi" : "fallback",
    });
  } catch (err) {
    console.warn("[kargonomi-locations] canlı liste alınamadı, yedek kullanılıyor:", (err as Error).message);
    return NextResponse.json(
      stateIdParam
        ? { cities: FALLBACK_CITIES[Number(stateIdParam)] ?? [], source: "fallback" }
        : { states: FALLBACK_STATES, source: "fallback" }
    );
  }
}
