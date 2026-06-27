import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

import { getRuntimeRoot } from "@/lib/data-paths";
import { listProjects } from "@/lib/project-store";
import {
  buildWordPressInternalUrl,
  getWordPressReachabilityHosts,
  getWordPressContainerSiteUrl,
} from "@/lib/public-url";

const ROOT_DIR = process.cwd();
const TEMPLATE_PATH = path.join(ROOT_DIR, "docker", "docker-compose.template.yml");
const WP_INIT_TEMPLATE_DIR = path.join(ROOT_DIR, "docker", "wp-init");

export interface ProjectRuntimeConfig {
  siteType?: string;
  suggestedTheme?: string;
  suggestedPlugins?: string[];
  siteTitle?: string;
  hostPort?: number;
  siteUrl?: string;
  userPrompt?: string;
}

export interface ProvisionResult {
  projectId: string;
  hostPort: number;
  siteUrl: string;
  composePath: string;
  projectDir: string;
  wordpressContainer: string;
  adminUser: string;
  adminPassword: string;
}

export interface ProjectPaths {
  projectDir: string;
  composePath: string;
  wordpressContainer: string;
}

function getProjectPaths(projectId: string): ProjectPaths {
  const projectDir = path.join(getRuntimeRoot(), projectId);
  return {
    projectDir,
    composePath: path.join(projectDir, "docker-compose.yml"),
    wordpressContainer: `${projectId}_wordpress`,
  };
}

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (content, [key, value]) =>
      content.replaceAll(`{{${key}}}`, value),
    template,
  );
}

export async function findFreePort(startPort = 8001): Promise<number> {
  const [dockerPorts, projects] = await Promise.all([
    getDockerHostPorts(),
    listProjects(),
  ]);

  const reservedPorts = new Set(projects.map((project) => project.hostPort));

  for (let port = startPort; port < startPort + 1000; port += 1) {
    if (dockerPorts.has(port) || reservedPorts.has(port)) {
      continue;
    }

    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }

  throw new Error("8001-8999 aralığında boş port bulunamadı.");
}

async function getDockerHostPorts(): Promise<Set<number>> {
  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "--format",
      "{{.Ports}}",
    ]);
    const ports = new Set<number>();

    for (const match of stdout.matchAll(/:(\d+)->/g)) {
      const port = Number.parseInt(match[1], 10);
      if (!Number.isNaN(port)) {
        ports.add(port);
      }
    }

    return ports;
  } catch {
    return new Set();
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    // Windows + Docker Desktop'ta 127.0.0.1 kontrolü yanıltıcı olabiliyor.
    server.listen(port, "0.0.0.0");
  });
}

