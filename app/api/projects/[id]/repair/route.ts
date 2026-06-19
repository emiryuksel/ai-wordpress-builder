import { NextResponse } from "next/server";

import { isBlogProject, repairBlogSite } from "@/lib/blog-content";
import { getProject } from "@/lib/project-store";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;
  const project = await getProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
  }

  if (project.status !== "ready") {
    return NextResponse.json(
      { error: "Site henüz hazır değil." },
      { status: 409 },
    );
  }

  if (!isBlogProject(project)) {
    return NextResponse.json(
      { error: "Bu işlem yalnızca blog siteleri için geçerlidir." },
      { status: 400 },
    );
  }

  try {
    void repairBlogSite(
      projectId,
      project.suggestedPrimaryColor,
      project.prompt,
    );

    return NextResponse.json({
      ok: true,
      message: "Blog onarımı arka planda başlatıldı.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onarım başlatılamadı.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
