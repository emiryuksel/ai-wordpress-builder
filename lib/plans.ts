export type UserPlan = "free" | "premium";

export const PLAN_LIMITS: Record<UserPlan, number> = {
  free: 2,
  premium: 5,
};

export function getProjectLimit(plan: UserPlan): number {
  return PLAN_LIMITS[plan];
}

export function isAdminUser(user: { role?: string }): boolean {
  return user.role === "admin";
}

export function getProjectLimitForUser(user: {
  plan: UserPlan;
  role?: string;
}): number | null {
  if (isAdminUser(user)) {
    return null;
  }
  return getProjectLimit(user.plan);
}

export function canUserCreateProject(
  user: { plan: UserPlan; role?: string },
  projectCount: number,
): boolean {
  if (isAdminUser(user)) {
    return true;
  }
  return projectCount < getProjectLimit(user.plan);
}
