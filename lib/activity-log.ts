import { headers } from "next/headers";

import { enqueueActivityLog } from "@/lib/activity-log-store";
import type { User } from "@/lib/user-store";

export { ACTIVITY_ACTION_LABELS, getActivityActionLabel } from "@/lib/activity-log-labels";

export type ActivityLogInput = {
  action: string;
  user?: Pick<User, "id" | "email" | "name"> | null;
  resourceType?: "user" | "project" | "session" | "admin";
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  ip?: string;
  userAgent?: string;
};

async function readRequestContext(): Promise<{
  ip?: string;
  userAgent?: string;
}> {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip")?.trim() ||
      undefined;
    const userAgent = headerStore.get("user-agent") ?? undefined;
    return { ip, userAgent };
  } catch {
    return {};
  }
}

function actorFromUser(user?: Pick<User, "id" | "email" | "name"> | null) {
  if (!user) {
    return {};
  }

  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
  };
}

function buildLogEntry(input: ActivityLogInput) {
  return {
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
    ip: input.ip,
    userAgent: input.userAgent,
    ...actorFromUser(input.user),
  };
}

/**
 * Aktivite kaydını arka planda yazar; yanıt süresini bloklamaz.
 */
export function logActivity(input: ActivityLogInput): void {
  const entry = buildLogEntry(input);

  if (input.ip !== undefined || input.userAgent !== undefined) {
    enqueueActivityLog(entry);
    return;
  }

  void (async () => {
    try {
      const requestContext = await readRequestContext();
      enqueueActivityLog({
        ...entry,
        ip: entry.ip ?? requestContext.ip,
        userAgent: entry.userAgent ?? requestContext.userAgent,
      });
    } catch (error) {
      console.warn("[activity-log] İstek bağlamı okunamadı:", error);
      enqueueActivityLog(entry);
    }
  })();
}
