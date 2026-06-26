import { NextRequest, NextResponse } from "next/server";

import { getProjectBySlug } from "@/lib/project-store";
import { isReservedSlug } from "@/lib/slug";
import { proxySitePreviewRequest } from "@/lib/site-preview-proxy";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ slug: string; path?: string[] }>;
}

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { slug, path } = await context.params;
  const normalizedSlug = slug.trim().toLowerCase();

  if (isReservedSlug(normalizedSlug)) {
    return NextResponse.json({ error: "Sayfa bulunamadı." }, { status: 404 });
  }

  const project = await getProjectBySlug(normalizedSlug);
  if (!project) {
    return NextResponse.json({ error: "Site bulunamadı." }, { status: 404 });
  }

  if (project.status !== "ready") {
    return NextResponse.json(
      { error: "Site henüz hazır değil." },
      { status: 409 },
    );
  }

  return proxySitePreviewRequest(request, project, path ?? [], {
    mode: "public",
  });
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
