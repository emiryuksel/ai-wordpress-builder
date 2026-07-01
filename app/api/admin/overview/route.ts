import { NextResponse } from "next/server";

import { AdminAccessError, requireAdminUser } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { countActivityLogs, listActivityLogs } from "@/lib/activity-log-store";
import { listProjects } from "@/lib/project-store";
import { listUsers, toPublicUser } from "@/lib/user-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await requireAdminUser();
    const [users, projects, logs] = await Promise.all([
      listUsers(),
      listProjects(),
      countActivityLogs(),
    ]);

    const projectCountByUser = new Map<string, number>();
    for (const project of projects) {
      if (!project.userId) {
        continue;
      }
      projectCountByUser.set(
        project.userId,
        (projectCountByUser.get(project.userId) ?? 0) + 1,
      );
    }

    const readyProjects = projects.filter((project) => project.status === "ready").length;
    const provisioningProjects = projects.filter(
      (project) => project.status === "provisioning" || project.status === "installing",
    ).length;
    const errorProjects = projects.filter((project) => project.status === "error").length;

    logActivity({
      action: "admin.view_overview",
      user: admin,
      resourceType: "admin",
    });

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        adminUsers: users.filter((user) => user.role === "admin").length,
        totalProjects: projects.length,
        readyProjects,
        provisioningProjects,
        errorProjects,
        totalLogs: logs,
      },
      recentUsers: users.slice(0, 5).map((user) => ({
        ...toPublicUser(user),
        projectCount: projectCountByUser.get(user.id) ?? 0,
      })),
      recentActivity: (await listActivityLogs({ limit: 8 })).map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        userEmail: entry.userEmail,
        userName: entry.userName,
        resourceId: entry.resourceId,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Admin özeti alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
