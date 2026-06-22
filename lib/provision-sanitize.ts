import type { ProvisionIntent } from "@/lib/intent-schema";
import {
  CORPORATE_KEYWORDS,
  CORPORATE_ONLY_MODE,
  ECOMMERCE_KEYWORDS,
  isCorporateProject,
} from "@/lib/site-type";

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

const ECOMMERCE_KEYWORDS_LOCAL = ECOMMERCE_KEYWORDS;

export function sanitizeProvisionIntent(
  intent: ProvisionIntent,
  userPrompt = "",
): ProvisionIntent {
  if (CORPORATE_ONLY_MODE) {
    const suggestedPrimaryColor = /^#[0-9a-fA-F]{6}$/.test(
      intent.suggestedPrimaryColor.trim(),
    )
      ? intent.suggestedPrimaryColor.trim()
      : "#1e40af";

    return {
      ...intent,
      siteType: "kurumsal",
      suggestedTheme: "astra",
      suggestedPlugins: [],
      suggestedPrimaryColor,
    };
  }

  const normalizedTheme = intent.suggestedTheme.trim().toLowerCase();

  const isEcommerce =
    ECOMMERCE_KEYWORDS_LOCAL.test(intent.siteType) ||
    ECOMMERCE_KEYWORDS_LOCAL.test(userPrompt) ||
    ECOMMERCE_KEYWORDS_LOCAL.test(intent.siteTitle);

  const isCorporate =
    !isEcommerce &&
    (CORPORATE_KEYWORDS.test(intent.siteType) ||
      CORPORATE_KEYWORDS.test(userPrompt) ||
      CORPORATE_KEYWORDS.test(intent.siteTitle) ||
      isCorporateProject({
        siteType: intent.siteType,
        suggestedPlugins: intent.suggestedPlugins,
        prompt: userPrompt,
      }));

  let suggestedTheme = ALLOWED_THEMES.has(normalizedTheme)
    ? normalizedTheme
    : "astra";

  const plugins = new Set<string>();

  if (isEcommerce) {
    plugins.add("woocommerce");
    suggestedTheme = "storefront";
  } else if (isCorporate) {
    if (!ALLOWED_THEMES.has(normalizedTheme)) {
      suggestedTheme = "astra";
    }
    if (suggestedTheme !== "astra" && suggestedTheme !== "kadence") {
      suggestedTheme = "astra";
    }
  }

  let suggestedPrimaryColor = intent.suggestedPrimaryColor.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(suggestedPrimaryColor)) {
    if (isEcommerce) {
      suggestedPrimaryColor = "#1e293b";
    } else if (isCorporate) {
      suggestedPrimaryColor = "#1e40af";
    } else {
      suggestedPrimaryColor = "#2563eb";
    }
  }

  return {
    ...intent,
    siteType: isCorporate ? intent.siteType || "kurumsal" : intent.siteType,
    suggestedTheme,
    suggestedPlugins: Array.from(plugins),
    suggestedPrimaryColor,
  };
}
