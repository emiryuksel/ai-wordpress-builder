import { execWpCli } from "@/lib/docker-manager";
import { buildProjectPublicUrl } from "@/lib/public-url";
import { allocateUniqueSlug, slugifyBrandName } from "@/lib/project-slug-store";
import { updateProject, type Project } from "@/lib/project-store";

/** Ortam + slug üzerinden güncel public site URL'si. */
export function resolveProjectSiteUrl(
  project: Pick<Project, "slug" | "hostPort" | "siteTitle">,
): string {
  if (project.slug) {
    return buildProjectPublicUrl(project.slug);
  }

  return buildProjectPublicUrl(slugifyBrandName(project.siteTitle) || "site");
}

/** Eksik slug varsa üretir ve kaydeder. */
export async function ensureProjectSlug(project: Project): Promise<Project> {
  if (project.slug) {
    return project;
  }

  const slug = await allocateUniqueSlug(project.siteTitle);
  const updated = await updateProject(project.id, { slug });
  return updated ?? { ...project, slug };
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
    void syncWordPressSiteUrl(result.id, canonical);
  }

  return result;
}

export async function syncWordPressSiteUrl(
  projectId: string,
  siteUrl: string,
): Promise<void> {
  const normalized = siteUrl.replace(/\/$/, "");

  try {
    const current = (await execWpCli(projectId, ["option", "get", "siteurl"]))
      .trim()
      .replace(/\/$/, "");

    if (current === normalized) {
      return;
    }

    await execWpCli(projectId, ["option", "update", "siteurl", normalized]);
    await execWpCli(projectId, ["option", "update", "home", normalized]);
  } catch {
    // WP henüz hazır değil veya container erişilemiyor.
  }
}
