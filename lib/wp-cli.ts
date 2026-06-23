import fs from "node:fs/promises";
import path from "node:path";

import { execWpCli, execWpCliSh, runWooCommerceSetup } from "@/lib/docker-manager";
import { getRuntimeRoot } from "@/lib/data-paths";
import { generateProductImage } from "@/lib/gemini-image";
import type { ChatAction } from "@/lib/intent-schema";
import { inferProductCategory } from "@/lib/product-images";

const ASTRA_COLOR_MAP: Record<string, string> = {
  primary: "theme-color",
  theme: "theme-color",
  accent: "theme-color",
  link: "link-color",
  heading: "heading-base-color",
  headings: "heading-base-color",
  text: "text-color",
  body: "text-color",
  background: "site-layout-outside-bg-color",
  "site-background": "site-layout-outside-bg-color",
  "content-background": "content-bg-color",
};

const ASTRA_FONT_MAP: Record<string, string> = {
  body: "body-font-family",
  heading: "headings-font-family",
  headings: "headings-font-family",
  title: "headings-font-family",
};

const STOREFRONT_COLOR_MAP: Record<string, string> = {
  primary: "storefront_accent_color",
  theme: "storefront_accent_color",
  accent: "storefront_accent_color",
  link: "storefront_accent_color",
  heading: "storefront_heading_color",
  headings: "storefront_heading_color",
  text: "storefront_text_color",
  body: "storefront_text_color",
  background: "background_color",
  "site-background": "background_color",
  "content-background": "storefront_footer_background_color",
};

const STOREFRONT_FONT_MAP: Record<string, string> = {
  body: "storefront_body_font_family",
  heading: "storefront_heading_font_family",
  headings: "storefront_heading_font_family",
  title: "storefront_heading_font_family",
};

const SITE_LAYOUT_MAP: Record<string, string> = {
  "full-width": "ast-full-width-layout",
  fullwidth: "ast-full-width-layout",
  full_width: "ast-full-width-layout",
  boxed: "ast-boxed-layout",
  padded: "ast-padded-layout",
  fluid: "ast-fluid-width-layout",
};

const CONTENT_LAYOUT_MAP: Record<string, string> = {
  plain: "plain-container",
  boxed: "boxed-container",
  "content-boxed": "content-boxed-container",
  "page-builder": "page-builder",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }

  throw new Error(`Geçersiz renk değeri: ${value}`);
}

function normalizeFontFamily(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Font değeri boş olamaz.");
  }

  if (trimmed.includes(",")) {
    return trimmed;
  }

  const serifFonts = new Set([
    "georgia",
    "times",
    "times new roman",
    "merriweather",
    "playfair display",
    "lora",
  ]);
  const monospaceFonts = new Set(["courier", "courier new", "roboto mono"]);
  const lower = trimmed.toLowerCase();

  if (serifFonts.has(lower)) {
    return `'${trimmed}', serif`;
  }

  if (monospaceFonts.has(lower)) {
    return `'${trimmed}', monospace`;
  }

  return `'${trimmed}', sans-serif`;
}

async function getActiveThemeSlug(projectId: string): Promise<string> {
  const output = await execWpCli(projectId, [
    "theme",
    "list",
    "--status=active",
    "--field=name",
  ]);

  return output.trim().toLowerCase() || "unknown";
}

async function runPhp(projectId: string, php: string): Promise<void> {
  await execWpCli(projectId, ["eval", php]);
}

/** Aynı menünün primary + secondary konumunda gösterilmesini engeller. */
export async function fixAstraHeaderMenuDuplication(
  projectId: string,
): Promise<void> {
  const php = `
$locations = get_nav_menu_locations();
if (isset($locations['secondary_menu'])) {
  unset($locations['secondary_menu']);
  set_nav_menu_locations($locations);
}

$primary_menu_id = isset($locations['primary']) ? (int) $locations['primary'] : 0;
if ($primary_menu_id > 0) {
  $items = wp_get_nav_menu_items($primary_menu_id);
  if (is_array($items)) {
    $seen = array();
    foreach ($items as $item) {
      if (!is_object($item) || !isset($item->title, $item->ID)) {
        continue;
      }
      $key = strtolower(trim(wp_strip_all_tags($item->title)));
      if ($key === '') {
        continue;
      }
      if (isset($seen[$key])) {
        wp_delete_post((int) $item->ID, true);
        continue;
      }
      $seen[$key] = true;
    }
  }
}
`;

  await runPhp(projectId, php);
}

