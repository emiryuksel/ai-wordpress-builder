import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { requireSessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { findFreePort } from "@/lib/docker-manager";
import { parseAndSanitizeProvisionIntent } from "@/lib/gemini-client";
import { buildProjectPublicUrl } from "@/lib/public-url";
import { buildInitialProjectSlug } from "@/lib/slug";
import { canUserCreateProject, getProjectLimit, getProjectLimitForUser } from "@/lib/plans";
import { countProjectsByUserId, createProject } from "@/lib/project-store";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Taslak (draft) proje oluşturur. Provisioning HENÜZ başlatılmaz — kullanıcı
 * builder'da marka kartından tema ve marka tercihlerini seçip gönderdiğinde
 * (`/api/projects/[id]/brand`) kurulum tetiklenir. Böylece seçilen tema, sitenin
 * ilk inşasına baştan dahil olur.
 */
export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const projectCount = await countProjectsByUserId(user.id);
    const projectLimit = getProjectLimitForUser(user);
    const unlimited = projectLimit === null;

    if (!canUserCreateProject(user, projectCount)) {
      const limit = projectLimit ?? getProjectLimit(user.plan);
      return NextResponse.json(
        {
          error: `Site limitine ulaştınız (${limit}). Ücretsiz planda en fazla ${getProjectLimit("free")} site oluşturabilirsiniz.`,
          projectCount,
          projectLimit: limit,
          limitReached: true,
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Lütfen ne tür bir site istediğinizi yazın." },
        { status: 400 },
      );
    }

    const intent = await parseAndSanitizeProvisionIntent(prompt);
    const projectId = uuidv4();
    const hostPort = await findFreePort();
    const slug = buildInitialProjectSlug(projectId);
    const siteUrl = buildProjectPublicUrl(slug);

    const project = await createProject({
      id: projectId,
      userId: user.id,
      slug,
      prompt,
      siteType: intent.siteType,
      siteTitle: intent.siteTitle,
      suggestedTheme: intent.suggestedTheme,
      suggestedPlugins: intent.suggestedPlugins,
      suggestedPrimaryColor: intent.suggestedPrimaryColor,
      hostPort,
      siteUrl,
      status: "draft",
    });

    logActivity({
      action: "project.create",
      user,
      resourceType: "project",
      resourceId: project.id,
      metadata: {
        siteTitle: project.siteTitle,
        siteType: project.siteType,
        draft: true,
      },
    });

    return NextResponse.json({
      projectId: project.id,
      slug: project.slug,
      hostPort: project.hostPort,
      siteUrl: project.siteUrl,
      status: project.status,
      siteType: project.siteType,
      siteTitle: project.siteTitle,
      projectCount: projectCount + 1,
      projectLimit: projectLimit ?? 0,
      unlimited,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "Devam etmek için giriş yapın veya hesap oluşturun.", authRequired: true },
        { status: 401 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Taslak oluşturulamadı.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
