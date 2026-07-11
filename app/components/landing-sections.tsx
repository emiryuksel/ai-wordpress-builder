"use client";

type Feature = {
  icon: string;
  badge: string;
  title: string;
  description: string;
};

type Step = {
  no: string;
  title: string;
  description: string;
  hint: string;
};

const FEATURES: Feature[] = [
  {
    icon: "M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 1 1-3.5-7.1L21 3v6h-6",
    badge: "SOHBET",
    title: "Söyleyin, yapsın",
    description:
      "Kod bilmenize gerek yok. İşletmenizi, hedeflerinizi ve isteklerinizi yazın. AI, WordPress sitenizi sıfırdan tasarlar ve üretir.",
  },
  {
    icon: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
    badge: "AI",
    title: "Akıllı düzenleme",
    description:
      "\"Hero'yu daha sıcak yap\", \"fiyatları güncelle\", \"galeri ekle\". İstediğinizi yazın, AI WordPress'te tam olarak neyi değiştireceğini bilir.",
  },
  {
    icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    badge: "ÖNİZLEME",
    title: "Anında görün",
    description:
      "Her değişiklik canlı WordPress önizlemenizde anında belirir. Ne yaptığınızı görmek için sayfayı yenilemenize gerek yok.",
  },
  {
    icon: "M4 7h16M4 12h16M4 17h10",
    badge: "KALİTE",
    title: "Gerçek, çalışan WordPress siteleri",
    description:
      "Üretilen siteler gerçek WordPress kurulumudur. Masaüstü, tablet ve mobilde kusursuz çalışır ve hazır yayımlanabilir halde gelir.",
  },
  {
    icon: "M4 5h16v14H4z M4 15l4-4 3 3 5-5 4 4",
    badge: "MEDYA",
    title: "Görseller otomatik üretilir",
    description:
      "Sitenizde bir görsel gerektiğinde AI bunu fark eder ve içeriğinize özgün görseller üretip WordPress'e yerleştirir.",
  },
  {
    icon: "M12 2v6m0 8v6m10-10h-6M8 12H2",
    badge: "HIZ",
    title: "Dakikalar içinde hazır",
    description:
      "Haftalarca süren WordPress kurulum süreçleri artık dakikalar alıyor. İstediğiniz zaman düzenleyin, istediğiniz zaman paylaşın.",
  },
];

const STEPS: Step[] = [
  {
    no: "01",
    title: "Hesabınızı oluşturun",
    description:
      "E-posta ve şifrenizle saniyeler içinde kayıt olun. Kredi kartı gerekmez, hemen başlayabilirsiniz.",
    hint: "Ücretli plan gerekmez",
  },
  {
    no: "02",
    title: "Sitenizi tanımlayın",
    description:
      "İşletmenizi, hedeflerinizi ve nasıl bir site istediğinizi Türkçe yazın. AI isteğinizi analiz eder ve doğru WordPress yapısına ilerler.",
    hint: "Yönlendirici örnekler mevcut",
  },
  {
    no: "03",
    title: "AI sitenizi üretir",
    description:
      "WordPress kurulur, içerik oluşturulur ve tema yapılandırılır. Görsel gereken yerlere otomatik AI görseli üretilir.",
    hint: "İçerik ve görseller birlikte",
  },
  {
    no: "04",
    title: "Önizleyin ve konuşarak düzenleyin",
    description:
      "Üretilen WordPress sitesi tarayıcıda anında görünür. İstediğiniz bölümü seçip düzenleme isteğinizi yazın, AI cerrahi değişiklik yapar.",
    hint: "Anlık, hedefli düzenleme",
  },
  {
    no: "05",
    title: "Paylaşın",
    description:
      "Siteniz benzersiz bir adresle herkese açık yayınlanır. Hesap açmadan ziyaret edilebilir, anında paylaşılabilir.",
    hint: "Tek tıkla yayında",
  },
];

const BRANDS = [
  "İstanbul Şömine",
  "Vakaffes",
  "Nfree",
  "Espasio Cosmetic",
  "Gochre Aktos",
  "Studio Plus",
  "Deka Yapı",
];

const PRICING_HERO = "https://withsolver.com/tr";

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#6c5ce7]/20 bg-[#6c5ce7]/10 px-3 py-1 text-xs font-medium tracking-wide text-[#5847e0]">
      {label}
    </span>
  );
}

