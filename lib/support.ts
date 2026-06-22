export const SUPPORT_PHONE = "0 544 612 3448";

export interface WordPressAccessInfo {
  siteUrl: string;
  adminUrl: string;
  adminUser: string;
  adminPassword: string;
}

export function buildSiteReadyChatMessage(access: WordPressAccessInfo): string {
  return `Siteniz hazır! WordPress yönetim panelinize aşağıdaki bilgilerle giriş yapabilirsiniz:

Yönetim paneli: ${access.adminUrl}
Kullanıcı adı: ${access.adminUser}
Şifre: ${access.adminPassword}

Ekibimiz sizinle iletişime geçecektir. Ek bilgi ve sorularınız için destek numaramız: ${SUPPORT_PHONE}`;
}
