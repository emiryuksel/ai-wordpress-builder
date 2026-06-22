import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

import { hashPassword, verifyPassword } from "@/lib/password";
import type { UserPlan } from "@/lib/plans";

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: UserPlan;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface UserStoreData {
  users: User[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "users.json");

let bootstrapPromise: Promise<void> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getAdminConfig(): {
  email: string;
  password: string;
  name: string;
} | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  return {
    email: normalizeEmail(email),
    password,
    name: process.env.ADMIN_NAME?.trim() || "Admin",
  };
}

async function writeStore(data: UserStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function ensureAdminAccount(): Promise<void> {
  const config = getAdminConfig();
  if (!config) {
    return;
  }

  const store = await ensureStoreWithoutBootstrap();
  const existingIndex = store.users.findIndex(
    (user) => user.email === config.email,
  );

  if (existingIndex === -1) {
    const now = new Date().toISOString();
    const admin: User = {
      id: uuidv4(),
      email: config.email,
      name: config.name,
      passwordHash: hashPassword(config.password),
      plan: "free",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(admin);
    await writeStore(store);
    return;
  }

  const existing = store.users[existingIndex];
  const updates: Partial<User> = {};

  if (existing.role !== "admin") {
    updates.role = "admin";
  }

  if (existing.name !== config.name) {
    updates.name = config.name;
  }

  const passwordHash = hashPassword(config.password);
  if (!verifyPassword(config.password, existing.passwordHash)) {
    updates.passwordHash = passwordHash;
  }

  if (Object.keys(updates).length > 0) {
    store.users[existingIndex] = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(store);
  }
}

async function ensureStoreWithoutBootstrap(): Promise<UserStoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const data = JSON.parse(raw) as UserStoreData;
    data.users = data.users.map((user) => ({
      ...user,
      role: user.role ?? "user",
    }));
    return data;
  } catch {
    const initial: UserStoreData = { users: [] };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function ensureUsersReady(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = ensureAdminAccount();
  }
  await bootstrapPromise;
}

async function ensureStore(): Promise<UserStoreData> {
  await ensureUsersReady();
  return ensureStoreWithoutBootstrap();
}

export async function getUserById(userId: string): Promise<User | null> {
  const store = await ensureStore();
  return store.users.find((user) => user.id === userId) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const store = await ensureStore();
  return store.users.find((user) => user.email === normalized) ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  plan?: UserPlan;
  role?: UserRole;
}): Promise<User> {
  const store = await ensureStore();
  const normalizedEmail = normalizeEmail(input.email);

  if (store.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Bu e-posta adresi zaten kayıtlı.");
  }

  const adminConfig = getAdminConfig();
  if (adminConfig && normalizedEmail === adminConfig.email) {
    throw new Error("Bu e-posta adresi sistem tarafından kullanılıyor.");
  }

  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email: normalizedEmail,
    name: input.name.trim() || normalizedEmail.split("@")[0] || "Kullanıcı",
    passwordHash: input.passwordHash,
    plan: input.plan ?? "free",
    role: input.role ?? "user",
    createdAt: now,
    updatedAt: now,
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function isReservedAdminEmail(email: string): boolean {
  const adminConfig = getAdminConfig();
  if (!adminConfig) {
    return false;
  }
  return normalizeEmail(email) === adminConfig.email;
}