async function runDockerCompose(
  projectId: string,
  composePath: string,
  args: string[],
  options: { profiles?: string[]; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  const profileArgs = options.profiles?.flatMap((profile) => [
    "--profile",
    profile,
  ]) ?? [];

  try {
    return await execFileAsync(
      "docker",
      [
        "compose",
        ...profileArgs,
        "-f",
        composePath,
        "-p",
        projectId,
        ...args,
      ],
      {
        cwd: path.dirname(composePath),
        maxBuffer: 20 * 1024 * 1024,
        timeout: options.timeoutMs ?? 120_000,
        env: {
          ...process.env,
          COMPOSE_ANSI: "never",
        },
      },
    );
  } catch (error) {
    throw parseDockerComposeError(error);
  }
}

interface ExecFileException extends Error {
  stdout?: string;
  stderr?: string;
  code?: number | string;
}

export function parseDockerComposeError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Docker komutu başarısız oldu.");
  }

  const execError = error as ExecFileException;
  const output = `${execError.stdout ?? ""}\n${execError.stderr ?? ""}`.trim();

  if (output.includes("[wp-init] Kurulum tamamlandı.")) {
    return new Error("__SETUP_SUCCEEDED__");
  }

  const wpInitError = output.match(/\[wp-init\] HATA: (.+)/)?.[1];
  if (wpInitError) {
    return new Error(wpInitError);
  }

  if (execError.code === "ETIMEDOUT") {
    return new Error(
      "Kurulum zaman aşımına uğradı. WooCommerce indirmesi yavaş olabilir — tekrar deneyin.",
    );
  }

  if (output.includes("Duplicate entry")) {
    return new Error(
      "Veritabanı çakışması oluştu. Kurulum yeniden denenecek.",
    );
  }

  if (
    output.includes("no such file or directory") &&
    output.includes("docker-compose")
  ) {
    return new Error(
      "Docker compose dosyası host üzerinde bulunamadı. Coolify'da kalıcı depolama için Source Path ve Destination Path aynı host yolu olmalı (ör. /app/data → /app/data). COOLIFY.md bölüm 3'e bakın.",
    );
  }

  if (
    output.includes("port is already allocated") ||
    output.includes("Bind for") ||
    output.includes("address already in use")
  ) {
    return new Error(
      "Seçilen port kullanımda. Lütfen birkaç saniye bekleyip tekrar deneyin.",
    );
  }

  if (output.includes("container name") && output.includes("already in use")) {
    return new Error(
      "Docker container çakışması oluştu. Sayfayı yenileyip tekrar deneyin.",
    );
  }

  const lastWpInitLine = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[wp-init]"))
    .pop();

  if (lastWpInitLine) {
    return new Error(lastWpInitLine.replace("[wp-init] ", ""));
  }

  const tail = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");

  if (tail.length > 0 && tail.length < 220) {
    return new Error(
      `WordPress kurulumu tamamlanamadı: ${tail}`,
    );
  }

  return new Error(
    "WordPress kurulumu tamamlanamadı. Docker Desktop açık mı kontrol edip tekrar deneyin.",
  );
}

