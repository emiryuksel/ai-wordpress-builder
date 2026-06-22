import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { isBlogProject, repairBlogSite } from "@/lib/blog-content";
import { isCorporateProject, repairCorporateSite } from "@/lib/corporate-content";
import { getProjectForUser, ProjectAccessError } from "@/lib/project-access";
import { isEcommerceProject } from "@/lib/site-type";
import { repairEcommerceSite } from "@/lib/wp-cli";
export const runtime = "nodejs";
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  let project;
  try {
    project = await getProjectForUser(projectId, user.id);
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  if (project.status !== "ready") {
    return NextResponse.json(
      { error: "Site henüz hazır değil." },
      { status: 409 },
    );
  }

  try {
    if (isBlogProject(project)) {
      void repairBlogSite(
        projectId,
        project.suggestedPrimaryColor,
        project.prompt,
      );

      return NextResponse.json({
        ok: true,
        message: "Blog onarımı arka planda başlatıldı.",
      });
    }

    if (isCorporateProject(project)) {
      void repairCorporateSite(
        projectId,
        project.suggestedPrimaryColor,
        project.prompt,
        project.siteTitle,
      );

      return NextResponse.json({
        ok: true,
        message: "Site onarımı arka planda başlatıldı.",
      });
    }

    if (isEcommerceProject(project)) {
      void repairEcommerceSite(
        projectId,
        project.prompt,
        project.suggestedPrimaryColor,
      );

      return NextResponse.json({
        ok: true,
        message: "Mağaza onarımı arka planda başlatıldı.",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Onarım gerekmedi.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onarım başlatılamadı.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