async function updateAstraSetting(
  projectId: string,
  optionKey: string,
  optionValue: string | number,
): Promise<void> {
  const php = `$settings=get_option("astra-settings",array());if(!is_array($settings)){$settings=array();}$settings[${JSON.stringify(optionKey)}]=${JSON.stringify(optionValue)};update_option("astra-settings",$settings);`;

  await runPhp(projectId, php);
}

async function setThemeMod(
  projectId: string,
  modKey: string,
  modValue: string | number,
): Promise<void> {
  await execWpCli(projectId, [
    "theme",
    "mod",
    "set",
    modKey,
    String(modValue),
  ]);
}

async function appendCustomCss(
  projectId: string,
  cssRule: string,
): Promise<void> {
  const php = `$current=wp_get_custom_css();$addition=${JSON.stringify(cssRule)};wp_update_custom_css_post(trim($current."\\n".$addition));`;

  await runPhp(projectId, php);
}

async function removeMarkedCustomCss(
  projectId: string,
  marker: string,
): Promise<void> {
  const php = `$marker=${JSON.stringify(marker)};$current=wp_get_custom_css();$start='/* '.$marker.' */';$pos=strpos($current,$start);if($pos!==false){$next=strpos($current,'/* ai-wp:',$pos+1);$current=$next===false?substr($current,0,$pos):substr($current,0,$pos).substr($current,$next);wp_update_custom_css_post(trim($current));}`;

  await runPhp(projectId, php);
}

export async function applyAstraBlogChrome(
  projectId: string,
  primaryColor: string,
): Promise<void> {
  const primary = normalizeHexColor(primaryColor);

  await removeMarkedCustomCss(projectId, "ai-wp:theme");

  const settings: Record<string, string> = {
    "theme-color": primary,
    "link-color": primary,
    "heading-base-color": "#0f172a",
    "text-color": "#475569",
    "header-color-site-title": "#0f172a",
    "header-color-h-menu-link": "#334155",
    "header-color-h-menu-link-hover": primary,
    "footer-color": "#64748b",
    "footer-heading-color": "#0f172a",
  };

  for (const [key, value] of Object.entries(settings)) {
    await updateAstraSetting(projectId, key, value);
  }

  await fixAstraHeaderMenuDuplication(projectId);

  await setMarkedCustomCss(
    projectId,
    "ai-wp:blog-chrome",
    buildAstraBlogChromeCss(primary),
  );
  await flushCaches(projectId);
}

async function setMarkedCustomCss(
  projectId: string,
  marker: string,
  cssRule: string,
): Promise<void> {
  const php = `$marker=${JSON.stringify(marker)};$addition=${JSON.stringify(cssRule)};$current=wp_get_custom_css();$start='/* '.$marker.' */';$pos=strpos($current,$start);if($pos!==false){$next=strpos($current,'/* ai-wp:',$pos+1);$current=$next===false?substr($current,0,$pos):substr($current,0,$pos).substr($current,$next);}wp_update_custom_css_post(trim($current."\\n".$addition));`;

  await runPhp(projectId, php);
}

async function flushCaches(projectId: string): Promise<void> {
  try {
    await execWpCli(projectId, ["cache", "flush"]);
  } catch {
    // Önbellek eklentisi yoksa sorun değil.
  }
}

function isBrandThemeTarget(target: string): boolean {
  const normalized = normalizeKey(target);
  return (
    normalized === "primary" ||
    normalized === "theme" ||
    normalized === "accent"
  );
}

function contrastingTextColor(hex: string): string {
  const normalized = normalizeHexColor(hex);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0f172a" : "#ffffff";
}

