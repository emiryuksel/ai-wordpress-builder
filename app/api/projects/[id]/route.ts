import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { removeProject } from "@/lib/docker-manager";
import { getProjectForUser, ProjectAccessError } from "@/lib/project-access";
import { ensureProjectSiteUrl } from "@/lib/project-site-url";
import { cancelProjectOperations } from "@/lib/provisioning";
import { deleteProject } from "@/lib/project-store";
import { isCorporateProject } from "@/lib/site-type";
import { getWordPressAccessForProject } from "@/lib/wordpress-access";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  try {
    const project = await ensureProjectSiteUrl(
      await getProjectForUser(id, user.id),
    );
    const wordpressAccess = await getWordPressAccessForProject(project);

    return NextResponse.json({
      projectId: project.id,
      slug: project.slug,
      siteTitle: project.siteTitle,
      siteType: project.siteType,
      siteUrl: project.siteUrl,
      hostPort: project.hostPort,
      status: project.status,
      suggestedPrimaryColor: project.suggestedPrimaryColor,
      suggestedTheme: project.suggestedTheme,
      suggestedPlugins: project.suggestedPlugins,
      prompt: project.prompt,
      isCorporate: isCorporateProject(project),
      brandOnboardingComplete: Boolean(project.brandOnboardingComplete),
      wordpressAccess,
    });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Proje bilgisi alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  let confirmTitle: string | undefined;
  try {
    const body = (await request.json()) as { confirmTitle?: string };
    confirmTitle = body.confirmTitle?.trim();
  } catch {
    return NextResponse.json(
      { error: "Onay için proje adı gerekli." },
      { status: 400 },
    );
  }

  if (!confirmTitle) {
    return NextResponse.json(
      { error: "Onay için proje adı gerekli." },
      { status: 400 },
    );
  }

  try {
    const project = await getProjectForUser(id, user.id);

    if (confirmTitle !== project.siteTitle) {
      return NextResponse.json(
        { error: "Proje adı eşleşmiyor." },
        { status: 400 },
      );
    }

    cancelProjectOperations(id);
    await removeProject(id);
    await deleteProject(id);

    logActivity({
      action: "project.delete",
      user,
      resourceType: "project",
      resourceId: id,
      metadata: {
        siteTitle: project.siteTitle,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Proje silinemedi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
