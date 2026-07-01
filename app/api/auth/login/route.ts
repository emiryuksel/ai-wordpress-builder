import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity-log";
import { createSession, getAuthContext, verifyPassword } from "@/lib/auth";
import { getUserByEmail } from "@/lib/user-store";

export const runtime = "nodejs";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre gerekli." },
        { status: 400 },
      );
    }

    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 },
      );
    }

    await createSession(user.id);
    logActivity({
      action: "auth.login",
      user,
      resourceType: "session",
      resourceId: user.id,
    });
    const context = await getAuthContext();

    return NextResponse.json({
      ok: true,
      ...context,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Giriş yapılamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
