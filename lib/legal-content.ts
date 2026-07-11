import type { LegalContent } from "@/app/components/legal-page";

const LAST_UPDATED = "11 Temmuz 2026";
const COMPANY = "withSolver";
const CONTACT_EMAIL = "destek@withsolver.com";

export const PRIVACY: LegalContent = {
  title: "Gizlilik Politikası",
  intro: `${COMPANY} olarak kişisel verilerinizin gizliliğine önem veriyoruz. Bu politika, Solver AI WordPress Builder hizmetini kullanırken hangi verileri topladığımızı, nasıl işlediğimizi ve haklarınızı açıklar.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Topladığımız Veriler",
      paragraphs: [
        "Hizmetimizi sunabilmek için sizden ve kullanımınızdan doğan bazı verileri toplarız.",
      ],
      bullets: [
        "Hesap bilgileri: ad, e-posta adresi ve şifreniz (şifreler geri döndürülemez şekilde hashlenerek saklanır).",
        "İçerik verileri: oluşturduğunuz siteler, gönderdiğiniz prompt'lar ve üretilen WordPress içerikleri.",
        "Kullanım verileri: IP adresi, tarayıcı türü, oturum ve etkileşim kayıtları.",
      ],
    },
    {
      heading: "Verileri Kullanma Amacımız",
      bullets: [
        "Hizmeti sağlamak, sitelerinizi oluşturmak ve barındırmak.",
        "Hesabınızı yönetmek ve destek taleplerinizi karşılamak.",
        "Hizmet kalitesini ölçmek, güvenliği sağlamak ve kötüye kullanımı önlemek.",
        "Yasal yükümlülüklerimizi yerine getirmek.",
      ],
    },
    {
      heading: "Yapay Zeka İşleme",
      paragraphs: [
        "Gönderdiğiniz prompt'lar, WordPress içeriği ve görsel üretmek amacıyla yapay zeka sağlayıcılarına iletilebilir. Bu veriler yalnızca sizin talebinizi yerine getirmek için işlenir ve reklam amacıyla üçüncü taraflarla paylaşılmaz.",
      ],
    },
    {
      heading: "Verilerin Paylaşımı",
      paragraphs: [
        "Verilerinizi satmayız. Yalnızca hizmeti sunmak için gerekli olan barındırma, altyapı ve yapay zeka hizmet sağlayıcılarıyla, sözleşmesel gizlilik yükümlülükleri altında paylaşırız. Yasal zorunluluk hallerinde yetkili mercilerle paylaşım yapılabilir.",
      ],
    },
    {
      heading: "Veri Güvenliği ve Saklama",
      paragraphs: [
        "Verilerinizi yetkisiz erişime karşı korumak için makul teknik ve idari tedbirler uygularız. Verilerinizi hizmetin sunulması için gerekli olduğu sürece ve yasal saklama süreleri boyunca muhafaza ederiz.",
      ],
    },
    {
      heading: "Haklarınız",
      paragraphs: [
        `Kişisel verilerinize erişme, düzeltme, silme ve işlemeye itiraz etme haklarına sahipsiniz. Taleplerinizi ${CONTACT_EMAIL} adresine iletebilirsiniz.`,
      ],
    },
    {
      heading: "İletişim",
      paragraphs: [
        `Gizlilik uygulamalarımızla ilgili sorularınız için ${CONTACT_EMAIL} adresinden bize ulaşabilirsiniz.`,
      ],
    },
  ],
};

export const TERMS: LegalContent = {
  title: "Kullanım Koşulları",
  intro: `Solver AI WordPress Builder hizmetini kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen dikkatlice okuyun.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Hizmetin Kapsamı",
      paragraphs: [
        `${COMPANY}, yapay zeka aracılığıyla WordPress siteleri oluşturmanızı, düzenlemenizi ve yayınlamanızı sağlayan bir hizmet sunar. Hizmetin özellikleri zaman zaman geliştirilebilir veya değiştirilebilir.`,
      ],
    },
    {
      heading: "Hesap Sorumluluğu",
      bullets: [
        "Hesap bilgilerinizin gizliliğinden ve hesabınız altında gerçekleşen tüm işlemlerden siz sorumlusunuz.",
        "Doğru ve güncel bilgi vermekle yükümlüsünüz.",
        "Yetkisiz kullanım fark ettiğinizde derhal bize bildirmeniz gerekir.",
      ],
    },
    {
      heading: "Kabul Edilebilir Kullanım",
      paragraphs: [
        "Hizmeti hukuka aykırı, zararlı, yanıltıcı veya üçüncü kişilerin haklarını ihlal eden içerikler üretmek için kullanamazsınız.",
      ],
      bullets: [
        "Yasa dışı, nefret söylemi içeren veya telif haklarını ihlal eden içerik üretmek yasaktır.",
        "Sistemin güvenliğini tehdit eden, aşırı yük bindiren veya kötüye kullanan davranışlar yasaktır.",
        "Hizmeti spam veya dolandırıcılık amacıyla kullanamazsınız.",
      ],
    },
    {
      heading: "İçerik ve Fikri Mülkiyet",
      paragraphs: [
        "Oluşturduğunuz siteler ve içerikler size aittir. Hizmete ait yazılım, marka ve tasarım unsurları ise withSolver'a aittir. Hizmet üzerinden ürettiğiniz içeriğin hukuka uygunluğundan siz sorumlusunuz.",
      ],
    },
    {
      heading: "Ödeme ve Abonelik",
      paragraphs: [
        "Ücretli paketlerde ücretler, satın alma sırasında belirtilen koşullara göre tahsil edilir. Yürürlükteki tüketici mevzuatından doğan cayma ve iade haklarınız saklıdır.",
      ],
    },
    {
      heading: "Sorumluluğun Sınırlandırılması",
      paragraphs: [
        `Hizmet "olduğu gibi" sunulur. ${COMPANY}, yürürlükteki mevzuatın izin verdiği ölçüde, dolaylı zararlardan ve hizmetin kesintiye uğramasından sorumlu tutulamaz.`,
      ],
    },
    {
      heading: "Fesih",
      paragraphs: [
        "Bu koşulları ihlal etmeniz halinde hesabınızı askıya alma veya sonlandırma hakkımız saklıdır. Dilediğiniz zaman hesabınızı kapatabilirsiniz.",
      ],
    },
    {
      heading: "Uygulanacak Hukuk",
      paragraphs: [
        "Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri yetkilidir.",
      ],
    },
  ],
};

