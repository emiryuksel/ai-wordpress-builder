export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Giriş yapıldı",
  "auth.register": "Hesap oluşturuldu",
  "auth.logout": "Çıkış yapıldı",
  "project.create": "Site oluşturuldu",
  "project.delete": "Site silindi",
  "chat.message": "Site düzenleme isteği",
  "project.brand.update": "Marka kimliği güncellendi",
  "project.repair": "Site onarımı başlatıldı",
  "admin.view_overview": "Admin paneli görüntülendi",
  "admin.view_users": "Üyelik listesi görüntülendi",
  "admin.view_logs": "Kayıtlar görüntülendi",
};

export function getActivityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action;
}
