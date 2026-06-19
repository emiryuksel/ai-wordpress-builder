import { NextResponse } from "next/server";

import { getProject } from "@/lib/project-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({
    projectId: project.id,
    siteTitle: project.siteTitle,
    siteType: project.siteType,
    siteUrl: project.siteUrl,
    hostPort: project.hostPort,
    status: project.status,
    suggestedPrimaryColor: project.suggestedPrimaryColor,
    suggestedTheme: project.suggestedTheme,
  });
}
