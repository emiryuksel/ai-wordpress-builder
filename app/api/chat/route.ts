import { NextResponse } from "next/server";

import { parseChatAction } from "@/lib/gemini-client";
import { getProject, updateProject } from "@/lib/project-store";
import {
  applyChatAction,
  formatChatError,
  getUnsupportedMessage,
} from "@/lib/wp-cli";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      message?: string;
    };

    const projectId = body.projectId?.trim();
    const message = body.message?.trim();

    if (!projectId || !message) {
      return NextResponse.json(
        { error: "projectId ve message alanları gerekli." },
        { status: 400 },
      );
    }

    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
    }

    if (project.status !== "ready") {
      return NextResponse.json(
        {
          error: "Site henüz hazır değil. Lütfen kurulumun bitmesini bekleyin.",
        },
        { status: 409 },
      );
    }

    const action = await parseChatAction(message);

    if (action.actionType === "unsupported") {
      return NextResponse.json({
        success: true,
        applied: false,
        reply: getUnsupportedMessage(),
      });
    }

    const resultMessage = await applyChatAction(projectId, action);

    if (action.actionType === "change_site_title" && action.value.trim()) {
      await updateProject(projectId, { siteTitle: action.value.trim() });
    }

    return NextResponse.json({
      success: true,
      applied: true,
      reply: `Tamamlandı! ${resultMessage} Önizleme güncelleniyor.`,
      action,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unsupported") {
      return NextResponse.json({
        success: true,
        applied: false,
        reply: getUnsupportedMessage(),
      });
    }

    const errorMessage = formatChatError(error);

    return NextResponse.json(
      {
        success: false,
        applied: false,
        error: errorMessage,
        reply: errorMessage,
      },
      { status: 200 },
    );
  }
}
