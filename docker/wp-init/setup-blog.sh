#!/bin/sh
set -u

WP_PATH="/var/www/html"
CONFIG_FILE="/wp-init/site.config"

if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

SITE_TITLE="${SITE_TITLE:-Blog}"
SITE_URL="${SITE_URL:-http://localhost}"
USER_PROMPT="${USER_PROMPT:-}"

if wp plugin is-active woocommerce --path="$WP_PATH" 2>/dev/null; then
  echo "[wp-init] WooCommerce aktif, blog düzeni atlanıyor."
  exit 0
fi

echo "[wp-init] Blog sitesi düzeni hazırlanıyor..."

create_page_if_missing() {
  title="$1"
  slug="$2"
  content="$3"

  page_id=$(wp post list --post_type=page --name="$slug" --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)
  if [ -n "$page_id" ]; then
    echo "$page_id"
    return 0
  fi

  wp post create \
    --post_type=page \
    --post_title="$title" \
    --post_name="$slug" \
    --post_content="$content" \
    --post_status=publish \
    --porcelain \
    --path="$WP_PATH" 2>/dev/null
}

setup_astra_blog_chrome() {
  echo "[wp-init] Header ve footer düzeni ayarlanıyor..."

  TAGLINE="İlham veren yazılar ve güncel içerikler"
  if [ -n "$USER_PROMPT" ]; then
    TAGLINE="$USER_PROMPT"
    if [ "${#TAGLINE}" -gt 120 ]; then
      TAGLINE=$(echo "$TAGLINE" | cut -c1-117)
      TAGLINE="${TAGLINE}..."
    fi
  fi

  wp option update blogname "$SITE_TITLE" --path="$WP_PATH" 2>/dev/null || true
  wp option update blogdescription "$TAGLINE" --path="$WP_PATH" 2>/dev/null || true

  ABOUT_TEXT="<p><strong>$SITE_TITLE</strong>, okuyucularına özgün ve kaliteli içerikler sunan bir blogdur.</p>"
  if [ -n "$USER_PROMPT" ]; then
    ABOUT_TEXT="${ABOUT_TEXT}<p>Misyonumuz: $USER_PROMPT</p>"
  fi
  ABOUT_TEXT="${ABOUT_TEXT}<p>Yazılarımızı takip ederek güncel kalın.</p>"

  ABOUT_ID=$(create_page_if_missing "Hakkımızda" "hakkimizda" "$ABOUT_TEXT")
  CONTACT_ID=$(create_page_if_missing "İletişim" "iletisim" "<p><strong>E-posta:</strong> merhaba@example.com<br><strong>İstanbul, Türkiye</strong></p><p>İş birlikleri ve sorularınız için bize yazın.</p>")
  PRIVACY_ID=$(create_page_if_missing "Gizlilik" "gizlilik" "<p>Kişisel verileriniz yalnızca iletişim amacıyla kullanılır. Çerezler site deneyimini iyileştirmek için kullanılabilir.</p>")

  MENU_ID=$(wp menu list --fields=term_id,name --format=csv --path="$WP_PATH" 2>/dev/null | grep "Ana Menü" | cut -d',' -f1 | head -n 1)
  if [ -z "$MENU_ID" ]; then
    MENU_ID=$(wp menu create "Ana Menü" --porcelain --path="$WP_PATH" 2>/dev/null || true)
  fi

  if [ -n "$MENU_ID" ] && [ "$MENU_ID" != "0" ]; then
    menu_count=$(wp menu item list "$MENU_ID" --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
    if [ "$menu_count" -lt 2 ]; then
      wp menu item add-custom "$MENU_ID" "Ana Sayfa" "$SITE_URL/" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$ABOUT_ID" ] && wp menu item add-post "$MENU_ID" "$ABOUT_ID" --title="Hakkımızda" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$CONTACT_ID" ] && wp menu item add-post "$MENU_ID" "$CONTACT_ID" --title="İletişim" --path="$WP_PATH" 2>/dev/null || true
    fi

    wp menu location assign "$MENU_ID" primary --path="$WP_PATH" 2>/dev/null || true
    wp menu location assign "$MENU_ID" mobile_menu --path="$WP_PATH" 2>/dev/null || true
    echo "[wp-init] Ana menü atandı."
  fi

  FOOTER_MENU_ID=$(wp menu list --fields=term_id,name --format=csv --path="$WP_PATH" 2>/dev/null | grep "Footer Menüsü" | cut -d',' -f1 | head -n 1)
  if [ -z "$FOOTER_MENU_ID" ]; then
    FOOTER_MENU_ID=$(wp menu create "Footer Menüsü" --porcelain --path="$WP_PATH" 2>/dev/null || true)
  fi

  if [ -n "$FOOTER_MENU_ID" ] && [ "$FOOTER_MENU_ID" != "0" ]; then
    footer_count=$(wp menu item list "$FOOTER_MENU_ID" --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
    if [ "$footer_count" -lt 2 ]; then
      [ -n "$ABOUT_ID" ] && wp menu item add-post "$FOOTER_MENU_ID" "$ABOUT_ID" --title="Hakkımızda" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$CONTACT_ID" ] && wp menu item add-post "$FOOTER_MENU_ID" "$CONTACT_ID" --title="İletişim" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$PRIVACY_ID" ] && wp menu item add-post "$FOOTER_MENU_ID" "$PRIVACY_ID" --title="Gizlilik" --path="$WP_PATH" 2>/dev/null || true
    fi
    wp menu location assign "$FOOTER_MENU_ID" footer_menu --path="$WP_PATH" 2>/dev/null || true
    echo "[wp-init] Footer menüsü atandı."
  fi

  footer1_count=$(wp widget list footer-widget-1 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer1_count" = "0" ]; then
    wp widget add text footer-widget-1 \
      --title="$SITE_TITLE" \
      --text="$TAGLINE" \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  footer2_count=$(wp widget list footer-widget-2 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer2_count" = "0" ] && [ -n "$FOOTER_MENU_ID" ]; then
    wp widget add nav_menu footer-widget-2 \
      --title="Sayfalar" \
      --nav_menu="$FOOTER_MENU_ID" \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  footer4_count=$(wp widget list footer-widget-4 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer4_count" = "0" ]; then
    wp widget add text footer-widget-4 \
      --title="Telif" \
      --text="© $(date +%Y) $SITE_TITLE · Tüm hakları saklıdır." \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  echo "[wp-init] Footer widget'ları eklendi."
}

ensure_astra_theme() {
  if wp theme is-installed astra --path="$WP_PATH" 2>/dev/null; then
    wp theme activate astra --path="$WP_PATH" 2>/dev/null || true
    echo "[wp-init] Astra teması doğrulandı."
    return 0
  fi

  if wp theme install astra --activate --path="$WP_PATH" 2>/dev/null; then
    echo "[wp-init] Astra teması kuruldu."
  fi
}

ensure_astra_theme

wp theme mod set ast-header-style default --path="$WP_PATH" 2>/dev/null || true
wp theme mod set transparent-header-logo disabled --path="$WP_PATH" 2>/dev/null || true
wp theme mod set disable-primary-nav false --path="$WP_PATH" 2>/dev/null || true

wp option update show_on_front posts --path="$WP_PATH" 2>/dev/null || true
wp option update posts_per_page 6 --path="$WP_PATH" 2>/dev/null || true
wp rewrite structure '/%postname%/' --path="$WP_PATH" 2>/dev/null || true

wp theme mod set blog-layout grid --path="$WP_PATH" 2>/dev/null || true
wp theme mod set blog-image-ratio predefine --path="$WP_PATH" 2>/dev/null || true
wp theme mod set blog-hover-effect zoom --path="$WP_PATH" 2>/dev/null || true
wp theme mod set blog-post-content excerpt --path="$WP_PATH" 2>/dev/null || true
wp theme mod set display-post-structure --path="$WP_PATH" 2>/dev/null || true

setup_astra_blog_chrome

wp post delete 1 --force --path="$WP_PATH" 2>/dev/null || true

SAMPLE_PAGE=$(wp post list --post_type=page --name=sample-page --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)
if [ -n "$SAMPLE_PAGE" ]; then
  wp post delete "$SAMPLE_PAGE" --force --path="$WP_PATH" 2>/dev/null || true
fi

wp rewrite flush --hard --path="$WP_PATH" 2>/dev/null || true

echo "[wp-init] Blog düzeni hazır (yazılar AI ile eklenecek)."
