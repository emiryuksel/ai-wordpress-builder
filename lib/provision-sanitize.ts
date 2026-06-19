import type { ProvisionIntent } from "@/lib/intent-schema";

/** WordPress.org üzerinden wp-cli ile kurulabilen ücretsiz temalar */
export const ALLOWED_THEMES = new Set([
  "astra",
  "storefront",
  "oceanwp",
  "generatepress",
  "kadence",
  "blocksy",
  "neve",
  "twentytwentyfour",
  "twentytwentythree",
]);

/** WordPress.org üzerinden kurulabilen ücretsiz eklentiler */
export const ALLOWED_PLUGINS = new Set([
  "woocommerce",
  "elementor",
  "contact-form-7",
  "yoast-seo",
  "wordpress-seo",
  "jetpack",
  "classic-widgets",
  "classic-editor",
]);

const ECOMMERCE_KEYWORDS = /e-?ticaret|e-?commerce|shop|mağaza|woocommerce/i;

export function sanitizeProvisionIntent(
  intent: ProvisionIntent,
  userPrompt = "",
): ProvisionIntent {
  const normalizedTheme = intent.suggestedTheme.trim().toLowerCase();

  const isEcommerce =
    ECOMMERCE_KEYWORDS.test(intent.siteType) ||
    ECOMMERCE_KEYWORDS.test(userPrompt) ||
    ECOMMERCE_KEYWORDS.test(intent.siteTitle);

  let suggestedTheme = ALLOWED_THEMES.has(normalizedTheme)
    ? normalizedTheme
    : "astra";

  // Kurulum hızı: yalnızca zorunlu eklentiler (Elementor/Jetpack vb. kurulumu dakikalarca uzatır)
  const plugins = new Set<string>();

  if (isEcommerce) {
    plugins.add("woocommerce");
    suggestedTheme = "storefront";
  }

  let suggestedPrimaryColor = intent.suggestedPrimaryColor.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(suggestedPrimaryColor)) {
    suggestedPrimaryColor = isEcommerce ? "#1e293b" : "#2563eb";
  }

  return {
    ...intent,
    suggestedTheme,
    suggestedPlugins: Array.from(plugins),
    suggestedPrimaryColor,
  };
}
