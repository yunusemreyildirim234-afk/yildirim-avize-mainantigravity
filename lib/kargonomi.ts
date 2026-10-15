/**
 * Kargonomi API v1 istemcisi (sunucu tarafı — yalnızca Route Handler / Server Component'lerden import edin).
 *
 * Kimlik doğrulama : Authorization: Bearer <KARGONOMI_API_TOKEN>
 * Varsayılan taban : https://app.kargonomi.com.tr/api/v1
 *
 * NOT: Bu dosya Kargonomi'nin herkese açık v1 dokümantasyonundaki uç noktaları kullanır
 * (shipments, shipment-price-comparison, user/credit, warehouses, states/cities, webhooks).
 * İstek gövdesi alan adları Kargonomi panelindeki şemayla birebir doğrulanmalıdır;
 * alan adları tek yerde (aşağıdaki tipler ve `createKargonomiShipment`) toplanmıştır.
 */

import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────
// Yapılandırma
// ─────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://app.kargonomi.com.tr/api/v1";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_GET_RETRIES = 2;

/**
 * KARGONOMI_BASE_URL için hatalara karşı dayanıklı normalleştirme.
 * Sık yapılan hatalar: `https://kargonomi.com.tr` (API değil, pazarlama sitesi),
 * sonda `/` veya `/api/v1` eksikliği.
 */
export function getKargonomiBaseUrl(): string {
  const raw = (process.env.KARGONOMI_BASE_URL || DEFAULT_BASE_URL).trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return DEFAULT_BASE_URL;
  }
  if (url.hostname === "kargonomi.com.tr" || url.hostname === "www.kargonomi.com.tr") {
    url.hostname = "app.kargonomi.com.tr";
  }
  let path = url.pathname.replace(/\/+$/, "");
  if (!/\/api\/v\d+$/.test(path)) {
    path = `${path.replace(/\/api$/, "")}/api/v1`;
  }
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function getToken(): string {
  const token = process.env.KARGONOMI_API_TOKEN?.trim();
  if (!token) {
    throw new KargonomiError("KARGONOMI_API_TOKEN ortam değişkeni tanımlı değil.", 500);
  }
  return token;
}

export function isKargonomiConfigured(): boolean {
  return Boolean(process.env.KARGONOMI_API_TOKEN?.trim());
}

// ─────────────────────────────────────────────────────────────
// Tipler & sabitler
// ─────────────────────────────────────────────────────────────

export class KargonomiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status = 500, body: unknown = null) {
    super(message);
    this.name = "KargonomiError";
    this.status = status;
    this.body = body;
  }
}

export interface KargonomiPackageInput {
  content: string;
  barcode?: string;
  desi: number;
}

export interface KargonomiShipmentInput {
  buyer_name: string;
  buyer_email?: string;
  buyer_phone: string;
  buyer_address: string;
  buyer_state_id: number;
  buyer_city_id: number;
  packages: KargonomiPackageInput[];
  warehouse_id?: number;
  shipping_provider_id?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KargonomiShipment = Record<string, any>;

export interface KargonomiQuote {
  providerId: number;
  providerName: string;
  price: number | null;
  currency: string;
  estimatedDays: string | null;
  raw: KargonomiShipment;
}

export interface KargonomiLocation {
  id: number;
  name: string;
}

export const KARGONOMI_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  ready: "İşleme Hazır",
  webservice_shipment_started: "Kargo Teslim Sürecinde",
  webservice_shipment_delivered: "Kargo Teslim Edildi",
  cancelled: "İptal Edildi",
};

/** Admin arayüzünde gösterilen kargo firmaları (-1 = Kargonomi otomatik seçim). */
export const KARGONOMI_PROVIDERS: { id: number; name: string }[] = [
  { id: -1, name: "Otomatik (En Uygun)" },
  { id: 3, name: "Kolay Gelsin" },
  { id: 4, name: "Aras Kargo" },
  { id: 5, name: "Sürat Kargo" },
  { id: 6, name: "Hepsijet" },
  { id: 7, name: "PTT Kargo" },
];

// ─────────────────────────────────────────────────────────────
// Düşük seviyeli HTTP katmanı
// ─────────────────────────────────────────────────────────────

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** JSON yerine ham yanıt (PDF barkod) */
  raw?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${getKargonomiBaseUrl()}/${path.replace(/^\/+/, "")}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const b = body as KargonomiShipment;
    if (typeof b.message === "string" && b.message) {
      const errors = b.errors && typeof b.errors === "object" ? Object.values(b.errors).flat().join(" ") : "";
      return errors ? `${b.message} (${errors})` : b.message;
    }
    if (typeof b.error === "string") return b.error;
  }
  return fallback;
}

