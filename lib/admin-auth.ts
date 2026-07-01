import { getSessionUser, requireSessionUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/plans";
import type { User } from "@/lib/user-store";

export class AdminAccessError extends Error {
  readonly status: number;

  constructor(message = "Bu sayfaya erişim yetkiniz yok.", status = 403) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

export async function requireAdminUser(): Promise<User> {
  const user = await requireSessionUser();
  if (!isAdminUser(user)) {
    throw new AdminAccessError();
  }
  return user;
}

export async function getAdminUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || !isAdminUser(user)) {
    return null;
  }
  return user;
}