function buildAstraBlogChromeCss(primary: string): string {
  return `/* ai-wp:blog-chrome */
.ast-primary-header-bar,
.main-header-bar,
.site-header,
#masthead .main-header-bar,
#ast-desktop-header .main-header-bar {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06) !important;
}
.site-title a,
.site-title a:hover,
.site-header .site-title a,
#masthead .site-title a,
.ast-site-identity .site-title a,
.ast-site-identity .site-title {
  color: #0f172a !important;
}
.site-description,
.site-header .site-description,
.ast-site-identity .site-description {
  color: #64748b !important;
}
.main-navigation a,
.main-header-menu a,
.ast-main-header-bar-alignment a,
.ast-builder-menu .menu-item > a {
  color: #334155 !important;
}
.main-navigation a:hover,
.main-header-menu a:hover,
.ast-builder-menu .menu-item > a:hover {
  color: ${primary} !important;
}
.ast-builder-menu-2,
#ast-desktop-header .ast-builder-menu-2,
.site-header-primary-section-right .ast-builder-menu-2,
.ast-header-menu-2,
.secondary-menu-bar-navigation {
  display: none !important;
}
.site-footer,
.ast-footer-overlay,
.site-footer .footer-widget-area {
  background-color: #f8fafc !important;
  border-top: 1px solid #e2e8f0 !important;
}
.site-footer .widget-title,
.footer-widget-area .widget-title {
  color: #0f172a !important;
}
.site-footer,
.site-footer a,
.footer-widget-area {
  color: #64748b !important;
}
.ast-article-post .post-thumb img,
.ast-blog-featured-section img,
.blog-layout-1 .post-thumb img {
  width: 100% !important;
  height: auto !important;
  object-fit: cover !important;
  min-height: 180px !important;
  background-color: #e2e8f0 !important;
}`;
}

function buildBrandThemeCss(color: string): string {
  const headerText = contrastingTextColor(color);

  return `/* ai-wp:theme */
.ast-primary-header-bar,
.main-header-bar,
.site-header,
.storefront-primary-navigation,
#masthead,
header.site-header {
  background-color: ${color} !important;
  border-bottom-color: ${color} !important;
}
.site-header .site-title a,
.site-header .site-description,
.site-header .main-navigation ul li a,
#masthead a,
#masthead .site-title a,
.ast-primary-header-bar .site-title a,
.ast-primary-header-bar .main-header-menu a,
.main-header-menu a {
  color: ${headerText} !important;
}
.button,
button,
input[type="submit"],
input[type="button"],
.wp-block-button__link,
.woocommerce a.button,
.woocommerce button.button,
.widget .search-submit,
.onsale {
  background-color: ${color} !important;
  border-color: ${color} !important;
  color: #ffffff !important;
}
.star-rating span:before {
  color: ${color} !important;
}`;
}

function buildVisibleColorCss(target: string, color: string): string {
  const normalizedTarget = normalizeKey(target);
  const marker = `ai-wp:${normalizedTarget}`;

  if (isBrandThemeTarget(normalizedTarget)) {
    return buildBrandThemeCss(color);
  }

  if (
    normalizedTarget === "heading" ||
    normalizedTarget === "headings" ||
    normalizedTarget === "title"
  ) {
    return `/* ${marker} */
h1, h2, h3, h4, h5, h6, .entry-title {
  color: ${color} !important;
}`;
  }

  if (
    normalizedTarget === "background" ||
    normalizedTarget === "site-background"
  ) {
    return `/* ${marker} */
body, .site, .site-content {
  background-color: ${color} !important;
}`;
  }

  if (normalizedTarget === "text" || normalizedTarget === "body") {
    return `/* ${marker} */
body, p, .site-content, .entry-content, .widget {
  color: ${color} !important;
}`;
  }

  if (normalizedTarget === "link") {
    return `/* ${marker} */
a, .entry-content a, .widget a {
  color: ${color} !important;
}`;
  }

  return buildBrandThemeCss(color);
}

async function applyStorefrontBrandTheme(
  projectId: string,
  color: string,
): Promise<void> {
  const mods: Array<[string, string]> = [
    ["storefront_accent_color", color],
    ["storefront_header_background_color", color],
    ["storefront_button_background_color", color],
    ["storefront_button_text_color", "#ffffff"],
    ["storefront_heading_color", "#222222"],
    ["storefront_text_color", "#555555"],
  ];

  for (const [modKey, modValue] of mods) {
    await setThemeMod(projectId, modKey, modValue);
  }
}