async function kargonomiFetch(path: string, opts: RequestOptions = {}): Promise<Response> {
  const method = opts.method ?? "GET";
  const url = buildUrl(path, opts.query);
  const attempts = method === "GET" ? MAX_GET_RETRIES + 1 : 1; // yalnızca idempotent isteklerde yeniden dene

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: opts.raw ? "application/pdf, application/json" : "application/json",
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });

      if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
        await sleep(400 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await sleep(400 * attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const aborted = lastError instanceof Error && lastError.name === "AbortError";
  throw new KargonomiError(
    aborted ? "Kargonomi API zaman aşımına uğradı." : `Kargonomi API'ye bağlanılamadı: ${(lastError as Error)?.message ?? "bilinmeyen hata"}`,
    504
  );
}

async function kargonomiJson<T = KargonomiShipment>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await kargonomiFetch(path, opts);
  const text = await res.text();

  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const fallback =
      res.status === 401 || res.status === 403
        ? "Kargonomi kimlik doğrulaması başarısız (API token geçersiz veya yetkisiz)."
        : res.status === 404
        ? "Kargonomi kaynağı bulunamadı."
        : res.status === 422
        ? "Kargonomi isteği doğrulayamadı."
        : `Kargonomi API hatası (HTTP ${res.status}).`;
    throw new KargonomiError(extractMessage(body, fallback), res.status, body);
  }

  return body as T;
}

/** `{ data: ... }` / `{ shipment: ... }` zarflarını açar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(body: any, ...keys: string[]): any {
  if (!body || typeof body !== "object") return body;
  for (const key of [...keys, "data"]) {
    if (body[key] !== undefined && body[key] !== null) return body[key];
  }
  return body;
}

// ─────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────

/** Telefonu Kargonomi'nin beklediği 10 haneli yerel formata (5XXXXXXXXX) çevirir. */
export function normalizePhone(input: string | null | undefined): string {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function isValidTrPhone(input: string | null | undefined): boolean {
  return /^5\d{9}$/.test(normalizePhone(input));
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Kargonomi durum kodunu Türkçe etikete çevirir. */
export function statusLabelFor(status: string | null | undefined, apiLabel?: string | null): string {
  if (apiLabel) return apiLabel;
  if (!status) return "Taslak";
  return KARGONOMI_STATUS_LABELS[status] ?? status;
}

/** Gönderi nesnesinden, API sürümleri arası alan farklarına dayanıklı alanlar çıkarır. */
export function pickShipmentFields(shipment: KargonomiShipment) {
  const status: string | null = shipment.status ?? shipment.shipment_status ?? null;
  const provider = shipment.shipping_provider ?? shipment.provider ?? null;
  const providerId = toNumberOrNull(shipment.shipping_provider_id ?? provider?.id);
  return {
    id: toNumberOrNull(shipment.id),
    status,
    statusLabel: statusLabelFor(status, shipment.status_label),
    trackingCode: (shipment.shipping_webservice_tracking_code ?? shipment.tracking_code ?? null) as string | null,
    barcode: (shipment.shipping_webservice_barcode ?? shipment.shipment_packages?.[0]?.barcode ?? null) as string | null,
    providerId,
    providerName: (shipment.shipping_provider_name ?? provider?.name ?? provider?.title ?? null) as string | null,
    price: toNumberOrNull(shipment.shipping_price ?? shipment.price ?? shipment.total_price),
  };
}

export type InternalOrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

/**
 * Kargonomi durumunu dahili sipariş durumuna eşler:
 * draft/ready → PENDING, kargo süreci başladı → SHIPPED, teslim → DELIVERED, iptal → CANCELLED.
 */
export function mapKargonomiStatusToOrderStatus(status: string | null | undefined): InternalOrderStatus {
  const s = String(status ?? "").toLowerCase();
  if (!s) return "PENDING";
  if (s.includes("cancel") || s.includes("iptal")) return "CANCELLED";
  if (s.includes("deliver") || s.includes("teslim_edildi") || s.includes("delivered")) return "DELIVERED";
  if (
    s.includes("start") ||
    s.includes("transit") ||
    s.includes("shipped") ||
    s.includes("picked") ||
    s.includes("distribution") ||
    s.includes("out_for") ||
    s.includes("progress")
  ) {
    return "SHIPPED";
  }
  return "PENDING";
}

// ─────────────────────────────────────────────────────────────
// Shipments
// ─────────────────────────────────────────────────────────────

export async function listKargonomiShipments(page = 1): Promise<KargonomiShipment> {
  return kargonomiJson("/shipments", { query: { page } });
}

export async function getKargonomiShipment(id: number | string): Promise<KargonomiShipment> {
  const body = await kargonomiJson(`/shipments/${id}`);
  return unwrap(body, "shipment");
}

/** Taslak gönderi oluşturur (POST /shipments). */
export async function createKargonomiShipment(input: KargonomiShipmentInput): Promise<KargonomiShipment> {
  const warehouseId = input.warehouse_id ?? toNumberOrNull(process.env.KARGONOMI_WAREHOUSE_ID) ?? undefined;
  const payload = {
    ...input,
    buyer_phone: normalizePhone(input.buyer_phone),
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
  };
  const body = await kargonomiJson("/shipments", { method: "POST", body: payload });
  return unwrap(body, "shipment");
}

export async function updateKargonomiShipment(
  id: number | string,
  patch: Partial<KargonomiShipmentInput> & Record<string, unknown>
): Promise<KargonomiShipment> {
  const body = await kargonomiJson(`/shipments/${id}`, { method: "PUT", body: patch });
  return unwrap(body, "shipment");
}

export async function deleteKargonomiShipment(id: number | string): Promise<void> {
  await kargonomiJson(`/shipments/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────
// Fiyat teklifleri & firma seçimi
// ─────────────────────────────────────────────────────────────

/** GET /shipment-price-comparison/{id} — farklı yanıt biçimlerini tek tipe indirger. */
export async function getKargonomiPriceQuotes(shipmentId: number | string): Promise<KargonomiQuote[]> {
  const body = await kargonomiJson(`/shipment-price-comparison/${shipmentId}`);
  const root = unwrap(body, "quotes", "prices", "providers");
  const list: KargonomiShipment[] = Array.isArray(root)
    ? root
    : Array.isArray(root?.providers)
    ? root.providers
    : Array.isArray(root?.quotes)
    ? root.quotes
    : root && typeof root === "object"
    ? Object.values(root).filter((v) => v && typeof v === "object")
    : [];

  return (list as KargonomiShipment[])
    .map((q) => {
      const provider = q.shipping_provider ?? q.provider ?? {};
      const providerId = toNumberOrNull(q.shipping_provider_id ?? q.provider_id ?? provider.id ?? q.id);
      return {
        providerId: providerId ?? 0,
        providerName: String(q.shipping_provider_name ?? q.provider_name ?? provider.name ?? q.name ?? q.title ?? `Firma #${providerId}`),
        price: toNumberOrNull(q.price ?? q.total_price ?? q.amount ?? q.cost),
        currency: String(q.currency ?? "TRY"),
        estimatedDays: (q.estimated_delivery ?? q.estimated_days ?? q.delivery_time ?? null) as string | null,
        raw: q,
      } satisfies KargonomiQuote;
    })
    .filter((q) => q.providerId !== 0)
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}

