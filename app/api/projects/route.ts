import { NextResponse } from "next/server";

import { getAuthContext, requireSessionUser } from "@/lib/auth";
import { resolveProjectSiteUrl } from "@/lib/project-site-url";
import { listProjectsByUserId } from "@/lib/project-store";

export const runtime = "nodejs";

function statusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Hazır";
    case "installing":
      return "Kuruluyor";
    case "provisioning":
      return "Başlatılıyor";
    case "error":
      return "Hata";
    default:
      return status;
  }
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const projects = await listProjectsByUserId(user.id);
    const context = await getAuthContext();

    return NextResponse.json({
      projects: projects.map((project) => ({
        projectId: project.id,
        slug: project.slug,
        siteTitle: project.siteTitle,
        siteType: project.siteType,
        status: project.status,
        statusLabel: statusLabel(project.status),
        siteUrl: resolveProjectSiteUrl(project),
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
      })),
      projectCount: context?.projectCount ?? projects.length,
      projectLimit: context?.projectLimit ?? 2,
      unlimited: context?.unlimited ?? false,
      canCreateProject: context?.canCreateProject ?? true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : "Projeler yüklenemedi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
