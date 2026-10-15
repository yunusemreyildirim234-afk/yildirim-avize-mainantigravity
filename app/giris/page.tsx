"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  variation: { variationValue: string };
}

interface Order {
  id: string;
  totalAmount: number;
  shippingType: string;
  status: string;
  kargonomiShipmentId?: number | null;
  kargonomiStatusLabel?: string | null;
  shippingProviderName?: string | null;
  shippingTrackingCode?: string | null;
  shippingBarcode?: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function AuthPage() {
  const { data: session, status, update: updateSession } = useSession();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  const [showAdminGuide, setShowAdminGuide] = useState(false);

  // Form alanları
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profil Form Alanları
  const [profileName, setProfileName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [accountType, setAccountType] = useState("Bireysel / Firma Değilim");
  const [dealerCode, setDealerCode] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("500+");
  const [address, setAddress] = useState("");
  const [stateName, setStateName] = useState("İstanbul");
  const [cityName, setCityName] = useState("Beyoğlu");
  const [orders, setOrders] = useState<Order[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Oturum açıldığında veya yenilendiğinde profil verilerini API'den çek
  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/user/profile?email=${encodeURIComponent(session.user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            const p = data.profile;
            setProfileName(p.name || "");
            setPhone(p.phone || "");
            setCustomerCode(p.customerCode || "");
            setTaxNumber(p.taxNumber || "");
            setTaxOffice(p.taxOffice || "");
            setAccountType(p.accountType || "Bireysel / Firma Değilim");
            setDealerCode(p.dealerCode || "");
            setMonthlyVolume(p.monthlyVolume || "500+");
            setAddress(p.address || "");
            setStateName(p.stateName || "İstanbul");
            setCityName(p.cityName || "Beyoğlu");
          }
        })
        .catch(() => {});

      // Kullanıcının geçmiş siparişlerini de çek
      fetch("/api/auth")
        .then((res) => res.json())
        .then((data) => {
          if (data.user?.orders) {
            setOrders(data.user.orders);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Google OAuth ile Giriş
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/giris" });
    } catch {
      setErrorMsg("Google ile bağlantı kurulurken bir hata oluştu.");
      setLoading(false);
    }
  };

  // E-posta ve Şifre ile Giriş / Kayıt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === "login") {
        // NextAuth Credentials Girişi
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (res?.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg("Başarıyla giriş yapıldı.");
        }
      } else {
        // Hızlı Kayıt Olma ve Şifreli Hesap Oluşturma
        const regRes = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            name,
            email,
            password,
          }),
        });

        const regData = await regRes.json();
        if (!regRes.ok || regData.error) {
          setErrorMsg(regData.error || "Kayıt işlemi başarısız.");
        } else {
          setSuccessMsg(regData.message || "Hesabınız başarıyla oluşturuldu, oturum açılıyor...");
          // Kayıt sonrası otomatik oturum aç
          const loginRes = await signIn("credentials", {
            redirect: false,
            email,
            password,
          });
          if (loginRes?.error) {
            setErrorMsg(loginRes.error);
          }
        }
      }
    } catch {
      setErrorMsg("Sunucuya bağlanırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Profil Güncelleme
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.user?.email,
          name: profileName,
          phone,
          customerCode,
          taxNumber,
          taxOffice,
          accountType,
          dealerCode,
          monthlyVolume,
          address,
          stateName,
          cityName,
          stateId: stateName.toLowerCase().includes("istanbul") ? 34 : 34,
          cityId: cityName.toLowerCase().includes("beyoğlu") ? 425 : 425,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Profil bilgileriniz başarıyla güncellendi.");
        await updateSession();
      } else {
        setErrorMsg(data.error || "Profil güncellenemedi.");
      }
    } catch {
      setErrorMsg("Profil kaydedilirken bağlantı hatası oluştu.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Canlı Kargonomi ve Mağaza Bilgilerini Tek Tıkla Doldur
  const handleAutoFillOwnerDefaults = async () => {
    if (!confirm("Canlı Kargonomi ve Yunus Emre Yıldırım resmi gönderici bilgileri profilinize uygulansın mı?")) return;
    setSavingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.user?.email,
          syncOwnerDefaults: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        const p = data.profile;
        setProfileName(p.name || "");
        setPhone(p.phone || "");
        setCustomerCode(p.customerCode || "");
        setTaxNumber(p.taxNumber || "");
        setTaxOffice(p.taxOffice || "");
        setAccountType(p.accountType || "");
        setDealerCode(p.dealerCode || "");
        setMonthlyVolume(p.monthlyVolume || "");
        setAddress(p.address || "");
        setStateName(p.stateName || "İstanbul");
        setCityName(p.cityName || "Beyoğlu");
        setSuccessMsg("Canlı Kargonomi ve Beyoğlu mağaza bilgileri hesabınıza başarıyla kaydedildi!");
        await updateSession();
      } else {
        setErrorMsg(data.error || "Bilgiler uygulanamadı.");
      }
    } catch {
      setErrorMsg("İşlem sırasında hata oluştu.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Yükleme Durumu
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest opacity-60">Oturum Doğrulanıyor…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. OTURUM AÇIKSA: KULLANICI & KARGONOMI PROFİL PANELİ
  // ─────────────────────────────────────────────────────────────
  if (session?.user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session.user as any).role || "USER";
    const isOwnerAccount =
      session.user.email === "yunusemreyildirim234@gmail.com" ||
      session.user.email === "iletisim@yildirimavize.com" ||
      userRole === "ADMIN";

    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Üst Karşılama Kartı */}
          <div className="glass rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold ${
                  isOwnerAccount
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                }`}>
                  {isOwnerAccount ? "👑 Sistem Yöneticisi & İmalatçı" : "Müşteri Hesabı"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                  ● Oturum Aktif
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold mt-2">
                Hoş Geldiniz, {session.user.name || "Değerli Müşterimiz"}
              </h1>
              <p className="text-xs opacity-60 mt-0.5">{session.user.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnerAccount && (
                <Link
                  href="/admin"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-bold transition shadow-md shadow-amber-500/25 flex items-center gap-1.5"
                >
                  <span>⚙️</span>
                  <span>Yönetici & Operasyon Paneli</span>
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/giris" })}
                className="rounded-xl border border-[var(--glass-border)] hover:bg-red-500/10 hover:text-red-500 px-4 py-2.5 text-xs font-semibold transition"
              >
                Çıkış Yap
              </button>
            </div>
          </div>

          {/* Bildirim Mesajları */}
          {successMsg && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              ✓ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-300">
              ✕ {errorMsg}
            </div>
          )}

          {/* Sekmeler: Profil Bilgileri / Geçmiş Siparişler */}
          <div className="flex gap-2 border-b border-[var(--glass-border)] pb-2 text-sm font-semibold">
            <button
              onClick={() => setActiveTab("profile")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "profile"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              👤 Profil & Kargonomi Bilgileri
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "orders"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              📦 Geçmiş Siparişlerim ({orders.length})
            </button>
          </div>

          {/* ── SEKMESİ: PROFİL & KARGONOMI BİLGİLERİ ────────────────── */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSave} className="glass rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--glass-border)] pb-4">
                <div>
                  <h2 className="text-lg font-serif font-bold">Kullanıcı & Canlı Kargonomi Gönderici Profili</h2>
                  <p className="text-xs opacity-60 mt-0.5">
                    Bu bilgiler siparişlerinizde, kargo paket etiketlerinde ve Kargonomi API entegrasyonunda kullanılır.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillOwnerDefaults}
                  disabled={savingProfile}
                  className="rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
                  title="Yunus Emre Yıldırım resmi Beyoğlu mağaza ve Kargonomi canlı bilgilerini tek tıkla uygula"
                >
                  <span>⚡</span>
                  <span>Canlı Kargonomi Sabitlerini Yükle</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 opacity-80">Ad Soyad / Gönderici Adı</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Yunus Emre Yıldırım (Yıldırım Avize Aydınlatma)"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">Telefon Numarası</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5458126990"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">
                    Kargonomi Müşteri Kodu <span className="text-amber-500 font-bold">(JFHFVZ01)</span>
                  </label>
                  <input
                    type="text"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    placeholder="JFHFVZ01"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">TC Kimlik No / Vergi No</label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="10022539990"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    placeholder="Beyoğlu"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">Hesap Tipi</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-xs outline-none focus:border-amber-400 transition"
                  >
                    <option value="Bireysel / Firma Değilim">Bireysel / Firma Değilim</option>
                    <option value="Şahıs Şirketi">Şahıs Şirketi</option>
                    <option value="Limited / Anonim Şirket">Limited / Anonim Şirket</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">Kargonomi Bayi Kodu</label>
                  <input
                    type="text"
                    value={dealerCode}
                    onChange={(e) => setDealerCode(e.target.value)}
                    placeholder="86"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">Aylık Tahmini Paket / Gönderi</label>
                  <input
                    type="text"
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(e.target.value)}
                    placeholder="500+"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1 opacity-80">Sabit Gönderici & Mağaza Adresi</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Bereketzade Mah. Tevfikiye Han, İskender Cad, Nazlı Hanım Sk. No:6 D:11, Şişhane Beyoğlu / İstanbul"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">İl (State Name)</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="İstanbul"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 opacity-80">İlçe (City Name)</label>
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Beyoğlu"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-[var(--glass-border)]">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 text-xs font-black uppercase tracking-widest transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingProfile ? "Kaydediliyor…" : "Profil & Kargonomi Bilgilerini Kaydet"}
                </button>
              </div>
            </form>
          )}

          {/* ── SEKMESİ: GEÇMİŞ SİPARİŞLER ────────────────────────────── */}
          {activeTab === "orders" && (
            <div className="glass rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-serif font-bold border-b border-[var(--glass-border)] pb-4">
                Sipariş Geçmişim ({orders.length})
              </h2>

              {orders.length === 0 ? (
                <div className="py-12 text-center opacity-60 text-xs">
                  Henüz kayıtlı bir siparişiniz bulunmuyor.
                  <div className="mt-4">
                    <Link
                      href="/urunler"
                      className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 font-bold transition inline-block"
                    >
                      Koleksiyonu İncele →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-[var(--glass-border)] p-4 sm:p-5 space-y-3 bg-white/5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-border)] pb-3 text-xs">
                        <div>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="opacity-50 ml-2">
                            {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 px-3 py-1 font-semibold text-[11px]">
                            {order.kargonomiStatusLabel || order.status}
                          </span>
                          <span className="font-bold text-sm">
                            {order.totalAmount.toLocaleString("tr-TR")} ₺
                          </span>
                        </div>
                      </div>

                      {/* Kargonomi Kargo Detayı */}
                      {order.shippingType === "STANDART_KARGO" && (
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold">🚚 Kargonomi Güvencesiyle Üst Düzey Korumalı Kargo</span>
                            {order.shippingTrackingCode && (
                              <span className="block font-mono text-[11px] opacity-80 mt-0.5">
                                Takip No: {order.shippingTrackingCode}
                              </span>
                            )}
                            {order.shippingBarcode && (
                              <span className="block font-mono text-[11px] opacity-80">
                                Barkod: {order.shippingBarcode}
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/kargo-takip?code=${order.shippingTrackingCode || order.id}`}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-[11px] font-bold transition"
                          >
                            Canlı Takip Et →
                          </Link>
                        </div>
                      )}

                      {/* Sipariş Ürünleri */}
                      <div className="space-y-1 text-xs opacity-80">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.quantity}x {item.variation.variationValue}
                            </span>
                            <span>{item.unitPrice.toLocaleString("tr-TR")} ₺</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. OTURUM KAPALIYSA: GİRİŞ, HIZLI KAYIT VE YÖNETİCİ PORTALI
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        {/* Başlık Alanı */}
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-amber-600 dark:text-amber-300">
            Yıldırım Avize Aydınlatma
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-black">
            {authMode === "login" ? "Müşteri Girişi" : "Hızlı Hesap Oluştur"}
          </h1>
          <p className="mx-auto max-w-sm text-xs opacity-70">
            {authMode === "login"
              ? "Siparişlerinizi ve canlı Kargonomi durumunuzu takip etmek için giriş yapın."
              : "Daha önce misafir olarak sipariş verdiyseniz, aynı e-posta ile kayıt olarak geçmişinizi tek tıkla hesabınıza bağlayabilirsiniz."}
          </p>
        </div>

        {/* Bildirimler */}
        {errorMsg && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-300 text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300 text-center">
            {successMsg}
          </div>
        )}

        {/* Ana Auth Kartı */}
        <div className="glass rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-2xl border border-[var(--glass-border)]">
          {/* Giriş Yap / Hızlı Kayıt Ol Belirgin Segment Butonları */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-black/10 dark:bg-white/5 border border-[var(--glass-border)]">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMode === "login"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <span>🔑</span>
              <span>Giriş Yap</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMode === "register"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <span>⚡</span>
              <span>Hızlı Kayıt Ol</span>
            </button>
          </div>

          {/* Google OAuth Butonu */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-white/10 hover:bg-white/20 p-3.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google ile Hızlı {authMode === "login" ? "Giriş Yap" : "Kayıt Ol"}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[var(--glass-border)] w-full" />
            <span className="bg-[var(--glass-bg)] px-3 text-[10px] uppercase tracking-widest opacity-50 absolute">
              veya e-posta ile
            </span>
          </div>

          {/* Form Alanı (Giriş veya Hızlı Kayıt) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Adınız ve Soyadınız
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Yunus Emre Yıldırım"
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">
                E-posta Adresiniz
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yunusemreyildirim234@gmail.com"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">
                {authMode === "register" ? "Güvenli Şifre Belirleyin (En az 6 karakter)" : "Şifreniz"}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-white/5 p-3 text-xs outline-none focus:border-amber-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black p-3.5 text-xs font-black uppercase tracking-widest transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading
                ? "İşleniyor…"
                : authMode === "login"
                ? "Giriş Yap"
                : "Hızlı Hesap Oluştur & Başla"}
            </button>
          </form>

          {/* Alt Bilgilendirme ve Geçiş */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-amber-600 dark:text-amber-300 hover:underline font-semibold"
            >
              {authMode === "login"
                ? "Hesabınız yok mu? Hızlıca Üye Olun →"
                : "Zaten bir hesabınız var mı? Giriş Yapın →"}
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. YÖNETİCİ (ADMIN) GİRİŞİ & ERİŞİM REHBERİ BÖLÜMÜ
            ───────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                Yönetici & Operasyon Girişi
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminGuide(!showAdminGuide)}
              className="text-[11px] text-amber-600 dark:text-amber-400 underline font-semibold"
            >
              {showAdminGuide ? "Kapat ▲" : "Nasıl Çalışır? ▼"}
            </button>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            Yıldırım Avize yetkili yönetim paneline geçmek veya avize envanterini/stoklarını düzenlemek için yönetici merkezini kullanabilirsiniz.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 px-4 py-2.5 text-xs font-bold text-center transition shadow-md flex items-center justify-center gap-2"
            >
              <span>⚙️</span>
              <span>Yönetici Paneline Git (/admin)</span>
              <span>→</span>
            </Link>
          </div>

          {/* Açılır Yönetici Rehberi & Açıklama */}
          {showAdminGuide && (
            <div className="mt-3 pt-3 border-t border-amber-500/20 text-[11px] leading-relaxed space-y-2 opacity-90">
              <div className="font-semibold text-amber-600 dark:text-amber-300">
                📌 Yönetici Girişi ve Güvenlik Mimarisi:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>
                  <strong>Sistem Yöneticisi Girişi:</strong> <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">yunusemreyildirim234@gmail.com</code> veya <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">iletisim@yildirimavize.com</code> adresiyle Google veya şifre ile giriş yapıldığında sistem hesabınızı kalıcı olarak <strong>ADMIN</strong> yetkisine yükseltir.
                </li>
                <li>
                  <strong>Operasyon Paneli Güvenliği:</strong> <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">/admin</code> rotası sunucu seviyesinde <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">proxy.ts</code> (HTTP Basic Auth) ile de korunmaktadır.
                </li>
                <li>
                  <strong>Envanter & Kargonomi:</strong> Yönetici panelinden hızlıca yeni avize modelleri ekleyebilir, fiyat/stok güncelleyebilir, tek tıkla Kargonomi sipariş taslakları oluşturup PDF kargo barkodu yazdırabilirsiniz.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}