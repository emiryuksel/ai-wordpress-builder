/** WordPress önizleme / site URL'si (production'da public host kullanılır). */
export function buildWordPressSiteUrl(hostPort: number): string {
  const host = process.env.WORDPRESS_PUBLIC_HOST?.trim() || "localhost";
  const scheme =
    process.env.WORDPRESS_URL_SCHEME?.trim() ||
    (host === "localhost" ? "http" : "https");

  return `${scheme}://${host}:${hostPort}`;
}

/** Ana uygulama kök URL'si (Coolify domain). */
export function getAppPublicUrl(): string | null {
  const value =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;

  return value ? value.replace(/\/$/, "") : null;
}
