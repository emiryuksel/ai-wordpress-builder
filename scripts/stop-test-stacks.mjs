#!/usr/bin/env node
/**
 * Tüm test WordPress Docker stack'lerini durdurur.
 *
 * Kullanım:
 *   npm run stacks:stop
 *   npm run stacks:stop -- --keep <projectId>
 *   npm run stacks:purge          # volume + runtime klasörü + projects.json kaydı siler
 *   npm run stacks:stop -- --dry-run
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const RUNTIME_ROOT = path.join(ROOT, "data", "runtime");
const PROJECTS_PATH = path.join(ROOT, "data", "projects.json");

function printHelp() {
  console.log(`
Test Docker stack'lerini kapat

  npm run stacks:stop
  npm run stacks:stop -- --keep <projectId>   Aktif siteyi koru (kısmi UUID yeterli)
  npm run stacks:purge                        Tam temizlik (veri silinir)
  npm run stacks:stop -- --dry-run            Sadece listele, işlem yapma

Seçenekler:
  --keep <id>     Korunacak proje(ler); virgülle ayırarak birden fazla verilebilir
  --purge         Volume'ları sil, runtime klasörünü ve projects.json kaydını kaldır
  --dry-run       Komutları çalıştırma
  -h, --help      Bu yardım metni
`);
}

function parseArgs(argv) {
  const keep = new Set();
  let purge = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--purge") {
      purge = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--keep") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--keep için bir projectId gerekli");
      }
      value.split(",").forEach((id) => keep.add(id.trim()));
      i += 1;
      continue;
    }
    if (arg.startsWith("--keep=")) {
      arg
        .slice("--keep=".length)
        .split(",")
        .forEach((id) => keep.add(id.trim()));
    }
  }

  return { keep, purge, dryRun };
}

function matchesKeep(projectId, keepIds) {
  if (keepIds.size === 0) {
    return false;
  }

  for (const keepId of keepIds) {
    if (projectId === keepId || projectId.startsWith(keepId)) {
      return true;
    }
  }

  return false;
}

async function loadProjectMeta() {
  try {
    const raw = await fs.readFile(PROJECTS_PATH, "utf8");
    const data = JSON.parse(raw);
    const map = new Map();

    for (const project of data.projects ?? []) {
      map.set(project.id, project);
    }

    return map;
  } catch {
    return new Map();
  }
}

async function listRuntimeProjects() {
  let entries = [];

  try {
    entries = await fs.readdir(RUNTIME_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const projectIds = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const composePath = path.join(RUNTIME_ROOT, entry.name, "docker-compose.yml");

    try {
      await fs.access(composePath);
      projectIds.push(entry.name);
    } catch {
      // compose yok — atla
    }
  }

  return projectIds.sort();
}

async function dockerComposeDown(projectId, composePath, purge) {
  const args = ["compose", "-f", composePath, "-p", projectId, "down"];
  if (purge) {
    args.push("-v");
  }

  await execFileAsync("docker", args, {
    cwd: path.dirname(composePath),
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function removeRuntimeDir(projectId) {
  await fs.rm(path.join(RUNTIME_ROOT, projectId), {
    recursive: true,
    force: true,
  });
}

async function removeFromProjectsJson(projectIds) {
  if (projectIds.length === 0) {
    return;
  }

  let data = { projects: [] };

  try {
    const raw = await fs.readFile(PROJECTS_PATH, "utf8");
    data = JSON.parse(raw);
  } catch {
    return;
  }

  const removeSet = new Set(projectIds);
  data.projects = (data.projects ?? []).filter(
    (project) => !removeSet.has(project.id),
  );

  await fs.mkdir(path.dirname(PROJECTS_PATH), { recursive: true });
  await fs.writeFile(PROJECTS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function pruneExitedContainers(dryRun) {
  if (dryRun) {
    console.log("  → docker container prune -f (atlandı, dry-run)");
    return;
  }

  try {
    const { stdout } = await execFileAsync("docker", ["container", "prune", "-f"]);
    const trimmed = stdout.trim();
    if (trimmed) {
      console.log(`  → ${trimmed}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠ Durmuş container temizliği başarısız: ${message}`);
  }
}

function formatProjectLine(projectId, meta) {
  if (!meta) {
    return projectId;
  }

  const title = meta.siteTitle || meta.prompt?.slice(0, 40) || "İsimsiz";
  const port = meta.hostPort ? `:${meta.hostPort}` : "";
  return `${projectId} — ${title}${port}`;
}

async function main() {
  const { keep, purge, dryRun } = parseArgs(process.argv.slice(2));
  const [runtimeProjects, projectMeta] = await Promise.all([
    listRuntimeProjects(),
    loadProjectMeta(),
  ]);

  if (runtimeProjects.length === 0) {
    console.log("data/runtime altında durdurulacak stack bulunamadı.");
    return;
  }

  const toProcess = runtimeProjects.filter(
    (projectId) => !matchesKeep(projectId, keep),
  );
  const kept = runtimeProjects.filter((projectId) =>
    matchesKeep(projectId, keep),
  );

  if (kept.length > 0) {
    console.log("Korunan stack'ler:");
    for (const projectId of kept) {
      console.log(`  ✓ ${formatProjectLine(projectId, projectMeta.get(projectId))}`);
    }
    console.log("");
  }

  if (toProcess.length === 0) {
    console.log("Durdurulacak stack kalmadı.");
    return;
  }

  const action = purge ? "Temizlenecek" : "Durdurulacak";
  console.log(`${action} stack'ler (${toProcess.length}):`);

  for (const projectId of toProcess) {
    console.log(`  • ${formatProjectLine(projectId, projectMeta.get(projectId))}`);
  }

  if (dryRun) {
    console.log("\nDry-run: hiçbir işlem yapılmadı.");
    return;
  }

  console.log("");

  const removedIds = [];
  let failed = 0;

  for (const projectId of toProcess) {
    const composePath = path.join(RUNTIME_ROOT, projectId, "docker-compose.yml");
    const label = purge ? "Temizleniyor" : "Durduruluyor";

    process.stdout.write(`  ${label} ${projectId}... `);

    try {
      await dockerComposeDown(projectId, composePath, purge);

      if (purge) {
        await removeRuntimeDir(projectId);
        removedIds.push(projectId);
      }

      console.log("tamam");
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`hata (${message})`);
    }
  }

  if (purge && removedIds.length > 0) {
    await removeFromProjectsJson(removedIds);
    console.log(`\nprojects.json'dan ${removedIds.length} kayıt silindi.`);
  }

  console.log("\nDurmuş wp-cli container'ları temizleniyor...");
  await pruneExitedContainers(false);

  const summary = purge ? "temizlendi" : "durduruldu";
  console.log(
    `\nBitti: ${toProcess.length - failed} stack ${summary}${failed > 0 ? `, ${failed} hata` : ""}.`,
  );

  if (!purge && failed === 0) {
    console.log(
      "Not: Veriler korundu. Tam silmek için: npm run stacks:purge",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
