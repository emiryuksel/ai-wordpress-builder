import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity-log";
import {
  createSession,
  getAuthContext,
  hashPassword,
  toPublicUser,
} from "@/lib/auth";
import { canUserCreateProject, getProjectLimitForUser } from "@/lib/plans";
import { createUser, getUserByEmail } from "@/lib/user-store";

export const runtime = "nodejs";

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const name = body.name?.trim() ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre gerekli." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Şifre en az 8 karakter olmalı." },
        { status: 400 },
      );
    }

    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kayıtlı." },
        { status: 409 },
      );
    }

    const user = await createUser({
      email,
      name,
      passwordHash: hashPassword(password),
      plan: "free",
    });

    await createSession(user.id);
    logActivity({
      action: "auth.register",
      user,
      resourceType: "user",
      resourceId: user.id,
    });

    const limit = getProjectLimitForUser(user);

    return NextResponse.json({
      ok: true,
      user: toPublicUser(user),
      projectCount: 0,
      projectLimit: limit ?? 0,
      unlimited: limit === null,
      canCreateProject: canUserCreateProject(user, 0),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hesap oluşturulamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
