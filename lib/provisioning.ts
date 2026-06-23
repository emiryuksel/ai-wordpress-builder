import fs from "node:fs/promises";
import path from "node:path";

import {
  isWordPressReachable,
  isWordPressInstalled,
  provisionProject,
  runProjectSetup,
  type ProjectRuntimeConfig,
} from "@/lib/docker-manager";
import {
  applyPendingCorporateBrand,
  isCorporateProject,
  repairCorporateSite,
  runCorporateImageEnrichment,
  setupCorporateContent,
} from "@/lib/corporate-content";
import { getProject, updateProject } from "@/lib/project-store";
import { isEcommerceProject } from "@/lib/site-type";
import { persistWordPressCredentials } from "@/lib/wordpress-access";
import { applyChatAction, applyAstraBlogChrome, enrichEcommerceProductImages, isWooCommerceActive, repairEcommerceSite } from "@/lib/wp-cli";
import {
  ensureMissingBlogAiImages,
  enrichBlogAiImages,
  isBlogProject,
  setupBlogContent,
} from "@/lib/blog-content";

const setupInProgress = new Set<string>();
const provisioningInProgress = new Set<string>();
const enrichmentInProgress = new Set<string>();

const RUNTIME_ROOT = path.join(process.cwd(), "data", "runtime");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSetupInProgress(projectId: string): boolean {
  return setupInProgress.has(projectId);
}

export function isProvisioningActive(projectId: string): boolean {
  return provisioningInProgress.has(projectId) || setupInProgress.has(projectId);
}

async function composeFileExists(projectId: string): Promise<boolean> {
  try {
    await fs.access(path.join(RUNTIME_ROOT, projectId, "docker-compose.yml"));
    return true;
  } catch {
    return false;
  }
}

function projectToRuntimeConfig(project: {
  siteType: string;
  suggestedTheme: string;
  suggestedPlugins: string[];
  siteTitle: string;
  hostPort: number;
  prompt: string;
}): ProjectRuntimeConfig {
  return {
    siteType: project.siteType,
    suggestedTheme: project.suggestedTheme,
    suggestedPlugins: project.suggestedPlugins,
    siteTitle: project.siteTitle,
    hostPort: project.hostPort,
    userPrompt: project.prompt,
  };
}

export function formatProvisioningError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Kurulum sırasında bilinmeyen hata.";
  }

  const message = error.message;

  if (message.includes("zaman aşımı") || message.includes("ETIMEDOUT")) {
    return "Kurulum zaman aşımına uğradı. Docker Desktop açıkken sayfayı yenileyin — kurulum kaldığı yerden devam eder.";
  }

  if (message.startsWith("Command failed:")) {
    if (message.toLowerCase().includes("woocommerce")) {
      return "WooCommerce indirmesi yavaş olabilir. Sayfayı yenileyin; kurulum arka planda devam edecektir.";
    }
    return "WordPress kurulumu tamamlanamadı. Sayfayı yenileyip tekrar deneyin.";
  }

  if (message.length > 200) {
    return "WordPress kurulumu tamamlanamadı. Sayfayı yenileyip tekrar deneyin.";
  }

  return message;
}

async function enrichProjectInBackground(
  projectId: string,
  project: {
    prompt: string;
    suggestedPrimaryColor: string;
    siteType: string;
    suggestedPlugins: string[];
  },
): Promise<void> {
  if (enrichmentInProgress.has(projectId)) {
    return;
  }

  enrichmentInProgress.add(projectId);

  try {
    if (isBlogProject(project)) {
      await applyAstraBlogChrome(
        projectId,
        project.suggestedPrimaryColor || "#2563eb",
      );
    } else if (isCorporateProject(project)) {
      await applyAstraBlogChrome(
        projectId,
        project.suggestedPrimaryColor || "#1e40af",
      );
    } else if (isEcommerceProject(project)) {
      if (project.suggestedPrimaryColor) {
        try {
          await applyChatAction(projectId, {
            actionType: "change_color",
            target: "primary",
            value: project.suggestedPrimaryColor,
          });
        } catch {
          // Storefront gibi temalarda renk uygulanamayabilir.
        }
      }
    }
  } catch (error) {
    console.warn(`[provisioning] Arka plan zenginleştirme (${projectId}):`, error);
  } finally {
    enrichmentInProgress.delete(projectId);
  }
}

