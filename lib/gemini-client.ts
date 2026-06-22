import { GoogleGenerativeAI } from "@google/generative-ai";

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
Kullanıcı: 899 TL'lik kablosuz kulaklık ekle
Çıktı: {"actionType":"add_product","target":"elektronik","value":"","productName":"Kablosuz Kulaklık","productPrice":"899.00","productDescription":"Kablosuz bağlantı, uzun pil ömrü.","imageKeyword":"headphones"}

Örnek 6
Kullanıcı: 129 TL'lik baklava kutusu ekle
Çıktı: {"actionType":"add_product","target":"ev-yasam","value":"","productName":"Baklava Kutusu","productPrice":"129.00","productDescription":"Taze baklava çeşitleri hediye kutusunda.","imageKeyword":"dessert"}

Örnek 7
Kullanıcı: Mağazaya deri cüzdan ekle fiyatı 450 olsun
Çıktı: {"actionType":"add_product","target":"moda","value":"","productName":"Deri Cüzdan","productPrice":"450.00","productDescription":"El yapımı deri cüzdan.","imageKeyword":"bag"}

Örnek 8
Kullanıcı: 10 ürün ekle
Çıktı: {"actionType":"unsupported","target":"content","value":""}

Örnek 8
Kullanıcı: Ana temayı kırmızı yap
Çıktı: {"actionType":"change_color","target":"theme","value":"#ff0000"}

Örnek 9
Kullanıcı: Yazıları mavi yap
Çıktı: {"actionType":"change_color","target":"text","value":"#0000ff"}

Örnek 10
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
    systemInstruction: `Sen bir WordPress site düzenleme asistanısın.
Kullanıcının isteğini yapılandırılmış bir aksiyona çevir.

Kurallar:
- Tema rengi, font, layout, site adı değiştirme ve tek ürün ekleme desteklenir.
- Toplu ürün ekleme, eklenti kurma, sayfa silme gibi istekler için actionType: "unsupported" döndür.
- Site adı değiştirme: actionType "change_site_title", value yeni site adı.
- Ürün ekleme: actionType "add_product"; productName, productPrice (TRY, nokta ondalık), productDescription, imageKeyword (görsel eşleştirme için İngilizce anahtar kelime) doldur; target kategori: elektronik | moda | ev-yasam.
- imageKeyword örnekleri: headphones, watch, bag, shirt, shoes, coffee, candles, yoga, dessert, food, wallet.
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

  return chatActionSchema.parse(JSON.parse(text));
}
