export const metadata = { title: "Hakkımızda | Yıldırım Avize" };

export default function AboutPage() {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass mx-auto max-w-3xl space-y-8 rounded-[2.5rem] p-8 text-center sm:p-12">
        <h1 className="font-serif text-3xl font-black leading-tight sm:text-4xl">
          Yıldırım Avize: <span className="gold-text">Kristal Işıltının Modern Mimarı</span>
        </h1>

        <p className="text-base leading-relaxed opacity-80">
          Yıldırım Avize olarak, yarım asra yaklaşan üretim tecrübemizle mekanlarınıza zarafet ve ışık katıyoruz. Uzmanlığımız olan{" "}
          <strong>kristal ve modern avize imalatının</strong> yanı sıra, sektördeki öncü konumumuzu <strong>imalattan her türlü kristal avize taşı</strong> ve{" "}
          <strong>avize camı satışı</strong> ile pekiştiriyoruz. Müşterilerimizin özel taleplerine göre{" "}
          <strong>her renk ve formda kristal avize taşı imalatı</strong> yaparak, klasik esintileri modern tasarım çizgileriyle buluşturuyoruz.
        </p>

        <div className="space-y-2 border-t border-[var(--glass-border)] pt-8 text-sm opacity-70">
          <p>
            <strong>Adres:</strong> Tevfikiye Han, İskender Cad, Nazlı Hanım Sk. No:6 D:11, 34420 Beyoğlu/İstanbul
          </p>
          <p>
            <strong>Telefon:</strong> 0537 211 42 23
          </p>
        </div>
      </div>
    </div>
  );
}
