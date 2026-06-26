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
): string {
  const suffix = cacheBuster ? `?_preview=${cacheBuster}` : "";
  return `/site-preview/${projectId}${suffix}`;
}
