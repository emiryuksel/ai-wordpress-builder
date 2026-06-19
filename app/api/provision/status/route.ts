import { NextResponse } from "next/server";

import { isWordPressReachable } from "@/lib/docker-manager";
import { getProject } from "@/lib/project-store";
import {
  getStatusMessage,
  isProvisioningActive,
  resumeProvisioning,
} from "@/lib/provisioning";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim();
  const elapsedSeconds = Number.parseInt(
    searchParams.get("elapsed") ?? "0",
    10,
  );

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId parametresi gerekli." },
      { status: 400 },
    );
  }

  const project = await getProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
  }

  const elapsedSinceUpdate =
    Date.now() - new Date(project.updatedAt).getTime();

  if (
    (project.status === "provisioning" || project.status === "installing") &&
    !isProvisioningActive(projectId) &&
    elapsedSinceUpdate > 3000
  ) {
    void resumeProvisioning(projectId);
  }

  const reachable = await isWordPressReachable(project.hostPort);
  const ready = project.status === "ready" && reachable;

  return NextResponse.json({
    projectId: project.id,
    status: project.status,
    hostPort: project.hostPort,
    siteUrl: project.siteUrl,
    ready,
    reachable,
    message: getStatusMessage(
      project.status,
      elapsedSeconds,
      project.siteType,
      project.suggestedPlugins,
      project.prompt,
    ),
    error: project.error ?? null,
  });
}