async function applyAstraBrandTheme(
  projectId: string,
  color: string,
): Promise<void> {
  await updateAstraSetting(projectId, "theme-color", color);
  await updateAstraSetting(projectId, "link-color", color);
}

function toStorefrontModValue(modKey: string, color: string): string {
  if (modKey === "background_color") {
    return color.replace("#", "");
  }

  return color;
}

async function applyColorWithFallback(
  projectId: string,
  target: string,
  color: string,
): Promise<{ method: string }> {
  const normalizedTarget = normalizeKey(target);
  const theme = await getActiveThemeSlug(projectId);
  const cssMarker = isBrandThemeTarget(normalizedTarget)
    ? "ai-wp:theme"
    : `ai-wp:${normalizedTarget}`;
  const css = buildVisibleColorCss(normalizedTarget, color);

  if (theme === "astra") {
    if (isBrandThemeTarget(normalizedTarget)) {
      await applyAstraBrandTheme(projectId, color);
    } else {
      const optionKey = ASTRA_COLOR_MAP[normalizedTarget] ?? "theme-color";
      await updateAstraSetting(projectId, optionKey, color);
    }

    await setMarkedCustomCss(projectId, cssMarker, css);
    await flushCaches(projectId);
    return {
      method: isBrandThemeTarget(normalizedTarget)
        ? "Astra tema paleti"
        : "Astra ayarları",
    };
  }

  if (theme === "storefront") {
    if (isBrandThemeTarget(normalizedTarget)) {
      await applyStorefrontBrandTheme(projectId, color);
    } else {
      const modKey =
        STOREFRONT_COLOR_MAP[normalizedTarget] ?? "storefront_accent_color";
      await setThemeMod(
        projectId,
        modKey,
        toStorefrontModValue(modKey, color),
      );
    }

    await setMarkedCustomCss(projectId, cssMarker, css);
    await flushCaches(projectId);
    return {
      method: isBrandThemeTarget(normalizedTarget)
        ? "Storefront tema paleti"
        : "Storefront özelleştirici",
    };
  }

  const genericMod =
    normalizedTarget === "background" ? "background_color" : "accent_color";

  try {
    await setThemeMod(
      projectId,
      genericMod,
      toStorefrontModValue(genericMod, color),
    );
    await setMarkedCustomCss(projectId, cssMarker, css);
    await flushCaches(projectId);
    return { method: "tema modu" };
  } catch {
    await setMarkedCustomCss(projectId, cssMarker, css);
    await flushCaches(projectId);
    return { method: "özel CSS" };
  }
}

async function applyFontWithFallback(
  projectId: string,
  target: string,
  fontFamily: string,
): Promise<{ method: string }> {
  const normalizedTarget = normalizeKey(target);
  const theme = await getActiveThemeSlug(projectId);
  const isHeading =
    normalizedTarget === "heading" ||
    normalizedTarget === "headings" ||
    normalizedTarget === "title";

  if (theme === "astra") {
    const optionKey =
      ASTRA_FONT_MAP[normalizedTarget] ?? "body-font-family";
    await updateAstraSetting(projectId, optionKey, fontFamily);
    return { method: "Astra ayarları" };
  }

  if (theme === "storefront") {
    const modKey =
      STOREFRONT_FONT_MAP[normalizedTarget] ?? "storefront_body_font_family";

    try {
      await setThemeMod(projectId, modKey, fontFamily);
    } catch {
      // Font modu yoksa CSS ile devam et.
    }

    const selector = isHeading
      ? "h1, h2, h3, h4, h5, h6, .entry-title, .site-title"
      : "body, p, .site-content, .entry-content";
    await appendCustomCss(
      projectId,
      `${selector} { font-family: ${fontFamily} !important; }`,
    );
    await flushCaches(projectId);
    return { method: "Storefront özelleştirici" };
  }

  try {
    const modKey = isHeading ? "heading_font" : "body_font";
    await setThemeMod(projectId, modKey, fontFamily);
    return { method: "tema modu" };
  } catch {
    const selector = isHeading
      ? "h1, h2, h3, h4, h5, h6, .entry-title"
      : "body, p, .site, .entry-content";
    const css = `${selector} { font-family: ${fontFamily} !important; }`;

    await appendCustomCss(projectId, css);
    return { method: "özel CSS" };
  }
}

