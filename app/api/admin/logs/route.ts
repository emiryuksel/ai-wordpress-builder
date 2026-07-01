import { NextResponse } from "next/server";

import { AdminAccessError, requireAdminUser } from "@/lib/admin-auth";
import { ACTIVITY_ACTION_LABELS } from "@/lib/activity-log-labels";
import { logActivity } from "@/lib/activity-log";
import { listActivityLogs } from "@/lib/activity-log-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    const action = searchParams.get("action") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;

    const logs = await listActivityLogs({ limit, action, userId });

    logActivity({
      action: "admin.view_logs",
      user: admin,
      resourceType: "admin",
      metadata: {
        limit,
        filteredAction: action ?? null,
        filteredUserId: userId ?? null,
      },
    });

    return NextResponse.json({
      logs,
      actions: Object.entries(ACTIVITY_ACTION_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Kayıtlar alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
