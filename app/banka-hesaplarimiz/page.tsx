"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  currency: string;
  branch?: string;
  accountNumber?: string;
  logo?: string;
  active: boolean;
  statusText: string;
}

const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "kuveyt-turk",
    bankName: "Kuveyt Türk Katılım Bankası",
    accountHolder: "YUNUS EMRE YILDIRIM",
    iban: "TR57 0020 5000 0981 4891 2000 01",
    currency: "TRY (Türk Lirası)",
    branch: "Şişhane / Beyoğlu Şubesi",
    accountNumber: "0981 4891 2000 01",
    logo: "/kuveytturk1.jpg",
    active: true,
    statusText: "Aktif • Havale & EFT Kabul Edilir",
  },
  {
    id: "akbank",
    bankName: "Akbank TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "qnb",
    bankName: "QNB Bank TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "garanti",
    bankName: "Garanti Bankası TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "halkbank",
    bankName: "Halk Bankası TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "isbank",
    bankName: "İş Bankası TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "yapikredi",
    bankName: "Yapı Kredi TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "ziraat",
    bankName: "Ziraat Bankası TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "denizbank",
    bankName: "Denizbank TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
  {
    id: "vakifbank",
    bankName: "Vakıfbank TL",
    accountHolder: "[Yakında Eklenecek]",
    iban: "-",
    currency: "TRY",
    active: false,
    statusText: "Yakında Eklenecek",
  },
];

