import { execWpCli } from "@/lib/docker-manager";
import { buildWordPressSiteUrl } from "@/lib/public-url";
import { updateProject, type Project } from "@/lib/project-store";

/** Ortam değişkenlerinden güncel WordPress site URL'si (hostPort kaynak). */
export function resolveProjectSiteUrl(
  project: Pick<Project, "hostPort">,
): string {
  return buildWordPressSiteUrl(project.hostPort);
}

/** projects.json ve WordPress siteurl/home değerlerini ortamla eşitle. */
export async function ensureProjectSiteUrl(project: Project): Promise<Project> {
  const canonical = resolveProjectSiteUrl(project);

  if (project.siteUrl === canonical) {
    return project;
  }

  const updated = await updateProject(project.id, { siteUrl: canonical });
  const result = updated ?? { ...project, siteUrl: canonical };

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
