/** Uygulama rotaları ve statik yollar — site slug'ı olarak kullanılamaz. */
export const RESERVED_SLUGS = new Set([
  "api",
  "builder",
  "site-preview",
  "wp-content",
  "wp-includes",
  "wp-json",
  "wp-admin",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

/** Marka adından URL slug'ı üretir (Türkçe karakter dönüşümü dahil). */
export function slugifyBrandName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Benzersiz slug üretir: marka-adi, marka-adi-2, marka-adi-3 ...
 */
export function allocateUniqueSlug(
  brandName: string,
  takenSlugs: ReadonlySet<string>,
): string {
  const base = slugifyBrandName(brandName) || "site";
  let candidate = base;
  let suffix = 2;

  while (isReservedSlug(candidate) || takenSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
