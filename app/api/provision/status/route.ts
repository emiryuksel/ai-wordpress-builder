import { NextResponse } from "next/server";

import { isWordPressReachable } from "@/lib/docker-manager";
import { ensureProjectSiteUrl, resolveProjectSiteUrl } from "@/lib/project-site-url";
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

  const reachable = await isWordPressReachable(project.hostPort, projectId);
  const ready = project.status === "ready" && reachable;
  const resolvedProject =
    ready && reachable ? await ensureProjectSiteUrl(project) : project;

  return NextResponse.json({
    projectId: resolvedProject.id,
    slug: resolvedProject.slug,
    status: resolvedProject.status,
    hostPort: resolvedProject.hostPort,
    siteUrl: resolveProjectSiteUrl(resolvedProject),
    ready,
    reachable,
    message: getStatusMessage(
      resolvedProject.status,
      elapsedSeconds,
      resolvedProject.siteType,
      resolvedProject.suggestedPlugins,
      resolvedProject.prompt,
    ),
    error: resolvedProject.error ?? null,
  });
}