async function applyColorChange(
  projectId: string,
  target: string,
  value: string,
): Promise<string> {
  const normalizedTarget = normalizeKey(target);
  const knownTargets = new Set([
    ...Object.keys(ASTRA_COLOR_MAP),
    "primary",
    "theme",
    "accent",
    "link",
    "heading",
    "text",
    "background",
  ]);

  if (!knownTargets.has(normalizedTarget)) {
    throw new Error(
      `Desteklenmeyen renk hedefi: ${target}. Kullanılabilir: primary, link, heading, text, background`,
    );
  }

  const color = normalizeHexColor(value);
  const { method } = await applyColorWithFallback(
    projectId,
    normalizedTarget,
    color,
  );

  if (isBrandThemeTarget(normalizedTarget)) {
    return `Tema paleti ${color} olarak güncellendi — header, butonlar ve vurgular değişti (${method}).`;
  }

  return `${target} rengi ${color} olarak güncellendi (${method}).`;
}

async function applyFontChange(
  projectId: string,
  target: string,
  value: string,
): Promise<string> {
  const normalizedTarget = normalizeKey(target);

  if (!ASTRA_FONT_MAP[normalizedTarget]) {
    throw new Error(
      `Desteklenmeyen font hedefi: ${target}. Kullanılabilir: body, heading`,
    );
  }

  const fontFamily = normalizeFontFamily(value);
  const { method } = await applyFontWithFallback(
    projectId,
    normalizedTarget,
    fontFamily,
  );

  return `${target} fontu "${fontFamily}" olarak güncellendi (${method}).`;
}

async function applyLayoutChange(
  projectId: string,
  target: string,
  value: string,
): Promise<string> {
  const theme = await getActiveThemeSlug(projectId);
  const normalizedTarget = normalizeKey(target);
  const normalizedValue = normalizeKey(value);

  if (theme !== "astra") {
    if (normalizedTarget === "width" || normalizedTarget === "content-width") {
      const width = Number.parseInt(value, 10);

      if (Number.isNaN(width) || width < 768 || width > 1920) {
        throw new Error("İçerik genişliği 768-1920 px arasında olmalı.");
      }

      const css = `.site-content, .col-full, .content-area, #primary { max-width: ${width}px !important; margin-left: auto !important; margin-right: auto !important; }`;
      await appendCustomCss(projectId, css);
      return `İçerik genişliği ${width}px olarak ayarlandı (özel CSS).`;
    }

    throw new Error(
      `Layout değişikliği şu an yalnızca Astra temasında tam destekleniyor. Aktif tema: ${theme}. Renk ve font değişikliklerini deneyebilirsiniz.`,
    );
  }

  if (normalizedTarget === "width" || normalizedTarget === "content-width") {
    const width = Number.parseInt(value, 10);

    if (Number.isNaN(width) || width < 768 || width > 1920) {
      throw new Error("İçerik genişliği 768-1920 px arasında olmalı.");
    }

    await updateAstraSetting(projectId, "site-content-width", width);
    return `İçerik genişliği ${width}px olarak ayarlandı.`;
  }

  if (normalizedTarget === "site" || normalizedTarget === "site-layout") {
    const layout = SITE_LAYOUT_MAP[normalizedValue];

    if (!layout) {
      throw new Error(
        `Desteklenmeyen site layout değeri: ${value}. Kullanılabilir: full-width, boxed, padded, fluid`,
      );
    }

    await updateAstraSetting(projectId, "site-layout", layout);
    return `Site layout "${value}" olarak güncellendi.`;
  }

  if (normalizedTarget === "content" || normalizedTarget === "content-layout") {
    const layout = CONTENT_LAYOUT_MAP[normalizedValue];

    if (!layout) {
      throw new Error(
        `Desteklenmeyen içerik layout değeri: ${value}. Kullanılabilir: plain, boxed, content-boxed`,
      );
    }

    await updateAstraSetting(projectId, "site-content-layout", layout);
    return `İçerik layout "${value}" olarak güncellendi.`;
  }

  throw new Error(
    `Desteklenmeyen layout hedefi: ${target}. Kullanılabilir: site, content, width`,
  );
}