export async function isWordPressInstalled(projectId: string): Promise<boolean> {
  try {
    const result = await execWpCli(projectId, ["core", "is-installed"]);
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const WP_INIT_SHELL_SCRIPTS = [
  "setup.sh",
  "setup-blog.sh",
  "setup-woocommerce.sh",
  "setup-corporate.sh",
] as const;

async function normalizeShellScripts(targetDir: string): Promise<void> {
  for (const script of WP_INIT_SHELL_SCRIPTS) {
    const scriptPath = path.join(targetDir, script);
    try {
      const content = await fs.readFile(scriptPath, "utf8");
      const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (normalized !== content) {
        await fs.writeFile(scriptPath, normalized, "utf8");
      }
    } catch {
      // Script may not exist in older runtime folders.
    }
  }
}

async function copyWpInit(projectDir: string): Promise<void> {
  const destination = path.join(projectDir, "wp-init");
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(WP_INIT_TEMPLATE_DIR, destination, { recursive: true });
  await normalizeShellScripts(destination);
}

function quoteConfigValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function writeSiteConfig(
  projectDir: string,
  config: {
    siteUrl: string;
    siteTitle: string;
    adminUser: string;
    adminPassword: string;
    adminEmail: string;
    siteType: string;
    suggestedTheme: string;
    suggestedPlugins: string[];
    userPrompt?: string;
  },
): Promise<void> {
  const lines = [
    `SITE_URL=${quoteConfigValue(config.siteUrl)}`,
    `SITE_TITLE=${quoteConfigValue(config.siteTitle)}`,
    `ADMIN_USER=${quoteConfigValue(config.adminUser)}`,
    `ADMIN_PASSWORD=${quoteConfigValue(config.adminPassword)}`,
    `ADMIN_EMAIL=${quoteConfigValue(config.adminEmail)}`,
    `SITE_TYPE=${quoteConfigValue(config.siteType)}`,
    `SUGGESTED_THEME=${quoteConfigValue(config.suggestedTheme)}`,
    `SUGGESTED_PLUGINS=${quoteConfigValue(config.suggestedPlugins.join(","))}`,
  ];

  if (config.userPrompt) {
    lines.push(`USER_PROMPT=${quoteConfigValue(config.userPrompt)}`);
  }

  await fs.writeFile(
    path.join(projectDir, "wp-init", "site.config"),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

export async function provisionProject(
  projectId: string,
  config: ProjectRuntimeConfig = {},
): Promise<ProvisionResult> {
  const hostPort = config.hostPort ?? (await findFreePort());
  const dbPassword = crypto.randomBytes(16).toString("hex");
  const dbRootPassword = crypto.randomBytes(16).toString("hex");
  const adminPassword = crypto.randomBytes(12).toString("hex");

  const siteType = config.siteType ?? "kurumsal";
  const suggestedTheme = config.suggestedTheme ?? "astra";
  const suggestedPlugins = config.suggestedPlugins ?? [];
  const siteTitle = config.siteTitle ?? "AI WordPress Site";
  const siteUrl = getWordPressContainerSiteUrl();
  const userPrompt = config.userPrompt ?? "";

  const { projectDir, composePath, wordpressContainer } =
    getProjectPaths(projectId);

  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(path.join(projectDir, "product-images"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "blog-images"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "corporate-images"), { recursive: true });
  await copyWpInit(projectDir);

  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const composeContent = fillTemplate(template, {
    PROJECT_ID: projectId,
    HOST_PORT: String(hostPort),
    DB_PASSWORD: dbPassword,
    DB_ROOT_PASSWORD: dbRootPassword,
  });

  await fs.writeFile(composePath, composeContent, "utf8");

  await writeSiteConfig(projectDir, {
    siteUrl,
    siteTitle,
    adminUser: "admin",
    adminPassword,
    adminEmail: "admin@example.com",
    siteType,
    suggestedTheme,
    suggestedPlugins,
    userPrompt: userPrompt || undefined,
  });

  await runDockerCompose(projectId, composePath, ["up", "-d"]);

  return {
    projectId,
    hostPort,
    siteUrl,
    composePath,
    projectDir,
    wordpressContainer,
    adminUser: "admin",
    adminPassword,
  };
}

export async function runProjectSetup(projectId: string): Promise<void> {
  const { composePath } = getProjectPaths(projectId);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await runDockerCompose(
        projectId,
        composePath,
        ["run", "--rm", "--entrypoint", "sh", "wpcli", "/wp-init/setup.sh"],
        { profiles: ["tools"], timeoutMs: 600_000 },
      );
      return;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "__SETUP_SUCCEEDED__"
      ) {
        return;
      }

      if (await isWordPressInstalled(projectId)) {
        return;
      }

      lastError =
        error instanceof Error
          ? error
          : new Error("WordPress kurulumu başarısız oldu.");

      if (attempt < 3) {
        await sleep(3_000);
      }
    }
  }

  if (await isWordPressInstalled(projectId)) {
    return;
  }

  throw lastError ?? new Error("WordPress kurulumu başarısız oldu.");
}

export async function runWooCommerceSetup(projectId: string): Promise<void> {
  const { composePath } = getProjectPaths(projectId);
  await runDockerCompose(
    projectId,
    composePath,
    ["run", "--rm", "--entrypoint", "sh", "wpcli", "/wp-init/setup-woocommerce.sh"],
    { profiles: ["tools"], timeoutMs: 600_000 },
  );
}

export async function stopProject(projectId: string): Promise<void> {
  const { composePath } = getProjectPaths(projectId);
  await runDockerCompose(projectId, composePath, ["down"]);
}

export async function removeProject(projectId: string): Promise<void> {
  const { composePath, projectDir } = getProjectPaths(projectId);

  try {
    await fs.access(composePath);
    await runDockerCompose(projectId, composePath, ["down", "-v"]);
  } catch {
    // Kurulum yarıda kaldıysa compose dosyası olmayabilir.
  }

  await fs.rm(projectDir, { recursive: true, force: true });
}

async function isWordPressHttpReachable(
  host: string,
  hostPort: number,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`http://${host}:${hostPort}`, {
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeout);
    return response.status > 0;
  } catch {
    return false;
  }
}

