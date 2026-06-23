import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getProjectForUser, ProjectAccessError } from "@/lib/project-access";
import { proxySitePreviewRequest } from "@/lib/site-preview-proxy";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string; path?: string[] }>;
}

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { projectId, path } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  try {
    const project = await getProjectForUser(projectId, user.id);

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
