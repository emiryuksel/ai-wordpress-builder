import fs from "node:fs/promises";
import path from "node:path";

import { getDataRoot } from "@/lib/data-paths";

export type ProjectStatus = "provisioning" | "installing" | "ready" | "error";

export interface PendingBrand {
  brandName?: string;
  primaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export interface Project {
  id: string;
  userId?: string;
  slug?: string;
  prompt: string;
  siteType: string;
  siteTitle: string;
  suggestedTheme: string;
  suggestedPlugins: string[];
  suggestedPrimaryColor: string;
  hostPort: number;
  siteUrl: string;
  status: ProjectStatus;
  wpAdminUser?: string;
  wpAdminPassword?: string;
  pendingBrand?: PendingBrand;
  brandOnboardingComplete?: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStoreData {
  projects: Project[];
}

const DATA_DIR = getDataRoot();
const STORE_PATH = path.join(DATA_DIR, "projects.json");

async function ensureStore(): Promise<ProjectStoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as ProjectStoreData;
  } catch {
    const initial: ProjectStoreData = { projects: [] };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function writeStore(data: ProjectStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function createProject(
  project: Omit<Project, "createdAt" | "updatedAt">,
): Promise<Project> {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const record: Project = {
    ...project,
    createdAt: now,
    updatedAt: now,
  };

  store.projects.push(record);
  await writeStore(store);
  return record;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const store = await ensureStore();
  return store.projects.find((project) => project.id === projectId) ?? null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const normalized = slug.trim().toLowerCase();
  const store = await ensureStore();
  return (
    store.projects.find(
      (project) => project.slug?.toLowerCase() === normalized,
    ) ?? null
  );
}

export async function updateProject(
  projectId: string,
  patch: Partial<
    Pick<
      Project,
      | "status"
      | "error"
      | "hostPort"
      | "siteUrl"
      | "slug"
      | "siteTitle"
      | "suggestedPrimaryColor"
      | "pendingBrand"
      | "brandOnboardingComplete"
      | "wpAdminUser"
      | "wpAdminPassword"
    >
  >,
): Promise<Project | null> {
  const store = await ensureStore();
  const index = store.projects.findIndex((project) => project.id === projectId);

  if (index === -1) {
    return null;
  }

  const updated: Project = {
    ...store.projects[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  store.projects[index] = updated;
  await writeStore(store);
  return updated;
}

export async function listProjects(): Promise<Project[]> {
  const store = await ensureStore();
  return store.projects;
}

export async function listProjectsByUserId(userId: string): Promise<Project[]> {
  const store = await ensureStore();
  return store.projects
    .filter((project) => project.userId === userId)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
}

export async function countProjectsByUserId(userId: string): Promise<number> {
  const store = await ensureStore();
  return store.projects.filter((project) => project.userId === userId).length;
}
