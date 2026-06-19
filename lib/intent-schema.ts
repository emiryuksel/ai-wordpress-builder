import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { z } from "zod";

export const provisionIntentSchema = z.object({
  siteType: z
    .string()
    .describe("Kısa site türü tanımı, örn. blog, e-ticaret, portfolyo"),
  suggestedTheme: z
    .string()
    .describe("WordPress.org slug formatında ücretsiz tema, varsayılan astra"),
  suggestedPlugins: z
    .array(z.string())
    .describe("WordPress.org slug formatında ücretsiz eklenti listesi"),
  suggestedPrimaryColor: z
    .string()
    .describe("Önerilen ana renk, hex formatında, örn. #1e3a8a"),
  siteTitle: z
    .string()
    .describe("WordPress site başlığı, kullanıcı isteğine uygun kısa bir isim"),
});

export type ProvisionIntent = z.infer<typeof provisionIntentSchema>;

export const provisionIntentGeminiSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    siteType: {
      type: SchemaType.STRING,
      description: "Kısa site türü tanımı",
    },
    suggestedTheme: {
      type: SchemaType.STRING,
      description:
        "WordPress.org ücretsiz tema slug: astra, storefront, oceanwp, generatepress, kadence, blocksy, neve, twentytwentyfour",
    },
    suggestedPlugins: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "WordPress.org eklenti slug listesi",
    },
    suggestedPrimaryColor: {
      type: SchemaType.STRING,
      description: "Hex renk kodu, örn. #2563eb",
    },
    siteTitle: {
      type: SchemaType.STRING,
      description: "WordPress site başlığı",
    },
  },
  required: [
    "siteType",
    "suggestedTheme",
    "suggestedPlugins",
    "suggestedPrimaryColor",
    "siteTitle",
  ],
};

export const chatActionTypes = [
  "change_color",
  "change_font",
  "change_layout",
  "change_site_title",
  "add_product",
  "unsupported",
] as const;

export const chatActionSchema = z.object({
  actionType: z.enum(chatActionTypes),
  target: z
    .string()
    .describe(
      "Hedef alan: renk/font/layout için hedef; add_product için kategori (elektronik, moda, ev-yasam)",
    ),
  value: z
    .string()
    .describe(
      "Uygulanacak değer: hex renk, font, layout, site adı veya boş",
    ),
  productName: z
    .string()
    .optional()
    .describe("add_product: ürün adı"),
  productPrice: z
    .string()
    .optional()
    .describe("add_product: fiyat, örn. 299.90"),
  productDescription: z
    .string()
    .optional()
    .describe("add_product: kısa açıklama"),
  imageKeyword: z
    .string()
    .optional()
    .describe(
      "add_product: görsel eşleştirme anahtarı (headphones, watch, bag, shirt, shoes, coffee, candles, yoga vb.)",
    ),
});

export type ChatAction = z.infer<typeof chatActionSchema>;

export const chatActionGeminiSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    actionType: {
      type: SchemaType.STRING,
      description:
        "change_color | change_font | change_layout | change_site_title | add_product | unsupported",
    },
    target: {
      type: SchemaType.STRING,
      description: "Değiştirilecek hedef alan veya ürün kategorisi",
    },
    value: {
      type: SchemaType.STRING,
      description: "Uygulanacak değer veya yeni site adı",
    },
    productName: {
      type: SchemaType.STRING,
      description: "add_product: ürün adı",
    },
    productPrice: {
      type: SchemaType.STRING,
      description: "add_product: fiyat (TRY)",
    },
    productDescription: {
      type: SchemaType.STRING,
      description: "add_product: kısa açıklama",
    },
    imageKeyword: {
      type: SchemaType.STRING,
      description: "add_product: görsel anahtar kelimesi (İngilizce)",
    },
  },
  required: ["actionType", "target", "value"],
};
