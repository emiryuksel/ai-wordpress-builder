/** Ana uygulama HTTPS üzerinden mi sunuluyor (Coolify APP_URL). */
export function isAppServedOverHttps(appUrl?: string | null): boolean {
  const value =
    appUrl?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";

  return value.startsWith("https://");
}

/**
 * HTTPS builder + HTTP WordPress: tarayıcı iframe içinde karışık içerik engeller.
 * Sunucu tarafında APP_URL ile de belirlenebilir (ilk render'da iframe flash önlenir).
 */
export function needsExternalPreview(
  siteUrl: string,
  options?: { appServedOverHttps?: boolean },
): boolean {
  if (!siteUrl.startsWith("http://")) {
    return false;
  }

  if (typeof window !== "undefined") {
    return window.location.protocol === "https:";
  }

  return options?.appServedOverHttps ?? isAppServedOverHttps();
}