export const COOKIES: LegalContent = {
  title: "Çerez Politikası",
  intro: `Bu politika, Solver AI WordPress Builder'da çerezleri ve benzeri teknolojileri nasıl kullandığımızı açıklar.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Çerez Nedir?",
      paragraphs: [
        "Çerezler, siteyi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Oturumunuzu sürdürmek ve deneyiminizi iyileştirmek için kullanılırlar.",
      ],
    },
    {
      heading: "Kullandığımız Çerez Türleri",
      bullets: [
        "Zorunlu çerezler: Oturum açma ve güvenlik gibi temel işlevler için gereklidir.",
        "Tercih çerezleri: Dil ve arayüz tercihlerinizi hatırlar.",
        "Analitik çerezler: Hizmeti nasıl kullandığınızı anlamamıza ve geliştirmemize yardımcı olur.",
      ],
    },
    {
      heading: "Çerezleri Yönetme",
      paragraphs: [
        "Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezleri devre dışı bırakmanız hizmetin bazı bölümlerinin çalışmamasına neden olabilir.",
      ],
    },
    {
      heading: "İletişim",
      paragraphs: [
        `Çerez kullanımımızla ilgili sorularınız için ${CONTACT_EMAIL} adresine yazabilirsiniz.`,
      ],
    },
  ],
};

export const KVKK: LegalContent = {
  title: "KVKK Aydınlatma Metni",
  intro: `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla ${COMPANY} tarafından hazırlanan aydınlatma metnidir.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Veri Sorumlusu",
      paragraphs: [
        `Kişisel verileriniz, veri sorumlusu ${COMPANY} tarafından aşağıda açıklanan kapsamda işlenmektedir.`,
      ],
    },
    {
      heading: "İşlenen Kişisel Veriler",
      bullets: [
        "Kimlik ve iletişim verileri: ad, e-posta adresi.",
        "İşlem güvenliği verileri: IP adresi, oturum ve log kayıtları.",
        "Müşteri işlem verileri: oluşturduğunuz siteler ve gönderdiğiniz talepler.",
      ],
    },
    {
      heading: "İşleme Amaçları",
      bullets: [
        "Hizmetin sunulması ve sözleşmenin ifası.",
        "Hesap yönetimi ve müşteri desteği.",
        "Bilgi güvenliği süreçlerinin yürütülmesi.",
        "Yasal yükümlülüklerin yerine getirilmesi.",
      ],
    },
    {
      heading: "Hukuki Sebepler",
      paragraphs: [
        "Kişisel verileriniz; sözleşmenin kurulması ve ifası, hukuki yükümlülüğün yerine getirilmesi ve meşru menfaat hukuki sebeplerine dayanılarak işlenir.",
      ],
    },
    {
      heading: "Verilerin Aktarılması",
      paragraphs: [
        "Verileriniz, hizmetin sunulması için gerekli barındırma ve yapı sağlayıcılarına, KVKK'nın öngördüğü güvenlik tedbirleri çerçevesinde aktarılabilir.",
      ],
    },
    {
      heading: "KVKK Kapsamındaki Haklarınız",
      bullets: [
        "Kişisel verilerinizin işlenip işlenmediğini öğrenme.",
        "İşlenmişse buna ilişkin bilgi talep etme.",
        "Eksik veya yanlış işlenmişse düzeltilmesini isteme.",
        "Kanunda öngörülen şartlarla silinmesini veya yok edilmesini isteme.",
        "İşlemenin hukuka aykırılığı nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme.",
      ],
    },
    {
      heading: "Başvuru",
      paragraphs: [
        `KVKK kapsamındaki taleplerinizi ${CONTACT_EMAIL} adresine iletebilirsiniz. Talepleriniz en kısa sürede ve en geç 30 gün içinde sonuçlandırılır.`,
      ],
    },
  ],
};