export default function LandingSections() {
  return (
    <div className="w-full">
      {/* Güvenen markalar + istatistikler */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          Güvenen markalar
        </p>
        <div className="mb-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="text-sm font-medium text-zinc-400 transition hover:text-zinc-600"
            >
              {brand}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: "150+", label: "Tamamlanan proje", sub: "ve büyüyor" },
            { value: "15+", label: "Uzman ekip üyesi", sub: "her zaman yanınızda" },
            { value: "%98", label: "Müşteri memnuniyeti", sub: "puan ortalaması" },
            { value: "∞", label: "Dakikalar içinde teslim", sub: "elle WordPress kurulumuna karşı" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-[#1d1d1f]">
                {stat.label}
              </p>
              <p className="text-xs text-zinc-400">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform özellikleri */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <SectionBadge label="✦ PLATFORM ÖZELLİKLERİ" />
          <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
            Gerçek bir AI sistemi,{" "}
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              sıfırdan tasarlandı.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            Sohbet, üretim, düzenleme ve bellek. Tüm katmanlar WordPress
            üretimi için özel geliştirildi. Karmaşık kurulum yok, kısıtlama yok.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-24px_rgba(30,27,75,0.4)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#5847e0] shadow-sm">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d={feature.icon} />
                  </svg>
                </span>
                <span className="rounded-full bg-[#6c5ce7]/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#5847e0]">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Nasıl çalışır adımlar */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <SectionBadge label="✦ BASİT İŞ AKIŞI" />
          <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
            Yazın, üretin, paylaşın.{" "}
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              Bu kadar basit.
            </span>
          </h2>
        </div>

        <ol className="relative space-y-8 border-l border-[#6c5ce7]/20 pl-8">
          {STEPS.map((step) => (
            <li key={step.no} className="relative">
              <span className="absolute -left-[2.6rem] flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-xs font-bold text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)]">
                {step.no}
              </span>
              <h3 className="text-base font-semibold text-[#1d1d1f]">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {step.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#6c5ce7]/20 bg-[#6c5ce7]/5 px-3 py-1 text-xs font-medium text-[#5847e0]">
                ✦ {step.hint}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Canlı önizleme macOS mockup */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="mb-12 text-center">
          <SectionBadge label="✦ CANLI PLATFORM ÖNİZLEME" />
          <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
            Konuşun, izleyin,{" "}
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              paylaşın.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            AI isteğinizi alır, WordPress üzerinde uygular ve sonucu tarayıcıda
            anında gösterir. Aynı ekranda, aynı anda.
          </p>
        </div>

        <div className="glass-strong overflow-hidden rounded-[24px] shadow-[0_40px_100px_-30px_rgba(30,27,75,0.5)]">
          {/* Pencere başlık çubuğu */}
          <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <p className="ml-2 truncate text-xs font-medium text-zinc-500">
              WordPress Builder Workspace
            </p>
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[280px_1fr]">
            {/* Sol: sohbet paneli */}
            <div className="space-y-3 border-r border-white/30 bg-white/40 p-4">
              <p className="text-xs font-semibold text-[#5847e0]">Solver AI</p>
              {[
                "Yeni bir online mağaza için WordPress sitesi kur",
                "Hero metni oluşturuldu, düzenlemek ister misiniz?",
                "Hero, Hakkımızda ve Galeri bölümlerini ekle",
                "WordPress sitenizin düzenlemesi başlıyor, bir dakika...",
                "\"Her sabah taze ürünler\" olarak güncellendi, artık daha net.",
              ].map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                    i % 2 === 0
                      ? "bg-white/70 text-zinc-600"
                      : "ml-4 bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white"
                  }`}
                >
                  {msg}
                </div>
              ))}
            </div>

            {/* Sağ: önizleme iskeleti */}
            <div className="space-y-4 bg-white/30 p-6">
              <div className="mx-auto h-3 w-2/3 rounded-full bg-[#6c5ce7]/20" />
              <div className="mx-auto flex justify-center">
                <div className="h-8 w-24 rounded-lg bg-gradient-to-b from-[#7b6cf0] to-[#5847e0]" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl border border-white/50 bg-white/60"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fiyatlandırma CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <SectionBadge label="✦ FİYATLANDIRMA" />
        <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          Projenize özel{" "}
          <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
            fiyatlandırma.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
          Her proje farklıdır. İhtiyaçlarınızı konuşalım ve size en uygun paketi
          birlikte belirleyelim.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={PRICING_HERO}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
          >
            Fiyatlandırmayı gör →
          </a>
          <a
            href={PRICING_HERO}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white/60 px-6 text-sm font-medium text-zinc-700 backdrop-blur-sm transition hover:bg-white/80"
          >
            Bizimle iletişime geç
          </a>
        </div>
        <p className="mt-6 text-xs text-zinc-400">
          ✦ Kredi kartı gerekmez · Ücretsiz keşif görüşmesi
        </p>
      </section>

      {/* Alt CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <SectionBadge label="✦ Solver ekibiyle çalışmaya başlayın" />
        <h2 className="mt-6 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[#1d1d1f]">
          Bir sonraki web siteniz
          <br />
          bir konuşma kadar uzakta.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
          Haftalar harcamayı bırakın. Sadece neye ihtiyacınız olduğunu
          açıklayarak dakikalar içinde güzel bir WordPress sitesi inşa edin.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={PRICING_HERO}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
          >
            Ücretsiz inşa etmeye başla →
          </a>
          <a
            href={PRICING_HERO}
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white/60 px-7 text-sm font-medium text-zinc-700 backdrop-blur-sm transition hover:bg-white/80"
          >
            Nasıl çalıştığını gör
          </a>
        </div>
        <p className="mt-6 text-xs text-zinc-400">
          Kredi kartı gerekmez · İstediğinizde iptal edin
        </p>
      </section>
    </div>
  );
}
