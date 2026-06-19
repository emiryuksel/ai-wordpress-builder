#!/bin/sh
# set -e kullanılmıyor; eklenti hataları kurulumu durdurmamalı
set -u

CONFIG_FILE="/wp-init/site.config"

if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

SITE_URL="${SITE_URL:-http://localhost}"
SITE_TITLE="${SITE_TITLE:-AI WordPress Site}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeme}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
SUGGESTED_THEME="${SUGGESTED_THEME:-astra}"
SUGGESTED_PLUGINS="${SUGGESTED_PLUGINS:-}"
FALLBACK_THEME="astra"

if echo ",${SUGGESTED_PLUGINS}," | grep -q ",woocommerce,"; then
  FALLBACK_THEME="twentytwentyfour"
fi

echo "[wp-init] WordPress kurulumu bekleniyor..."

attempt=0
max_attempts=45

while [ "$attempt" -lt "$max_attempts" ]; do
  if [ -f /var/www/html/wp-config.php ] && wp db query "SELECT 1" --path=/var/www/html >/dev/null 2>&1; then
    break
  fi
  attempt=$((attempt + 1))
  echo "[wp-init] Veritabanı henüz hazır değil ($attempt/$max_attempts)..."
  sleep 2
done

if [ "$attempt" -ge "$max_attempts" ]; then
  echo "[wp-init] HATA: Veritabanı bağlantısı kurulamadı."
  exit 1
fi

sleep 2

install_wordpress_core() {
  if wp core is-installed --path=/var/www/html 2>/dev/null; then
    echo "[wp-init] WordPress zaten kurulu, atlanıyor."
    return 0
  fi

  echo "[wp-init] WordPress core kuruluyor..."
  core_attempt=0
  while [ "$core_attempt" -lt 5 ]; do
    if wp core install \
      --path=/var/www/html \
      --url="$SITE_URL" \
      --title="$SITE_TITLE" \
      --admin_user="$ADMIN_USER" \
      --admin_password="$ADMIN_PASSWORD" \
      --admin_email="$ADMIN_EMAIL" \
      --skip-email 2>/dev/null; then
      echo "[wp-init] WordPress core kuruldu."
      return 0
    fi

    if wp core is-installed --path=/var/www/html 2>/dev/null; then
      echo "[wp-init] WordPress kurulumu tamamlanmış."
      return 0
    fi

    core_attempt=$((core_attempt + 1))
    echo "[wp-init] Core kurulum denemesi $core_attempt/5..."
    sleep 2
  done

  if wp core is-installed --path=/var/www/html 2>/dev/null; then
    return 0
  fi

  echo "[wp-init] HATA: WordPress core kurulumu başarısız."
  return 1
}

install_theme() {
  theme="$1"
  fallback="${2:-$FALLBACK_THEME}"

  if wp theme is-installed "$theme" --path=/var/www/html 2>/dev/null; then
    wp theme activate "$theme" --path=/var/www/html || true
    echo "[wp-init] Tema aktif: $theme"
    return 0
  fi

  if wp theme install "$theme" --activate --path=/var/www/html 2>/dev/null; then
    echo "[wp-init] Tema kuruldu: $theme"
    return 0
  fi

  echo "[wp-init] UYARI: $theme kurulamadı, $fallback deneniyor."

  if wp theme is-installed "$fallback" --path=/var/www/html 2>/dev/null; then
    wp theme activate "$fallback" --path=/var/www/html || true
  else
    wp theme install "$fallback" --activate --path=/var/www/html || true
  fi

  echo "[wp-init] Yedek tema aktif: $fallback"
}

install_plugin() {
  plugin="$1"
  plugin_attempt=0
  max_attempts=3

  if [ "$plugin" = "woocommerce" ]; then
    max_attempts=4
  fi

  if wp plugin is-active "$plugin" --path=/var/www/html 2>/dev/null; then
    echo "[wp-init] Eklenti zaten aktif: $plugin"
    return 0
  fi

  while [ "$plugin_attempt" -lt "$max_attempts" ]; do
    plugin_attempt=$((plugin_attempt + 1))
    echo "[wp-init] Eklenti kuruluyor: $plugin (deneme $plugin_attempt/$max_attempts)..."

    if wp plugin is-installed "$plugin" --path=/var/www/html 2>/dev/null; then
      wp plugin activate "$plugin" --path=/var/www/html 2>/dev/null && return 0
    fi

    if wp plugin install "$plugin" --activate --path=/var/www/html 2>/dev/null; then
      echo "[wp-init] Eklenti kuruldu: $plugin"
      return 0
    fi

    if wp plugin is-active "$plugin" --path=/var/www/html 2>/dev/null; then
      return 0
    fi

    sleep 5
  done

  echo "[wp-init] UYARI: $plugin kurulamadı, kurulum diğer adımlarla devam ediyor."
  return 0
}

install_wordpress_core || exit 1

IS_WOOCOMMERCE=0
if echo ",${SUGGESTED_PLUGINS}," | grep -q ",woocommerce,"; then
  IS_WOOCOMMERCE=1
fi

if [ "$IS_WOOCOMMERCE" -eq 1 ]; then
  echo "[wp-init] WooCommerce kuruluyor..."
  install_plugin "woocommerce"
else
  echo "[wp-init] Tema kuruluyor: $SUGGESTED_THEME"
  install_theme "$SUGGESTED_THEME" "$FALLBACK_THEME"
fi

if wp plugin is-active woocommerce --path=/var/www/html 2>/dev/null; then
  echo "[wp-init] E-ticaret mağaza içeriği hazırlanıyor..."
  sh /wp-init/setup-woocommerce.sh
  if wp theme is-installed storefront --path=/var/www/html 2>/dev/null; then
    wp theme activate storefront --path=/var/www/html 2>/dev/null || true
    echo "[wp-init] E-ticaret için Storefront teması doğrulandı."
  fi
else
  echo "[wp-init] Blog sitesi içeriği hazırlanıyor..."
  sh /wp-init/setup-blog.sh
fi

if ! wp core is-installed --path=/var/www/html 2>/dev/null; then
  echo "[wp-init] HATA: Kurulum sonunda WordPress doğrulanamadı."
  exit 1
fi

echo "[wp-init] Kurulum tamamlandı."
