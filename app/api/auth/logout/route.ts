import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity-log";
import { clearSession, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const user = await getSessionUser();
  logActivity({
    action: "auth.logout",
    user,
    resourceType: "session",
    resourceId: user?.id,
  });
  await clearSession();
  return NextResponse.json({ ok: true });
}