function normalizePrice(value: string): string {
  const cleaned = value
    .trim()
    .replace(/₺|tl|try/gi, "")
    .replace(/\s/g, "")
    .replace(",", ".");

  const price = Number.parseFloat(cleaned);

  if (Number.isNaN(price) || price <= 0) {
    throw new Error(`Geçersiz fiyat: ${value}`);
  }

  return price.toFixed(2);
}

function normalizeSiteTitle(value: string): string {
  const title = value.trim();

  if (title.length < 2 || title.length > 80) {
    throw new Error("Site adı 2-80 karakter arasında olmalı.");
  }

  return title;
}

function normalizeCategorySlug(value: string): string {
  const normalized = normalizeKey(value);

  if (normalized.includes("elektron") || normalized.includes("tech")) {
    return "elektronik";
  }

  if (
    normalized.includes("moda") ||
    normalized.includes("giyim") ||
    normalized.includes("fashion")
  ) {
    return "moda";
  }

  if (
    normalized.includes("ev") ||
    normalized.includes("yasam") ||
    normalized.includes("home")
  ) {
    return "ev-yasam";
  }

  return "elektronik";
}

const CATEGORY_LABELS: Record<string, string> = {
  elektronik: "Elektronik",
  moda: "Moda",
  "ev-yasam": "Ev ve Yaşam",
};

export async function isWooCommerceActive(projectId: string): Promise<boolean> {
  try {
    // is-active başarılı olunca stdout boş döner; exit code 0 = aktif
    await execWpCli(projectId, ["plugin", "is-active", "woocommerce"]);
    return true;
  } catch {
    try {
      const output = await execWpCli(projectId, [
        "plugin",
        "list",
        "--status=active",
        "--field=name",
      ]);
      return output
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .includes("woocommerce");
    } catch {
      return false;
    }
  }
}

async function getAdminUserId(projectId: string): Promise<string> {
  try {
    return (await execWpCli(projectId, ["user", "get", "admin", "--field=ID"])).trim();
  } catch {
    return "1";
  }
}

async function getOrCreateProductCategory(
  projectId: string,
  categorySlug: string,
): Promise<string> {
  const label = CATEGORY_LABELS[categorySlug] ?? "Genel";

  try {
    const existing = await execWpCli(projectId, [
      "term",
      "list",
      "product_cat",
      "--slug=" + categorySlug,
      "--field=term_id",
    ]);

    const termId = existing.trim().split("\n")[0];
    if (termId) {
      return termId;
    }
  } catch {
    // Kategori yoksa oluşturulacak.
  }

  return (
    await execWpCli(projectId, [
      "term",
      "create",
      "product_cat",
      label,
      "--slug=" + categorySlug,
      "--porcelain",
    ])
  ).trim();
}

async function attachAiProductImage(
  projectId: string,
  productId: string,
  productName: string,
  category: string,
  description = "",
  userPrompt = "",
): Promise<void> {
  const oldThumb = await execWpCli(projectId, [
    "post",
    "meta",
    "get",
    productId,
    "_thumbnail_id",
  ]).catch(() => "");

  if (oldThumb.trim() && oldThumb.trim() !== "0") {
    await execWpCli(projectId, [
      "post",
      "delete",
      oldThumb.trim(),
      "--force",
    ]).catch(() => undefined);
  }

  const aiImage = await generateProductImage(
    productName,
    description,
    category,
    userPrompt,
  );

  if (!aiImage) {
    throw new Error(
      `AI görsel üretilemedi: ${productName}. GEMINI_API_KEY kontrol edin.`,
    );
  }

  const imagesDir = path.join(getRuntimeRoot(), projectId, "product-images");
  await fs.mkdir(imagesDir, { recursive: true });
  const fileName = `ai-${productId}.jpg`;
  const containerPath = `/product-images/${fileName}`;
  await fs.writeFile(path.join(imagesDir, fileName), aiImage);

  const output = await execWpCliSh(
    projectId,
    `wp media import "${containerPath}" --post_id=${productId} --featured_image --porcelain --path=/var/www/html`,
    180_000,
  );

  if (!output || output.toLowerCase().includes("error")) {
    throw new Error(`Ürün görseli yüklenemedi: ${productName}`);
  }
}

