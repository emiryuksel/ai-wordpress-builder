import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  getEnabledChatActionDescription,
  sanitizeChatAction,
} from "@/lib/chat-commands";
import { normalizeAddServiceAction } from "@/lib/add-service-parse";
import {
  type ChatAction,
  chatActionGeminiSchema,
  chatActionSchema,
  type ProvisionIntent,
  provisionIntentGeminiSchema,
  provisionIntentSchema,
} from "@/lib/intent-schema";

const PROVISION_MODEL = "gemini-2.5-flash-lite";
const CHAT_MODEL = "gemini-2.5-flash-lite";

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ortam değişkeni tanımlı değil.");
  }

  return new GoogleGenerativeAI(apiKey);
}

const CHAT_FEW_SHOT_EXAMPLES = `
Örnek 1
Kullanıcı: Ana rengi koyu maviye çevir
Çıktı: {"actionType":"change_color","target":"primary","value":"#1e3a8a"}

Örnek 2
Kullanıcı: Başlık fontunu Georgia yap
Çıktı: {"actionType":"change_font","target":"heading","value":"Georgia"}

Örnek 3
Kullanıcı: Siteyi boxed layout yap
Çıktı: {"actionType":"change_layout","target":"site","value":"boxed"}

Örnek 4
Kullanıcı: Site adını TechShop yap
Çıktı: {"actionType":"change_site_title","target":"site","value":"TechShop"}

Örnek 5
Kullanıcı: Hero başlığını Yüksel İnşaat ile tanışın yap
Çıktı: {"actionType":"change_hero_text","target":"title","value":"Yüksel İnşaat ile tanışın"}

Örnek 6
Kullanıcı: Hero alt başlığını 20 yıllık tecrübemizle yanınızdayız yap
Çıktı: {"actionType":"change_hero_text","target":"subtitle","value":"20 yıllık tecrübemizle yanınızdayız"}

Örnek 7
Kullanıcı: CTA butonunu Teklif Al yap
Çıktı: {"actionType":"change_hero_text","target":"cta","value":"Teklif Al"}

Örnek 8
Kullanıcı: E-postayı info@yukselinsaat.com yap
Çıktı: {"actionType":"update_contact","target":"email","value":"info@yukselinsaat.com"}

Örnek 9
Kullanıcı: Telefonu 0212 555 44 33 yap
Çıktı: {"actionType":"update_contact","target":"phone","value":"0212 555 44 33"}

Örnek 10
Kullanıcı: Adresi Levent, İstanbul yap
Çıktı: {"actionType":"update_contact","target":"address","value":"Levent, İstanbul"}

Örnek 11
Kullanıcı: Proje yönetimi hizmeti ekle
Çıktı: {"actionType":"add_service","target":"service","value":"","serviceName":"Proje Yönetimi","serviceDescription":"Projelerinizi planlama aşamasından teslimata kadar yönetiyoruz.","imageKeyword":"project management"}

Örnek 11b
Kullanıcı: Mühendislik danışmanlığı hizmeti ekle
Çıktı: {"actionType":"add_service","target":"service","value":"","serviceName":"Mühendislik Danışmanlığı","serviceDescription":"Mühendislik projelerinizde teknik danışmanlık ve planlama desteği sunuyoruz.","imageKeyword":"engineering consulting"}

Örnek 12
Kullanıcı: 899 TL'lik kablosuz kulaklık ekle
Çıktı: {"actionType":"unsupported","target":"content","value":""}

Örnek 13
Kullanıcı: Ana temayı kırmızı yap
Çıktı: {"actionType":"change_color","target":"theme","value":"#ff0000"}

Örnek 14
Kullanıcı: Yazıları mavi yap
Çıktı: {"actionType":"change_color","target":"text","value":"#0000ff"}

Örnek 15
Kullanıcı: Başlıkları siyah yap
Çıktı: {"actionType":"change_color","target":"heading","value":"#000000"}
`.trim();

