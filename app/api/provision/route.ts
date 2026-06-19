import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { findFreePort } from "@/lib/docker-manager";
import { parseAndSanitizeProvisionIntent } from "@/lib/gemini-client";
import { createProject } from "@/lib/project-store";
import { startFullProvisioning } from "@/lib/provisioning";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
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
    const siteUrl = `http://localhost:${hostPort}`;

    const project = await createProject({
      id: projectId,
      prompt,
      siteType: intent.siteType,
      siteTitle: intent.siteTitle,
      suggestedTheme: intent.suggestedTheme,
      suggestedPlugins: intent.suggestedPlugins,
      suggestedPrimaryColor: intent.suggestedPrimaryColor,
      hostPort,
      siteUrl,
      status: "provisioning",
    });

    void startFullProvisioning(projectId, {
      siteType: intent.siteType,
      suggestedTheme: intent.suggestedTheme,
      suggestedPlugins: intent.suggestedPlugins,
      siteTitle: intent.siteTitle,
      hostPort,
      userPrompt: prompt,
    });

    return NextResponse.json({
      projectId: project.id,
      hostPort: project.hostPort,
      siteUrl: project.siteUrl,
      status: project.status,
      siteType: project.siteType,
      siteTitle: project.siteTitle,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kurulum başlatılamadı.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
