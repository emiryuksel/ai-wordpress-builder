import { createHmac, timingSafeEqual } from "node:crypto";

const PREVIEW_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;

interface PreviewAccessPayload {
  projectId: string;
  userId: string;
  exp: number;
}

function getPreviewAccessSecret(): string {
  return process.env.SESSION_SECRET?.trim() || "dev-only-session-secret-change-me";
}

export function createPreviewAccessToken(
  projectId: string,
  userId: string,
): string {
  const payload: PreviewAccessPayload = {
    projectId,
    userId,
    exp: Date.now() + PREVIEW_TOKEN_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getPreviewAccessSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyPreviewAccessToken(
  token: string,
): PreviewAccessPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getPreviewAccessSecret())
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
    ) as PreviewAccessPayload;

    if (
      !payload.projectId ||
      !payload.userId ||
      !payload.exp ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
