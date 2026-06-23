/** Coolify bazen env değerlerinin başına '=' ekler — temizle. */
function sanitizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().replace(/^=+/, "");
  return trimmed || undefined;
}

/** WordPress önizleme / site URL'si (production'da public host kullanılır). */
export function buildWordPressSiteUrl(hostPort: number): string {
  const host = sanitizeEnvValue(process.env.WORDPRESS_PUBLIC_HOST) || "localhost";
  const rawScheme = sanitizeEnvValue(process.env.WORDPRESS_URL_SCHEME);
  const scheme =
    rawScheme?.replace(/:$/, "") ||
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
  const explicit = sanitizeEnvValue(process.env.WORDPRESS_REACHABILITY_HOST);
  const publicHost = sanitizeEnvValue(process.env.WORDPRESS_PUBLIC_HOST);

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
