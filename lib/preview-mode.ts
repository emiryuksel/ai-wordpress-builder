/** HTTPS builder + HTTP WordPress: tarayıcı iframe içinde karışık içerik engeller. */
export function needsExternalPreview(siteUrl: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.protocol === "https:" && siteUrl.startsWith("http://")
  );
}
