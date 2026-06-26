import { execWpCli } from "@/lib/docker-manager";
import {
  buildProjectPublicUrl,
  getWordPressContainerSiteUrl,
} from "@/lib/public-url";
import {
  allocateUniqueSlugFromBrand,
  buildInitialProjectSlug,
} from "@/lib/project-slug-store";
import { updateProject, type Project } from "@/lib/project-store";

/** Ortam + slug üzerinden güncel public site URL'si. */
export function resolveProjectSiteUrl(
  project: Pick<Project, "slug" | "id">,
): string {
  const slug = project.slug ?? buildInitialProjectSlug(project.id);
  return buildProjectPublicUrl(slug);
}

/** Eksik slug varsa proje ID'si ile oluşturur. */
export async function ensureProjectSlug(project: Project): Promise<Project> {
  if (project.slug) {
    return project;
  }

  const slug = buildInitialProjectSlug(project.id);
  const siteUrl = buildProjectPublicUrl(slug);
  const updated = await updateProject(project.id, { slug, siteUrl });
  return updated ?? { ...project, slug, siteUrl };
}

/** Marka adına göre slug ve site URL'sini günceller. */
export async function applyBrandSlug(
  project: Project,
  brandName: string,
): Promise<Project> {
  const trimmed = brandName.trim();
  if (!trimmed) {
    return project;
  }

  const newSlug = await allocateUniqueSlugFromBrand(trimmed, project.slug);
  const siteUrl = buildProjectPublicUrl(newSlug);

  if (newSlug === project.slug && project.siteUrl === siteUrl) {
    return project;
  }

  const updated = await updateProject(project.id, { slug: newSlug, siteUrl });
  return updated ?? { ...project, slug: newSlug, siteUrl };
}

/** projects.json slug/siteUrl ve WordPress siteurl/home değerlerini eşitle. */
export async function ensureProjectSiteUrl(project: Project): Promise<Project> {
  const withSlug = await ensureProjectSlug(project);
  const canonical = resolveProjectSiteUrl(withSlug);
  let result = withSlug;

  if (withSlug.siteUrl !== canonical) {
    const updated = await updateProject(withSlug.id, { siteUrl: canonical });
    result = updated ?? { ...withSlug, siteUrl: canonical };
  }

  if (result.status === "ready") {
    void syncWordPressSiteUrl(result);
  }

  return result;
}

/** WordPress siteurl/home değerlerini internal URL ile eşitle (public slug ayrı kalır). */
export async function syncWordPressSiteUrl(
  project: Pick<Project, "id" | "hostPort">,
): Promise<void> {
  const normalized = getWordPressContainerSiteUrl().replace(/\/$/, "");

  try {
    const current = (await execWpCli(project.id, ["option", "get", "siteurl"]))
      .trim()
      .replace(/\/$/, "");

    if (current === normalized) {
      return;
    }

    await execWpCli(project.id, ["option", "update", "siteurl", normalized]);
    await execWpCli(project.id, ["option", "update", "home", normalized]);
  } catch {
    // WP henüz hazır değil veya container erişilemiyor.
  }
}