interface WcProductRow {
  ID: string;
  post_title: string;
  post_excerpt: string;
}

async function listPublishedProducts(
  projectId: string,
): Promise<WcProductRow[]> {
  try {
    const output = await execWpCli(projectId, [
      "post",
      "list",
      "--post_type=product",
      "--post_status=publish",
      "--fields=ID,post_title,post_excerpt",
      "--format=json",
    ]);
    const rows = JSON.parse(output) as WcProductRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function getProductCategorySlug(
  projectId: string,
  productId: string,
): Promise<string> {
  try {
    const output = (
      await execWpCli(projectId, [
        "post",
        "term",
        "list",
        productId,
        "product_cat",
        "--field=slug",
      ])
    ).trim();
    return output.split("\n")[0]?.trim() || "ev-yasam";
  } catch {
    return "ev-yasam";
  }
}

const PRODUCT_IMAGE_CONCURRENCY = 2;

async function mapProductsWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) {
      return;
    }
    results[current] = await worker(items[current]);
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runNext()),
  );

  return results;
}

/** Mağazadaki tüm ürünlere kullanıcı isteğine uygun AI görseli üretir */
export async function enrichEcommerceProductImages(
  projectId: string,
  userPrompt: string,
): Promise<void> {
  const products = await listPublishedProducts(projectId);

  await mapProductsWithConcurrency(
    products,
    PRODUCT_IMAGE_CONCURRENCY,
    async (product) => {
      const category = await getProductCategorySlug(projectId, product.ID);
      const description =
        product.post_excerpt?.trim() ||
        `${product.post_title} — mağaza ürünü`;

      try {
        await attachAiProductImage(
          projectId,
          product.ID,
          product.post_title,
          category,
          description,
          userPrompt,
        );
      } catch (error) {
        console.warn(
          `[ecommerce-images] ${product.post_title}:`,
          error instanceof Error ? error.message : error,
        );
      }
    },
  );

  await flushCaches(projectId);
}

/** WooCommerce kurulmamış veya ürünleri eksik mağazayı onarır */
async function ensureWooCommerceInstalled(projectId: string): Promise<void> {
  if (await isWooCommerceActive(projectId)) {
    return;
  }

  try {
    await execWpCli(projectId, [
      "plugin",
      "install",
      "woocommerce",
      "--activate",
      "--force",
    ]);
    if (await isWooCommerceActive(projectId)) {
      return;
    }
  } catch {
    // Bozuk veya yarım kurulum — silip yeniden dene.
  }

  try {
    await execWpCli(projectId, ["plugin", "delete", "woocommerce", "--deactivate"]);
  } catch {
    // Eklenti zaten yoksa sorun değil.
  }

  await execWpCli(projectId, [
    "plugin",
    "install",
    "woocommerce",
    "--activate",
  ]);

  if (!(await isWooCommerceActive(projectId))) {
    throw new Error("WooCommerce etkinleştirilemedi.");
  }
}

export async function repairEcommerceSite(
  projectId: string,
  userPrompt = "",
  primaryColor = "#2563eb",
): Promise<void> {
  await ensureWooCommerceInstalled(projectId);

  await runWooCommerceSetup(projectId);

  if (primaryColor) {
    try {
      await applyChatAction(projectId, {
        actionType: "change_color",
        target: "primary",
        value: primaryColor,
      });
    } catch {
      // Storefront dışı temalarda sorun değil.
    }
  }

  if (userPrompt) {
    await enrichEcommerceProductImages(projectId, userPrompt);
  }

  await flushCaches(projectId);
}

