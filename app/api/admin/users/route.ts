import { NextResponse } from "next/server";

import { AdminAccessError, requireAdminUser } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { listProjects } from "@/lib/project-store";
import { listUsers, toPublicUser } from "@/lib/user-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await requireAdminUser();
    const [users, projects] = await Promise.all([listUsers(), listProjects()]);

    const projectsByUser = new Map<string, typeof projects>();
    for (const project of projects) {
      if (!project.userId) {
        continue;
      }
      const current = projectsByUser.get(project.userId) ?? [];
      current.push(project);
      projectsByUser.set(project.userId, current);
    }

    logActivity({
      action: "admin.view_users",
      user: admin,
      resourceType: "admin",
    });

    return NextResponse.json({
      users: users.map((user) => {
        const userProjects = projectsByUser.get(user.id) ?? [];
        return {
          ...toPublicUser(user),
          projectCount: userProjects.length,
          projects: userProjects
            .sort(
              (left, right) =>
                new Date(right.updatedAt).getTime() -
                new Date(left.updatedAt).getTime(),
            )
            .map((project) => ({
              projectId: project.id,
              siteTitle: project.siteTitle,
              siteType: project.siteType,
              status: project.status,
              slug: project.slug,
              updatedAt: project.updatedAt,
              createdAt: project.createdAt,
            })),
        };
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Üyelik listesi alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
