/** Coolify bazen env değerlerinin başına '=' ekler — temizle. */
function sanitizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().replace(/^=+/, "");
  return trimmed || undefined;
}

/** Ana uygulama kök URL'si (Coolify domain). */
export function getAppPublicUrl(): string | null {
  const value =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;

  return value ? value.replace(/\/$/, "") : null;
}

/** Site slug'ları için public origin (ör. https://wp.withsolver.com). */
export function getSitePublicOrigin(): string {
  const configured = getAppPublicUrl();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://wp.withsolver.com";
  }

  const port = sanitizeEnvValue(process.env.PORT) ?? "3100";
  return `http://localhost:${port}`;
}

/** Production-ready public site URL: {origin}/{slug} */
export function buildProjectPublicUrl(slug: string): string {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return `${getSitePublicOrigin()}/${normalized}`;
}

/**
 * Container içinden WP'ye erişim (health check, docker upstream).
 * Port tabanlı internal URL — public slug URL'sinden farklıdır.
 */
export function buildWordPressInternalUrl(hostPort: number): string {
  const host = sanitizeEnvValue(process.env.WORDPRESS_PUBLIC_HOST) || "localhost";
  const rawScheme = sanitizeEnvValue(process.env.WORDPRESS_URL_SCHEME);
  const scheme =
    rawScheme?.replace(/:$/, "") ||
    (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
      ? "http"
      : "https");

  return `${scheme}://${host}:${hostPort}`;
}

/** @deprecated buildProjectPublicUrl(slug) kullanın. Geriye dönük uyumluluk. */
export function buildWordPressSiteUrl(hostPort: number): string {
  return buildWordPressInternalUrl(hostPort);
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

/**
 * Container içinden WordPress'e proxy istekleri için host sırası.
 * Yerel docker portları, dış IP'den önce denenir (hairpin/NAT 404 önlenir).
 */
export function getWordPressUpstreamHosts(): string[] {
  const hosts = getWordPressReachabilityHosts();
  const preferred = ["127.0.0.1", "host.docker.internal"];
  const ordered = [
    ...preferred.filter((host) => hosts.includes(host)),
    ...hosts.filter((host) => !preferred.includes(host)),
  ];
  return [...new Set(ordered)];
}
