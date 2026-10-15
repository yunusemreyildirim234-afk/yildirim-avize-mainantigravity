# Yıldırım Avize — E-Ticaret Platformu

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 6 · PostgreSQL · Kargonomi API v1

## Kurulum

```bash
cp .env.example .env          # değerleri doldurun (ADMIN_PASSWORD, KARGONOMI_* ...)
docker compose up -d db       # PostgreSQL
npm install                   # prisma generate otomatik çalışır
npx prisma migrate dev        # tabloları oluşturur
npm run dev
```

Başlangıç kataloğu (orijinal sitedeki 3 avize) için, yönetici girişiyle bir kez:
`POST /api/seed` (katalog doluysa hiçbir şey yapmaz).

## Mimari

| Yol | Görev |
|---|---|
| `app/layout.tsx` | Filigran arka plan, sol/sağ paneller, açık/koyu mod |
| `components/SidePanels.tsx` | Sol (logo+menü) ve sağ (arama, sepet, hesap, tema) cam paneller |
| `lib/kargonomi.ts` | Kargonomi API v1 istemcisi (timeout, retry, tipli hatalar, HMAC doğrulama) |
| `lib/kargonomi-sync.ts` | Kargonomi durumu → sipariş durumu eşlemesi (webhook + senkron ortak) |
| `app/api/kargonomi/route.ts` | Admin işlemleri (bakiye, depo, webhook, taslak, teklifler, firma seçimi, iptal) |
| `app/api/kargonomi/webhook/route.ts` | `shipment.updated` alıcısı (imza + idempotency) |
| `app/api/kargonomi/barcode/route.ts` | PDF barkod |
| `app/api/kargonomi/locations`, `tracking` | Herkese açık il/ilçe ve kargo takip |
| `proxy.ts` | Next 16 `middleware.ts` karşılığı; `/admin`, `/api/admin`, `/api/kargonomi*`, `/api/seed` için Basic Auth |

## Webhook kurulumu

1. Siteyi `https://` ile yayınlayın, `NEXT_PUBLIC_SITE_URL` değerini ayarlayın.
2. Admin panelinde **Webhook Tanımla** butonuna basın.
3. Dönen `secret` değerini `KARGONOMI_WEBHOOK_SECRET` olarak `.env`'e yazın ve uygulamayı yeniden başlatın.

Secret tanımlı değilse webhook 503 döner (güvenli varsayılan).

## Notlar

- `middleware.ts` ve `proxy.ts` aynı projede bir arada bulunmamalıdır (Next 16).
- Sipariş tutarı sunucuda DB fiyatlarından hesaplanır; istemci fiyatına güvenilmez.
- `.env` dosyasını asla commit etmeyin; daha önce depoya girmiş API token'ları **iptal edilip yenilenmelidir**.