export async function parseProvisionIntent(
  userPrompt: string,
): Promise<ProvisionIntent> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: PROVISION_MODEL,
    systemInstruction: `Sen bir kurumsal WordPress site kurulum asistanısın.
Kullanıcının doğal dildeki isteğini analiz et ve yapılandırılmış bir kurulum planı üret.

Kurallar:
- siteType her zaman "kurumsal" olmalı.
- suggestedTheme "astra" kullan.
- suggestedPlugins boş dizi olmalı (WooCommerce veya blog eklentisi ekleme).
- siteTitle kısa, anlamlı ve kullanıcı diline uygun olsun (firma/marka adı).
- suggestedPrimaryColor geçerli bir hex renk olsun (örn. #1e40af).`,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: provisionIntentGeminiSchema,
      temperature: 0.2,
    },
  });

  const result = await model.generateContent(
    `Kullanıcı isteği: ${userPrompt}`,
  );
  const text = result.response.text();

  if (!text) {
    throw new Error("Gemini boş yanıt döndürdü.");
  }

  return provisionIntentSchema.parse(JSON.parse(text));
}

export async function parseAndSanitizeProvisionIntent(
  userPrompt: string,
): Promise<ProvisionIntent> {
  const intent = await parseProvisionIntent(userPrompt);
  const { sanitizeProvisionIntent } = await import("@/lib/provision-sanitize");
  return sanitizeProvisionIntent(intent, userPrompt);
}

export async function parseChatAction(userMessage: string): Promise<ChatAction> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: `Sen bir kurumsal WordPress site düzenleme asistanısın.
Kullanıcının isteğini yapılandırılmış bir aksiyona çevir.

Kurallar:
- Yalnızca şu aksiyonlar desteklenir: ${getEnabledChatActionDescription()} | unsupported.
- Ürün ekleme, e-ticaret, mağaza, WooCommerce ve benzeri istekler desteklenmez; actionType: "unsupported" döndür.
- Toplu içerik ekleme, eklenti kurma, sayfa silme gibi istekler için actionType: "unsupported" döndür.
- Site adı değiştirme: actionType "change_site_title", value yeni site adı (WordPress site başlığı).
- Hero metni: actionType "change_hero_text"; target title | subtitle | cta; value yeni metin.
- İletişim bilgisi: actionType "update_contact"; target email | phone | address; value yeni değer.
- Hizmet ekleme: actionType "add_service"; serviceName yalnızca kısa hizmet adı olmalı (ör. "Mühendislik Danışmanlığı"), asla talimat veya açıklama metni yazma.
- "X hizmeti ekle" isteklerinde X ifadesini serviceName yap; serviceDescription 1 cümle Türkçe tanım; imageKeyword kısa İngilizce (ör. engineering consulting).
- add_service için target her zaman "service", value boş string.
- Renk değerlerini hex formatında ver (# dahil).
- "temayı X yap", "ana temayı X yap", "siteyi X renk yap" → target: "theme" (header, butonlar, vurgular — yazı rengi değil).
- "yazıları/metni X yap" → target: "text".
- "başlıkları X yap" → target: "heading".
- "linkleri X yap" → target: "link".
- "arkaplanı X yap" → target: "background".
- Font isteklerinde font ailesi adını value alanına yaz (örn. Georgia, Inter, Roboto).
- Layout isteklerinde target: site | content | width kullan; value: full-width | boxed | padded | plain | content-boxed veya px genişliği.

${CHAT_FEW_SHOT_EXAMPLES}`,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: chatActionGeminiSchema,
      temperature: 0.1,
    },
  });

  const result = await model.generateContent(
    `Kullanıcı isteği: ${userMessage}`,
  );
  const text = result.response.text();

  if (!text) {
    throw new Error("Gemini boş yanıt döndürdü.");
  }

  const parsed = chatActionSchema.parse(JSON.parse(text));
  const sanitized = sanitizeChatAction(parsed);
  return normalizeAddServiceAction(sanitized, userMessage);
}