export async function completeProjectSetup(
  projectId: string,
): Promise<void> {
  if (setupInProgress.has(projectId)) {
    return;
  }

  // await öncesinde kilitle — status polling ile çift kurulumu engeller
  setupInProgress.add(projectId);

  try {
    const project = await getProject(projectId);

    if (!project || project.status === "ready" || project.status === "error") {
      return;
    }
    let reachable = false;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      reachable = await isWordPressReachable(project.hostPort, projectId);
      if (reachable) {
        break;
      }
      await sleep(1500);
    }

    if (!reachable) {
      await updateProject(projectId, {
        status: "error",
        error: "WordPress container'ı zamanında yanıt vermedi.",
      });
      return;
    }

    await updateProject(projectId, { status: "installing" });
    await runProjectSetup(projectId);

    if (isEcommerceProject(project)) {
      if (!(await isWooCommerceActive(projectId))) {
        await repairEcommerceSite(
          projectId,
          project.prompt,
          project.suggestedPrimaryColor || "#2563eb",
        );
      }
    }

    if (isBlogProject(project)) {
      await setupBlogContent(projectId, project.prompt, project.siteTitle);
      try {
        await applyAstraBlogChrome(
          projectId,
          project.suggestedPrimaryColor || "#2563eb",
        );
        await enrichBlogAiImages(projectId, project.prompt);
        await ensureMissingBlogAiImages(projectId, project.prompt);
      } catch (chromeError) {
        console.warn(`[provisioning] Blog kurulum (${projectId}):`, chromeError);
      }
    } else if (isCorporateProject(project)) {
      await setupCorporateContent(
        projectId,
        project.prompt,
        project.siteTitle,
        project.suggestedPrimaryColor || "#1e40af",
      );
      try {
        await applyAstraBlogChrome(
          projectId,
          project.suggestedPrimaryColor || "#1e40af",
        );
      } catch (corpError) {
        console.warn(`[provisioning] Kurumsal kurulum (${projectId}):`, corpError);
      }
      try {
        await runCorporateImageEnrichment(projectId, project.prompt);
      } catch (imageError) {
        console.warn(`[provisioning] Kurumsal görseller (${projectId}):`, imageError);
        throw imageError;
      }
      try {
        await applyPendingCorporateBrand(projectId);
      } catch (brandError) {
        console.warn(`[provisioning] Bekleyen marka (${projectId}):`, brandError);
      }
    } else if (isEcommerceProject(project)) {
      try {
        await enrichEcommerceProductImages(projectId, project.prompt);
      } catch (imageError) {
        console.warn(`[provisioning] Mağaza görselleri (${projectId}):`, imageError);
      }
    }

    await persistWordPressCredentials(projectId, project.siteUrl);
    await updateProject(projectId, { status: "ready", error: undefined });

    void enrichProjectInBackground(projectId, project);
  } catch (error) {
    if (await isWordPressInstalled(projectId)) {
      const recovered = await getProject(projectId);
      if (recovered && isCorporateProject(recovered)) {
        try {
          await repairCorporateSite(
            projectId,
            recovered.suggestedPrimaryColor || "#1e40af",
            recovered.prompt,
            recovered.siteTitle,
          );
          try {
            await applyPendingCorporateBrand(projectId);
          } catch (brandError) {
            console.warn(`[provisioning] Bekleyen marka (${projectId}):`, brandError);
          }
          await updateProject(projectId, { status: "ready", error: undefined });
          void enrichProjectInBackground(projectId, recovered);
          return;
        } catch (repairError) {
          console.warn(`[provisioning] Kurumsal onarım (${projectId}):`, repairError);
          await updateProject(projectId, {
            status: "error",
            error: formatProvisioningError(repairError),
          });
          return;
        }
      }
      if (recovered && isEcommerceProject(recovered)) {
        try {
          await repairEcommerceSite(
            projectId,
            recovered.prompt,
            recovered.suggestedPrimaryColor || "#2563eb",
          );
          await updateProject(projectId, { status: "ready", error: undefined });
          void enrichProjectInBackground(projectId, recovered);
          return;
        } catch (repairError) {
          console.warn(`[provisioning] Mağaza onarımı (${projectId}):`, repairError);
          await updateProject(projectId, {
            status: "error",
            error: formatProvisioningError(repairError),
          });
          return;
        }
      }
      if (recovered && isBlogProject(recovered)) {
        try {
          await setupBlogContent(
            projectId,
            recovered.prompt,
            recovered.siteTitle,
          );
        } catch (blogError) {
          console.warn(`[provisioning] Blog içeriği kurtarma (${projectId}):`, blogError);
        }
      }
      await updateProject(projectId, { status: "ready", error: undefined });
      if (recovered) {
        void enrichProjectInBackground(projectId, recovered);
      }
      return;
    }

    await updateProject(projectId, {
      status: "error",
      error: formatProvisioningError(error),
    });
  } finally {
    setupInProgress.delete(projectId);
  }
}

