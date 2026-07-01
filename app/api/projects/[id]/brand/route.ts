import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { applyCorporateBrand } from "@/lib/corporate-content";
import { getProjectForUser, ProjectAccessError } from "@/lib/project-access";
import { applyBrandSlug, resolveProjectSiteUrl } from "@/lib/project-site-url";
import { updateProject } from "@/lib/project-store";
import { isCorporateProject } from "@/lib/site-type";
export const runtime = "nodejs";
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface BrandBody {
  brandName?: string;
  primaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export async function POST(request: Request, context: RouteContext) {
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

  if (!isCorporateProject(project)) {
    return NextResponse.json(
      { error: "Marka ayarları yalnızca kurumsal siteler için geçerlidir." },
      { status: 400 },
    );
  }

  let body: BrandBody;
  try {
    body = (await request.json()) as BrandBody;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const hasBrandInput =
    Boolean(body.brandName?.trim()) ||
    Boolean(body.primaryColor?.trim()) ||
    Boolean(body.headingFont?.trim()) ||
    Boolean(body.bodyFont?.trim());

  if (!hasBrandInput) {
    return NextResponse.json(
      { error: "En az bir marka alanı gerekli." },
      { status: 400 },
    );
  }

  if (project.status !== "ready") {
    let updatedProject = project;
    if (body.brandName?.trim()) {
      updatedProject = await applyBrandSlug(project, body.brandName);
    }

    await updateProject(projectId, {
      pendingBrand: body,
      brandOnboardingComplete: true,
      siteTitle: body.brandName?.trim() || project.siteTitle,
      suggestedPrimaryColor: body.primaryColor || project.suggestedPrimaryColor,
    });

    const latest = await getProjectForUser(projectId, user.id);

    logActivity({
      action: "project.brand.update",
      user,
      resourceType: "project",
      resourceId: projectId,
      metadata: { queued: true },
    });

    return NextResponse.json({
      ok: true,
      queued: true,
      slug: latest.slug,
      siteUrl: resolveProjectSiteUrl(latest),
      reply:
        "Marka tercihleriniz kaydedildi. Site kurulumu tamamlanınca otomatik uygulanacak.",
    });
  }

  try {
    let updatedProject = project;
    if (body.brandName?.trim()) {
      updatedProject = await applyBrandSlug(project, body.brandName);
    }

    const messages = await applyCorporateBrand(projectId, body);
    await updateProject(projectId, {
      pendingBrand: undefined,
      brandOnboardingComplete: true,
      siteTitle: body.brandName?.trim() || updatedProject.siteTitle,
      suggestedPrimaryColor: body.primaryColor || updatedProject.suggestedPrimaryColor,
    });

    const latest = await getProjectForUser(projectId, user.id);

    logActivity({
      action: "project.brand.update",
      user,
      resourceType: "project",
      resourceId: projectId,
      metadata: { queued: false },
    });

    return NextResponse.json({
      ok: true,
      queued: false,
      slug: latest.slug,
      siteUrl: resolveProjectSiteUrl(latest),
      messages,
      reply: messages.join(" "),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Marka ayarları uygulanamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
