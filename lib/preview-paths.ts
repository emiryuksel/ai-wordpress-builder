/** Client-safe preview path helpers (no server / Docker imports). */

export function buildSitePublicPath(
  slug: string,
  cacheBuster?: number,
): string {
  const suffix = cacheBuster ? `?_preview=${cacheBuster}` : "";
  return `/${slug}${suffix}`;
}

export function buildSitePreviewPath(
  projectId: string,
  cacheBuster?: number,
  accessToken?: string,
): string {
  const params = new URLSearchParams();
  if (cacheBuster) {
    params.set("_preview", String(cacheBuster));
  }
  if (accessToken) {
    params.set("_pt", accessToken);
  }
  const query = params.toString();
  return `/site-preview/${projectId}${query ? `?${query}` : ""}`;
}
