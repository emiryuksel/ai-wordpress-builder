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
  "change_hero_text",
  "update_contact",
  "add_service",
  /** @deprecated Kurumsal akışta pasif — lib/chat-commands.ts */
  "add_product",
  "unsupported",
] as const;

export const chatActionSchema = z.object({
  actionType: z.enum(chatActionTypes),
  target: z
    .string()
    .describe(
      "Hedef alan: renk/font/layout; change_hero_text için title|subtitle|cta; update_contact için email|phone|address",
    ),
  value: z
    .string()
    .describe(
      "Uygulanacak değer: hex renk, font, layout, site adı, hero metni, iletişim bilgisi veya boş",
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
  serviceName: z
    .string()
    .optional()
    .describe("add_service: hizmet adı"),
  serviceDescription: z
    .string()
    .optional()
    .describe("add_service: kısa açıklama"),
  imageKeyword: z
    .string()
    .optional()
    .describe(
      "add_service veya add_product: görsel üretimi için İngilizce anahtar kelime",
    ),
});

export type ChatAction = z.infer<typeof chatActionSchema>;

export const chatActionGeminiSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    actionType: {
      type: SchemaType.STRING,
      description:
        "change_color | change_font | change_layout | change_site_title | change_hero_text | update_contact | add_service | unsupported",
    },
    target: {
      type: SchemaType.STRING,
      description:
        "Hedef alan: tema/renk/font/layout; hero için title|subtitle|cta; iletişim için email|phone|address",
    },
    value: {
      type: SchemaType.STRING,
      description: "Uygulanacak değer",
    },
    productName: {
      type: SchemaType.STRING,
      description: "add_product: ürün adı (pasif)",
    },
    productPrice: {
      type: SchemaType.STRING,
      description: "add_product: fiyat (pasif)",
    },
    productDescription: {
      type: SchemaType.STRING,
      description: "add_product: kısa açıklama (pasif)",
    },
    serviceName: {
      type: SchemaType.STRING,
      description: "add_service: hizmet adı",
    },
    serviceDescription: {
      type: SchemaType.STRING,
      description: "add_service: kısa açıklama",
    },
    imageKeyword: {
      type: SchemaType.STRING,
      description: "add_service: görsel anahtar kelimesi (İngilizce)",
    },
  },
  required: ["actionType", "target", "value"],
};