export async function startFullProvisioning(
  projectId: string,
  config: ProjectRuntimeConfig,
): Promise<void> {
  if (provisioningInProgress.has(projectId)) {
    return;
  }

  provisioningInProgress.add(projectId);

  try {
    const result = await provisionProject(projectId, config);
    await updateProject(projectId, {
      wpAdminUser: result.adminUser,
      wpAdminPassword: result.adminPassword,
    });
    await completeProjectSetup(projectId);
  } catch (error) {
    await updateProject(projectId, {
      status: "error",
      error: formatProvisioningError(error),
    });
  } finally {
    provisioningInProgress.delete(projectId);
  }
}

export async function resumeProvisioning(projectId: string): Promise<void> {
  if (isProvisioningActive(projectId)) {
    return;
  }

  const project = await getProject(projectId);

  if (!project || project.status === "ready") {
    return;
  }

  // Hata durumunda bile container ayaktaysa kurulumu tamamlamayı dene
  if (project.status === "error" && (await composeFileExists(projectId))) {
    await updateProject(projectId, {
      status: "provisioning",
      error: undefined,
    });
    await completeProjectSetup(projectId);
    return;
  }

  if (project.status === "error") {
    return;
  }

  const config = projectToRuntimeConfig(project);
  const hasCompose = await composeFileExists(projectId);

  if (hasCompose) {
    await completeProjectSetup(projectId);
    return;
  }

  await startFullProvisioning(projectId, config);
}

export function getStatusMessage(
  status: string,
  elapsedSeconds = 0,
  siteType = "",
  suggestedPlugins: string[] = [],
  prompt = "",
): string {
  const elapsed =
    elapsedSeconds > 0 ? ` (${Math.floor(elapsedSeconds)} sn)` : "";
  const isBlog = isBlogProject({ siteType, suggestedPlugins, prompt });
  const isCorporate = isCorporateProject({ siteType, suggestedPlugins, prompt });

  switch (status) {
    case "provisioning":
      return `Docker container'ları başlatılıyor${elapsed}...`;
    case "installing":
      if (isBlog) {
        return `Blog kuruluyor: yazılar ve AI görseller üretiliyor${elapsed}...`;
      }
      if (isCorporate) {
        return `Siteniz kuruluyor: hero ve diğer AI görseller üretiliyor${elapsed}...`;
      }
      return `Mağaza kuruluyor: ürünler ve AI görseller hazırlanıyor${elapsed}...`;
    case "ready":
      return "Site hazır!";
    case "error":
      return "Kurulum sırasında bir hata oluştu.";
    default:
      return `İşlem devam ediyor${elapsed}...`;
  }
}
