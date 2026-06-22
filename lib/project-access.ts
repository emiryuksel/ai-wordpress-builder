import { getProject, type Project } from "@/lib/project-store";

export class ProjectAccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProjectAccessError";
  }
}

export async function getProjectForUser(
  projectId: string,
  userId: string,
): Promise<Project> {
  const project = await getProject(projectId);

  if (!project) {
    throw new ProjectAccessError("Proje bulunamadı.", 404);
  }

  if (project.userId && project.userId !== userId) {
    throw new ProjectAccessError("Bu projeye erişim yetkiniz yok.", 403);
  }

  return project;
}