export default function BankAccountsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyIban = (iban: string, id: string) => {
    if (iban === "-") return;
    const cleanIban = iban.replace(/\s+/g, "");
    navigator.clipboard.writeText(cleanIban).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const activeAccount = BANK_ACCOUNTS.find((acc) => acc.active);
  const scheduledAccounts = BANK_ACCOUNTS.filter((acc) => !acc.active);

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Üst Başlık & Açıklama */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-300">
            <span>🏛️ Resmi Ödeme Kanalları</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-black tracking-tight">
            Banka Hesaplarımız
          </h1>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm opacity-70">
            Yıldırım Avize Aydınlatma resmi şirket hesaplarına Havale veya FAST/EFT ile güvenle ödeme yapabilirsiniz.
          </p>
        </div>

        {/* Önemli Sipariş Açıklaması Bilgi Kutusu */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-6 sm:p-8 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-lg shadow-amber-500/30 text-2xl">
              📢
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                Havale / EFT ile Ödeme Yapan Değerli Müşterilerimizin Dikkatine
              </span>
              <p className="text-sm sm:text-base font-semibold leading-relaxed text-neutral-900 dark:text-neutral-100">
                &ldquo;Sipariş Numaranızı Havale ya da EFT açıklamasına eklemenizi rica ederiz. Ödemeniz muhasebe departmanımız tarafından doğrulandıktan sonra siparişiniz kargoya verilecektir.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* 1. Aktif Banka Kartı (Kuveyt Türk Öne Çıkarılmış Kart) */}
        {activeAccount && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-300">
                Aktif ve Doğrulanmış Hesap
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                7/24 FAST & Havale Kabul Edilir
              </span>
            </div>

            <div className="glass relative overflow-hidden rounded-3xl border border-amber-500/40 p-6 sm:p-8 shadow-2xl transition hover:border-amber-400">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Sol: Logo veya Amblem */}
                <div className="lg:col-span-3 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                  <div className="relative h-20 w-36 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-white p-2 shadow-md flex items-center justify-center">
                    <Image
                      src={activeAccount.logo || "/kuveytturk1.jpg"}
                      alt={activeAccount.bankName}
                      fill
                      className="object-contain p-2"
                      priority
                    />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {activeAccount.bankName}
                    </h3>
                    <p className="text-xs opacity-60">{activeAccount.branch}</p>
                  </div>
                </div>

                {/* Orta: Hesap Detayları */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                      Alıcı / Hesap Sahibi
                    </span>
                    <span className="text-base sm:text-lg font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {activeAccount.accountHolder}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                      IBAN Numarası
                    </span>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="text-base sm:text-xl font-mono font-black tracking-wide text-amber-600 dark:text-amber-300 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/20 select-all">
                        {activeAccount.iban}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs opacity-75">
                    <span><strong>Para Birimi:</strong> {activeAccount.currency}</span>
                  </div>
                </div>

                {/* Sağ: Hızlı Kopyala Butonu */}
                <div className="lg:col-span-3 flex flex-col items-stretch justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopyIban(activeAccount.iban, activeAccount.id)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black px-6 py-4 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/25 active:scale-95"
                  >
                    {copiedId === activeAccount.id ? (
                      <>
                        <span className="text-base">✓</span>
                        <span>IBAN Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>IBAN&apos;ı Kopyala</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center opacity-60">
                    Mobil bankacılıkta doğrudan yapıştırabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Diğer Bankalar (Şematik & Gelecek Banka Kartları Tablosu) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
              Gelecek Banka Kanalları & Entegrasyonlar
            </h2>
            <span className="text-[11px] opacity-60">
              Aşağıdaki hesaplar muhasebe departmanımızca yakında devreye alınacaktır.
            </span>
          </div>

          <div className="glass overflow-hidden rounded-3xl border border-[var(--glass-border)] shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--glass-border)] bg-white/5 text-[11px] uppercase tracking-wider opacity-70">
                    <th className="py-4 px-6 font-semibold">Banka Adı</th>
                    <th className="py-4 px-6 font-semibold">Hesap Sahibi / Adı</th>
                    <th className="py-4 px-6 font-semibold">IBAN Numarası</th>
                    <th className="py-4 px-6 font-semibold text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {/* Kuveyt Türk Tablo Satırı */}
                  {activeAccount && (
                    <tr className="bg-amber-500/5 hover:bg-amber-500/10 transition">
                      <td className="py-4 px-6 font-bold flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {activeAccount.bankName}
                      </td>
                      <td className="py-4 px-6 font-mono font-medium">{activeAccount.accountHolder}</td>
                      <td className="py-4 px-6 font-mono font-bold text-amber-600 dark:text-amber-300">
                        {activeAccount.iban}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyIban(activeAccount.iban, "tbl-" + activeAccount.id)}
                          className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3 py-1 font-bold text-[11px] transition shadow-sm"
                        >
                          {copiedId === "tbl-" + activeAccount.id ? "✓ Kopyalandı" : "Kopyala"}
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Yakında Eklenecek Bankalar */}
                  {scheduledAccounts.map((acc) => (
                    <tr key={acc.id} className="opacity-70 hover:opacity-100 hover:bg-white/5 transition">
                      <td className="py-3.5 px-6 font-medium text-neutral-800 dark:text-neutral-200">
                        {acc.bankName}
                      </td>
                      <td className="py-3.5 px-6 italic text-neutral-500 dark:text-neutral-400">
                        {acc.accountHolder}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-neutral-400">-</td>
                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center rounded-full bg-neutral-200/50 dark:bg-neutral-800/80 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                          {acc.statusText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Şirket Bilgileri & İletişim Kartı */}
        <div className="glass rounded-3xl border border-[var(--glass-border)] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-[var(--glass-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-bold">Şirket & Fatura Bilgileri</h2>
              <p className="text-xs opacity-60 mt-0.5">
                Resmi yazışmalar ve kurumsal havale/fatura işlemleriniz için şirket bilgilerimiz.
              </p>
            </div>
            <Link
              href="/iletisim"
              className="text-xs font-bold text-amber-600 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
            >
              <span>Müşteri Hizmetleri & İletişim</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                Firma Ünvanı
              </span>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                Yıldırım Avize Şahıs Şirketi
              </p>
              <p className="text-[11px] opacity-70">Yunus Emre Yıldırım</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                Şirket & İmalat Adresi
              </span>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                Emekyemez Mah. Beyoğlu / İstanbul
              </p>
              <p className="text-[11px] opacity-70">Bereketzade & Şişhane Bölgesi</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                Vergi Dairesi & No
              </span>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                Beyoğlu Vergi Dairesi
              </p>
              <p className="text-[11px] opacity-70">VKN: 10022539990</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                Müşteri Destek & WhatsApp
              </span>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                +90 545 812 69 90
              </p>
              <p className="text-[11px] opacity-70">yunusemreyildirim234@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Geri Dönüş Linkleri */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold pt-4 opacity-75">
          <Link href="/sepet" className="hover:text-amber-500 transition">
            ← Sepetime Geri Dön
          </Link>
          <span>•</span>
          <Link href="/kargo-takip" className="hover:text-amber-500 transition">
            Kargo Takip
          </Link>
          <span>•</span>
          <Link href="/iletisim" className="hover:text-amber-500 transition">
            İletişim & Konum
          </Link>
        </div>
      </div>
    </div>
  );
}
