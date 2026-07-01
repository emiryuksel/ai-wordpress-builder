import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

import { getDataRoot } from "@/lib/data-paths";

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  resourceType?: "user" | "project" | "session" | "admin";
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  ip?: string;
  userAgent?: string;
}

interface ActivityLogStoreData {
  logs: ActivityLog[];
}

const DATA_DIR = getDataRoot();
const STORE_PATH = path.join(DATA_DIR, "activity-logs.json");
const MAX_LOGS = 5_000;

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStore(): Promise<ActivityLogStoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as ActivityLogStoreData;
  } catch {
    const initial: ActivityLogStoreData = { logs: [] };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function writeStore(data: ActivityLogStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function persistActivityLog(
  input: Omit<ActivityLog, "id" | "timestamp">,
): Promise<void> {
  const store = await ensureStore();
  const entry: ActivityLog = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  store.logs.unshift(entry);

  if (store.logs.length > MAX_LOGS) {
    store.logs = store.logs.slice(0, MAX_LOGS);
  }

  await writeStore(store);
}

/** Disk yazımını sıraya alır; çağıranı bloklamaz. */
export function enqueueActivityLog(
  input: Omit<ActivityLog, "id" | "timestamp">,
): void {
  writeQueue = writeQueue
    .then(() => persistActivityLog(input))
    .catch((error) => {
      console.warn("[activity-log-store] Kayıt yazılamadı:", error);
    });
}

export async function listActivityLogs(options?: {
  limit?: number;
  action?: string;
  userId?: string;
}): Promise<ActivityLog[]> {
  await writeQueue;
  const store = await ensureStore();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const actionFilter = options?.action?.trim();
  const userIdFilter = options?.userId?.trim();

  let logs = store.logs;

  if (actionFilter) {
    logs = logs.filter((log) => log.action === actionFilter);
  }

  if (userIdFilter) {
    logs = logs.filter((log) => log.userId === userIdFilter);
  }

  return logs.slice(0, limit);
}

export async function countActivityLogs(): Promise<number> {
  await writeQueue;
  const store = await ensureStore();
  return store.logs.length;
}
