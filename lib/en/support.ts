export const SUPPORT_PHONE = "0 544 612 3448";

export interface WordPressAccessInfo {
  siteUrl: string;
  adminUrl: string;
  adminUser: string;
  adminPassword: string;
}

export function buildSiteReadyChatMessage(access: WordPressAccessInfo): string {
  return `Your site is ready! You can sign in to your WordPress admin panel with the following details:

Admin panel: ${access.adminUrl}
Username: ${access.adminUser}
Password: ${access.adminPassword}

Our team will get in touch with you. For more information and questions, our support number is: ${SUPPORT_PHONE}`;
}
