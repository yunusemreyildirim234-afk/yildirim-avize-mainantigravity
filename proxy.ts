import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16: `middleware.ts` dosya kuralı `proxy.ts` olarak yeniden adlandırıldı.
 * Dosya adı `proxy.ts`, dışa aktarılan fonksiyon adı `proxy` olmalıdır
 * ("The file must export a function" hatası bu yüzden oluşuyordu: ya re-export
 * kullanılıyordu ya da dosya adı/fonksiyon adı eşleşmiyordu). Aynı projede
 * `middleware.ts` ve `proxy.ts` birlikte BULUNMAMALIDIR.
 *
 * Koruma: /admin, /api/admin, /api/kargonomi (webhook, locations, tracking hariç) ve /api/seed
 * HTTP Basic Auth ile korunur (ADMIN_USER / ADMIN_PASSWORD).
 */

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function unauthorized(message = "Yönetici girişi gerekli") {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Yildirim Avize Admin", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Herkese açık Kargonomi uç noktaları (kendi doğrulamaları var / müşteri tarafından kullanılır)
  if (
    pathname.startsWith("/api/kargonomi/webhook") ||
    pathname.startsWith("/api/kargonomi/locations") ||
    pathname.startsWith("/api/kargonomi/tracking")
  ) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  const user = process.env.ADMIN_USER || "admin";

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("ADMIN_PASSWORD tanımlı değil; yönetici alanı kapalı.", { status: 503 });
    }
    return NextResponse.next(); // geliştirme ortamında kolaylık
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const idx = decoded.indexOf(":");
  const givenUser = idx >= 0 ? decoded.slice(0, idx) : decoded;
  const givenPass = idx >= 0 ? decoded.slice(idx + 1) : "";

  if (timingSafeEqual(givenUser, user) && timingSafeEqual(givenPass, password)) {
    return NextResponse.next();
  }
  return unauthorized();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/kargonomi/:path*", "/api/kargonomi", "/api/seed/:path*", "/api/seed"],
};
