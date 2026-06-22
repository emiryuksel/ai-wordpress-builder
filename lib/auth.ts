import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { canUserCreateProject, getProjectLimitForUser } from "@/lib/plans";
import { hashPassword, verifyPassword } from "@/lib/password";
import { countProjectsByUserId } from "@/lib/project-store";
import { getUserById, toPublicUser, type User } from "@/lib/user-store";

export { hashPassword, verifyPassword };
export const SESSION_COOKIE = "awp_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
  userId: string;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) {
    return secret;
  }
  return "dev-only-session-secret-change-me";
}

function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = signSession({
    userId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }

  return getUserById(payload.userId);
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
}

export async function getAuthContext() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const projectCount = await countProjectsByUserId(user.id);
  const projectLimit = getProjectLimitForUser(user);
  const unlimited = projectLimit === null;

  return {
    user: toPublicUser(user),
    projectCount,
    projectLimit: projectLimit ?? 0,
    unlimited,
    canCreateProject: canUserCreateProject(user, projectCount),
  };
}

export { toPublicUser };