async function isWordPressContainerReachable(
  containerName: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await execFileAsync(
      "docker",
      [
        "exec",
        containerName,
        "php",
        "-r",
        'exit(@file_get_contents("http://127.0.0.1/") === false ? 1 : 0);',
      ],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
    );
    return true;
  } catch {
    return false;
  }
}

export async function isWordPressReachable(
  hostPort: number,
  projectId?: string,
  timeoutMs = 3000,
): Promise<boolean> {
  for (const host of getWordPressReachabilityHosts()) {
    if (await isWordPressHttpReachable(host, hostPort, timeoutMs)) {
      return true;
    }
  }

  const containerName = projectId ? `${projectId}_wordpress` : null;
  if (containerName && (await isWordPressContainerReachable(containerName, timeoutMs))) {
    return true;
  }

  return false;
}

export async function execWpCli(
  projectId: string,
  args: string[],
): Promise<string> {
  const { composePath } = getProjectPaths(projectId);
  const profileArgs = ["--profile", "tools"];
  const wpArgs = [
    "compose",
    ...profileArgs,
    "-f",
    composePath,
    "-p",
    projectId,
    "run",
    "--rm",
    "wpcli",
    "wp",
    ...args,
    "--path=/var/www/html",
  ];

  const { stdout } = await execFileAsync("docker", wpArgs, {
    cwd: path.dirname(composePath),
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout.trim();
}

/** HTTP upstream başarısız olursa WP container içinden doğrudan sayfa çeker. */
export async function fetchWordPressFromContainer(
  projectId: string,
  pathWithSearch: string,
  timeoutMs = 20_000,
): Promise<Response | null> {
  const containerName = `${projectId}_wordpress`;
  const path = pathWithSearch.startsWith("/")
    ? pathWithSearch
    : `/${pathWithSearch}`;
  const targetUrl = `http://127.0.0.1${path}`;

  try {
    const { stdout } = await execFileAsync(
      "docker",
      [
        "exec",
        containerName,
        "curl",
        "-sS",
        "-L",
        "--max-time",
        "15",
        "-H",
        "Host: 127.0.0.1",
        "-w",
        "\n__HTTP_STATUS__%{http_code}",
        targetUrl,
      ],
      { timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024 },
    );

    const marker = "\n__HTTP_STATUS__";
    const markerIndex = stdout.lastIndexOf(marker);
    const status =
      markerIndex >= 0
        ? Number.parseInt(stdout.slice(markerIndex + marker.length), 10) || 200
        : 200;
    const body =
      markerIndex >= 0 ? stdout.slice(0, markerIndex) : stdout;

    if (!body.trim() && status >= 400) {
      return null;
    }

    return new Response(body, {
      status,
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  } catch {
    return null;
  }
}

export async function execWpCliSh(
  projectId: string,
  shellCommand: string,
  timeoutMs = 120_000,
): Promise<string> {
  const { composePath, projectDir } = getProjectPaths(projectId);
  const productImagesDir = path.join(projectDir, "product-images");
  const blogImagesDir = path.join(projectDir, "blog-images");
  const corporateImagesDir = path.join(projectDir, "corporate-images");
  await fs.mkdir(productImagesDir, { recursive: true });
  await fs.mkdir(blogImagesDir, { recursive: true });
  await fs.mkdir(corporateImagesDir, { recursive: true });

  const wpArgs = [
    "compose",
    "--profile",
    "tools",
    "-f",
    composePath,
    "-p",
    projectId,
    "run",
    "--rm",
    "-v",
    `${productImagesDir}:/product-images`,
    "-v",
    `${blogImagesDir}:/blog-images`,
    "-v",
    `${corporateImagesDir}:/corporate-images`,
    "--entrypoint",
    "sh",
    "wpcli",
    "-c",
    shellCommand,
  ];

  const { stdout } = await execFileAsync("docker", wpArgs, {
    cwd: path.dirname(composePath),
    maxBuffer: 10 * 1024 * 1024,
    timeout: timeoutMs,
  });

  return stdout.trim();
}
