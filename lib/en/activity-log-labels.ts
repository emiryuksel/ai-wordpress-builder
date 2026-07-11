export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.register": "Account created",
  "auth.logout": "Signed out",
  "project.create": "Site created",
  "project.delete": "Site deleted",
  "chat.message": "Site edit request",
  "project.brand.update": "Brand identity updated",
  "project.repair": "Site repair started",
  "admin.view_overview": "Admin panel viewed",
  "admin.view_users": "User list viewed",
  "admin.view_logs": "Logs viewed",
};

export function getActivityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action;
}