async function applySiteTitleChange(
  projectId: string,
  value: string,
): Promise<string> {
  const title = normalizeSiteTitle(value);

  await execWpCli(projectId, ["option", "update", "blogname", title]);

  const year = new Date().getFullYear();
  try {
    await setThemeMod(
      projectId,
      "storefront_copyright_text",
      `© ${year} ${title} · Tüm hakları saklıdır.`,
    );
  } catch {
    // Storefront dışı temalarda sorun değil.
  }

  await flushCaches(projectId);
  return `Site adı "${title}" olarak güncellendi.`;
}

async function applyAddProduct(
  projectId: string,
  action: ChatAction,
): Promise<string> {
  if (!(await isWooCommerceActive(projectId))) {
    throw new Error(
      "Ürün eklemek için WooCommerce gerekli. Bu site e-ticaret olarak kurulmamış.",
    );
  }

  const productName = action.productName?.trim() || action.value.trim();
  const productPrice = action.productPrice?.trim();
  const productDescription =
    action.productDescription?.trim() || `${productName} — mağazamızda.`;
  const imageKeyword = action.imageKeyword?.trim() || productName;
  const categorySlug = inferProductCategory(
    productName,
    action.target || "ev-yasam",
  );

  if (!productName) {
    throw new Error("Ürün adı belirtilmedi.");
  }

  if (!productPrice) {
    throw new Error("Ürün fiyatı belirtilmedi. Örn: \"499 TL'lik ürün ekle\"");
  }

  const price = normalizePrice(productPrice);
  const categoryId = await getOrCreateProductCategory(projectId, categorySlug);
  const adminId = await getAdminUserId(projectId);

  const escapedName = productName.replace(/"/g, '\\"');
  const escapedDescription = productDescription.replace(/"/g, '\\"');

  const productId = (
    await execWpCli(projectId, [
      "wc",
      "product",
      "create",
      "--name=" + escapedName,
      "--type=simple",
      "--regular_price=" + price,
      "--description=" + escapedDescription,
      "--short_description=Hızlı kargo · Kolay iade",
      "--catalog_visibility=visible",
      "--status=publish",
      "--user=" + adminId,
      '--categories=[{"id":' + categoryId + "}]",
      "--porcelain",
    ])
  ).trim();

  if (!productId || productId === "0") {
    throw new Error("Ürün oluşturulamadı.");
  }

  await attachAiProductImage(
    projectId,
    productId,
    productName,
    categorySlug,
    productDescription,
    imageKeyword,
  );

  await flushCaches(projectId);

  return `"${productName}" ürünü ${price} ₺ fiyatla mağazaya eklendi. AI ile ürüne özel görsel üretildi.`;
}

export async function applyChatAction(
  projectId: string,
  action: ChatAction,
): Promise<string> {
  switch (action.actionType) {
    case "change_color":
      return applyColorChange(projectId, action.target, action.value);
    case "change_font":
      return applyFontChange(projectId, action.target, action.value);
    case "change_layout":
      return applyLayoutChange(projectId, action.target, action.value);
    case "change_site_title":
      return applySiteTitleChange(projectId, action.value);
    case "add_product":
      return applyAddProduct(projectId, action);
    case "unsupported":
      throw new Error("unsupported");
    default:
      throw new Error("Bilinmeyen aksiyon türü.");
  }
}

export function getUnsupportedMessage(): string {
  return 'Bu istek şu an desteklenmiyor. Deneyebilirsiniz: "Site adını X yap", "499 TL\'lik kulaklık ekle", "Ana rengi lacivert yap".';
}

export function formatChatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Değişiklik uygulanamadı. Lütfen tekrar deneyin.";
  }

  const message = error.message;

  if (message.includes("Astra tema fonksiyonları")) {
    return "Tema ayarları uygulanamadı. Sayfayı yenileyip tekrar deneyin.";
  }

  if (message.includes("Geçersiz renk") || message.includes("Desteklenmeyen")) {
    return message;
  }

  if (message.includes("Command failed") || message.length > 180) {
    return "WordPress düzenleme komutu başarısız oldu. Docker çalışıyor mu kontrol edip tekrar deneyin.";
  }

  return message;
}
