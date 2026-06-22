import fs from "node:fs/promises";
import path from "node:path";

import type { Project } from "@/lib/project-store";
import type { WordPressAccessInfo } from "@/lib/support";

const RUNTIME_ROOT = path.join(process.cwd(), "data", "runtime");

function parseSiteConfigValue(content: string, key: string): string | null {
  const pattern = new RegExp(`^${key}="((?:[^"\\\\]|\\\\.)*)"$`, "m");
  const match = content.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  return match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

export async function readWordPressCredentials(
  projectId: string,
  fallbackSiteUrl = "",
): Promise<WordPressAccessInfo | null> {
  const configPath = path.join(RUNTIME_ROOT, projectId, "wp-init", "site.config");

  try {
    const content = await fs.readFile(configPath, "utf8");
    const adminUser = parseSiteConfigValue(content, "ADMIN_USER") ?? "admin";
    const adminPassword = parseSiteConfigValue(content, "ADMIN_PASSWORD");
    const siteUrl = (
      parseSiteConfigValue(content, "SITE_URL") ?? fallbackSiteUrl
    ).replace(/\/$/, "");

    if (!adminPassword || !siteUrl) {
      return null;
    }

    return {
      siteUrl,
      adminUrl: `${siteUrl}/wp-admin`,
      adminUser,
      adminPassword,
    };
  } catch {
    return null;
  }
}

export async function getWordPressAccessForProject(
  project: Project,
): Promise<WordPressAccessInfo | null> {
  if (project.status !== "ready") {
    return null;
  }

  if (project.wpAdminUser && project.wpAdminPassword) {
    const siteUrl = project.siteUrl.replace(/\/$/, "");
    return {
      siteUrl,
      adminUrl: `${siteUrl}/wp-admin`,
      adminUser: project.wpAdminUser,
      adminPassword: project.wpAdminPassword,
    };
  }

  return readWordPressCredentials(project.id, project.siteUrl);
}

export async function persistWordPressCredentials(
  projectId: string,
  siteUrl: string,
): Promise<WordPressAccessInfo | null> {
  const access = await readWordPressCredentials(projectId, siteUrl);
  if (!access) {
    return null;
  }

  const { updateProject } = await import("@/lib/project-store");
  await updateProject(projectId, {
    wpAdminUser: access.adminUser,
    wpAdminPassword: access.adminPassword,
  });

  return access;
}
