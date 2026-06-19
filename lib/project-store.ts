import fs from "node:fs/promises";
import path from "node:path";

export type ProjectStatus = "provisioning" | "installing" | "ready" | "error";

export interface Project {
  id: string;
  prompt: string;
  siteType: string;
  siteTitle: string;
  suggestedTheme: string;
  suggestedPlugins: string[];
  suggestedPrimaryColor: string;
  hostPort: number;
  siteUrl: string;
  status: ProjectStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStoreData {
  projects: Project[];
}

const DATA_DIR = path.join(process.cwd(), "data");
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

export async function updateProject(
  projectId: string,
  patch: Partial<
    Pick<Project, "status" | "error" | "hostPort" | "siteUrl" | "siteTitle">
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