/** Kargo firmasını seçer. `-1` Kargonomi'nin otomatik (en uygun) seçimidir. */
export async function selectKargonomiProvider(
  shipmentId: number | string,
  providerId: number
): Promise<KargonomiShipment> {
  return updateKargonomiShipment(shipmentId, { shipping_provider_id: providerId });
}

// ─────────────────────────────────────────────────────────────
// Barkod (PDF)
// ─────────────────────────────────────────────────────────────

export async function getKargonomiBarcode(
  shipmentId: number | string,
  format: "pdf" | "png" | "zpl" = "pdf"
): Promise<{ data: ArrayBuffer; contentType: string }> {
  const res = await kargonomiFetch(`/shipments/${shipmentId}/barcode`, {
    query: { format },
    raw: true,
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* gövde JSON değil */
    }
    throw new KargonomiError(extractMessage(body, `Barkod alınamadı (HTTP ${res.status}).`), res.status, body);
  }
  const contentType = res.headers.get("content-type") || "application/pdf";
  const data = await res.arrayBuffer();

  // Bazı sürümler barkodu JSON içinde base64 olarak döndürür
  if (contentType.includes("application/json")) {
    const json = JSON.parse(Buffer.from(data).toString("utf8"));
    const b64: string | undefined = json?.data?.barcode ?? json?.data?.file ?? json?.barcode ?? json?.file;
    if (b64) {
      const buf = Buffer.from(b64, "base64");
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, contentType: "application/pdf" };
    }
    const url: string | undefined = json?.data?.url ?? json?.url;
    if (url) {
      const file = await fetch(url, { cache: "no-store" });
      return { data: await file.arrayBuffer(), contentType: file.headers.get("content-type") || "application/pdf" };
    }
    throw new KargonomiError("Barkod yanıtı beklenen biçimde değil.", 502, json);
  }
  return { data, contentType };
}

// ─────────────────────────────────────────────────────────────
// Bakiye
// ─────────────────────────────────────────────────────────────

export interface KargonomiCredit {
  credit: number | null;
  currency: string;
  raw: KargonomiShipment;
}

