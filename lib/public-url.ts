/** WordPress önizleme / site URL'si (production'da public host kullanılır). */
export function buildWordPressSiteUrl(hostPort: number): string {
  const host = process.env.WORDPRESS_PUBLIC_HOST?.trim() || "localhost";
  const scheme =
    process.env.WORDPRESS_URL_SCHEME?.trim() ||
    (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
      ? "http"
      : "https");

  return `${scheme}://${host}:${hostPort}`;
}

/**
 * Coolify gibi ortamlarda uygulama container içinde çalışır; WP stack'leri host'ta
 * port yayınlar. Sağlık kontrolü için denenecek host sırası.
 */
export function getWordPressReachabilityHosts(): string[] {
  const hosts: string[] = [];
  const explicit = process.env.WORDPRESS_REACHABILITY_HOST?.trim();
  const publicHost = process.env.WORDPRESS_PUBLIC_HOST?.trim();

  if (explicit) {
    hosts.push(explicit);
  }
  if (publicHost && publicHost !== "localhost") {
    hosts.push(publicHost);
  }
  hosts.push("host.docker.internal", "127.0.0.1");

  return [...new Set(hosts)];
}

/** Ana uygulama kök URL'si (Coolify domain). */
export function getAppPublicUrl(): string | null {
  const value =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;

  return value ? value.replace(/\/$/, "") : null;
}
