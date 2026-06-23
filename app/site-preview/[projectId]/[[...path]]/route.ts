import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { WP_PREVIEW_COOKIE } from "@/lib/preview-constants";
import { getProjectForUser, ProjectAccessError } from "@/lib/project-access";
import { getProject } from "@/lib/project-store";
import {
  isPreviewAssetPath,
  proxySitePreviewRequest,
} from "@/lib/site-preview-proxy";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string; path?: string[] }>;
}

async function resolveProject(
  projectId: string,
  path: string[] | undefined,
) {
  const user = await getSessionUser();
  if (user) {
    return getProjectForUser(projectId, user.id);
  }

  const isAsset = isPreviewAssetPath(path);
  const previewCookie = (await cookies()).get(WP_PREVIEW_COOKIE)?.value;

  if (isAsset && previewCookie === projectId) {
    const project = await getProject(projectId);
    if (!project) {
      throw new ProjectAccessError("Proje bulunamadı.", 404);
    }
    return project;
  }

  return null;
}

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { projectId, path } = await context.params;

  try {
    const project = await resolveProject(projectId, path);

    if (!project) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    if (project.status !== "ready") {
      return NextResponse.json(
        { error: "Site henüz hazır değil." },
        { status: 409 },
      );
    }

    return proxySitePreviewRequest(request, project, path ?? []);
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Önizleme yüklenemedi." }, { status: 500 });
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
