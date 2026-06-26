import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getProjectForUser, ProjectAccessError } from "@/lib/project-access";
import { createPreviewAccessToken } from "@/lib/preview-access";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  try {
    await getProjectForUser(projectId, user.id);
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  return NextResponse.json({
    token: createPreviewAccessToken(projectId, user.id),
  });
}