/** GET /user/credit */
export async function getKargonomiCredit(): Promise<KargonomiCredit> {
  const body = await kargonomiJson("/user/credit");
  const data = unwrap(body);
  const value =
    typeof data === "number" || typeof data === "string"
      ? data
      : data?.credit ?? data?.balance ?? data?.amount ?? data?.user_credit ?? null;
  return { credit: toNumberOrNull(value), currency: String(data?.currency ?? "TRY"), raw: data };
}

// ─────────────────────────────────────────────────────────────
// Depolar
// ─────────────────────────────────────────────────────────────

export async function listKargonomiWarehouses(): Promise<KargonomiShipment[]> {
  const body = await kargonomiJson("/warehouses");
  const data = unwrap(body, "warehouses");
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

/** .env'deki gönderici bilgileriyle Beyoğlu / Şişhane atölye deposunu oluşturur. */
export async function createDefaultKargonomiWarehouse(): Promise<KargonomiShipment> {
  const env = process.env;
  const payload = {
    name: env.KARGONOMI_SENDER_NAME || "Yıldırım Avize",
    email: env.KARGONOMI_SENDER_EMAIL,
    phone: normalizePhone(env.KARGONOMI_SENDER_PHONE),
    tax_number: env.KARGONOMI_SENDER_TAX_NUMBER,
    tax_place: env.KARGONOMI_SENDER_TAX_PLACE,
    address: env.KARGONOMI_SENDER_ADDRESS,
    state_id: toNumberOrNull(env.KARGONOMI_SENDER_STATE_ID) ?? 34,
    city_id: toNumberOrNull(env.KARGONOMI_SENDER_CITY_ID) ?? 425,
  };
  const body = await kargonomiJson("/warehouses", { method: "POST", body: payload });
  return unwrap(body, "warehouse");
}

// ─────────────────────────────────────────────────────────────
// İl / ilçe
// ─────────────────────────────────────────────────────────────

function toLocations(body: unknown): KargonomiLocation[] {
  const data = unwrap(body);
  const list = Array.isArray(data) ? data : Array.isArray((data as KargonomiShipment)?.data) ? (data as KargonomiShipment).data : [];
  return (list as KargonomiShipment[])
    .map((x) => ({ id: Number(x.id), name: String(x.name ?? x.title ?? "") }))
    .filter((x) => Number.isFinite(x.id) && x.name);
}

export async function getKargonomiStates(countryId?: number): Promise<KargonomiLocation[]> {
  const country = countryId ?? toNumberOrNull(process.env.KARGONOMI_COUNTRY_ID) ?? 1;
  return toLocations(await kargonomiJson(`/states/${country}`));
}

export async function getKargonomiCities(stateId: number): Promise<KargonomiLocation[]> {
  return toLocations(await kargonomiJson(`/cities/${stateId}`));
}

// ─────────────────────────────────────────────────────────────
// Webhook'lar
// ─────────────────────────────────────────────────────────────

export async function listKargonomiWebhooks(): Promise<KargonomiShipment[]> {
  const data = unwrap(await kargonomiJson("/webhooks"), "webhooks");
  return Array.isArray(data) ? data : [];
}

export async function createKargonomiWebhook(url: string, events: string[] = ["shipment.updated"]): Promise<KargonomiShipment> {
  return unwrap(await kargonomiJson("/webhooks", { method: "POST", body: { url, events } }), "webhook");
}

export async function updateKargonomiWebhook(id: number | string, patch: Record<string, unknown>): Promise<KargonomiShipment> {
  return unwrap(await kargonomiJson(`/webhooks/${id}`, { method: "PUT", body: patch }), "webhook");
}

export async function deleteKargonomiWebhook(id: number | string): Promise<void> {
  await kargonomiJson(`/webhooks/${id}`, { method: "DELETE" });
}

/**
 * `X-Webhook-Signature` (HMAC-SHA256) doğrulaması.
 * - `rawBody` MUTLAKA ham metin olmalıdır (JSON.parse edilip yeniden stringify edilmiş hali değil).
 * - Hex ve base64 çıktıları ile isteğe bağlı `sha256=` önekini kabul eder.
 * - Zamanlama saldırılarına karşı `timingSafeEqual` kullanır.
 */
export function verifyKargonomiWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | null | undefined = process.env.KARGONOMI_WEBHOOK_SECRET
): boolean {
  if (!secret || !signatureHeader) return false;

  const provided = signatureHeader.trim().replace(/^sha256=/i, "");
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest();

  const candidates: Buffer[] = [];
  if (/^[0-9a-f]{64}$/i.test(provided)) candidates.push(Buffer.from(provided, "hex"));
  try {
    const b64 = Buffer.from(provided, "base64");
    if (b64.length === digest.length) candidates.push(b64);
  } catch {
    /* geçersiz base64 */
  }

  return candidates.some((c) => c.length === digest.length && crypto.timingSafeEqual(c, digest));
}
