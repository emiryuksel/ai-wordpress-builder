import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    ...context,
  });
}
