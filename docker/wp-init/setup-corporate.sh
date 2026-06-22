#!/bin/sh
set -u

WP_PATH="/var/www/html"
CONFIG_FILE="/wp-init/site.config"

if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

SITE_TITLE="${SITE_TITLE:-Kurumsal Site}"
SITE_URL="${SITE_URL:-http://localhost}"
USER_PROMPT="${USER_PROMPT:-}"

if wp plugin is-active woocommerce --path="$WP_PATH" 2>/dev/null; then
  echo "[wp-init] WooCommerce aktif, kurumsal düzen atlanıyor."
  exit 0
fi

echo "[wp-init] Kurumsal site düzeni hazırlanıyor..."

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

TAGLINE="Profesyonel çözümler, güvenilir hizmet"
if [ -n "$USER_PROMPT" ]; then
  TAGLINE="$USER_PROMPT"
  if [ "${#TAGLINE}" -gt 120 ]; then
    TAGLINE=$(echo "$TAGLINE" | cut -c1-117)
    TAGLINE="${TAGLINE}..."
  fi
fi

wp option update blogname "$SITE_TITLE" --path="$WP_PATH" 2>/dev/null || true
wp option update blogdescription "$TAGLINE" --path="$WP_PATH" 2>/dev/null || true

HOME_ID=$(create_page_if_missing "Ana Sayfa" "ana-sayfa" "<p>Kurumsal ana sayfa içeriği hazırlanıyor...</p>")
ABOUT_ID=$(create_page_if_missing "Hakkımızda" "hakkimizda" "<p><strong>$SITE_TITLE</strong> olarak sektörünüzde güvenilir çözümler sunuyoruz.</p>")
CONTACT_ID=$(create_page_if_missing "İletişim" "iletisim" "<p><strong>E-posta:</strong> info@example.com<br><strong>Telefon:</strong> 0850 000 00 00<br><strong>Adres:</strong> İstanbul, Türkiye</p>")

if [ -n "$HOME_ID" ] && [ "$HOME_ID" != "0" ]; then
  wp option update show_on_front page --path="$WP_PATH" 2>/dev/null || true
  wp option update page_on_front "$HOME_ID" --path="$WP_PATH" 2>/dev/null || true
  wp option update page_for_posts 0 --path="$WP_PATH" 2>/dev/null || true
  echo "[wp-init] Ana sayfa atandı."
fi

MENU_ID=$(wp menu list --fields=term_id,name --format=csv --path="$WP_PATH" 2>/dev/null | grep "Ana Menü" | cut -d',' -f1 | head -n 1)
if [ -z "$MENU_ID" ]; then
  MENU_ID=$(wp menu create "Ana Menü" --porcelain --path="$WP_PATH" 2>/dev/null || true)
fi

if [ -n "$MENU_ID" ] && [ "$MENU_ID" != "0" ]; then
  menu_has_title() {
    title="$1"
    wp menu item list "$MENU_ID" --fields=title --format=csv --path="$WP_PATH" 2>/dev/null | grep -Fx "$title" >/dev/null 2>&1
  }

  if [ -n "$HOME_ID" ] && ! menu_has_title "Ana Sayfa"; then
    wp menu item add-post "$MENU_ID" "$HOME_ID" --title="Ana Sayfa" --path="$WP_PATH" 2>/dev/null || true
  fi
  if ! menu_has_title "Ürünler"; then
    wp menu item add-custom "$MENU_ID" "Ürünler" "${SITE_URL}/#urunler" --path="$WP_PATH" 2>/dev/null || true
  fi
  if [ -n "$ABOUT_ID" ] && ! menu_has_title "Hakkımızda"; then
    wp menu item add-post "$MENU_ID" "$ABOUT_ID" --title="Hakkımızda" --path="$WP_PATH" 2>/dev/null || true
  fi
  if [ -n "$CONTACT_ID" ] && ! menu_has_title "İletişim"; then
    wp menu item add-post "$MENU_ID" "$CONTACT_ID" --title="İletişim" --path="$WP_PATH" 2>/dev/null || true
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
  fi
  wp menu location assign "$FOOTER_MENU_ID" footer_menu --path="$WP_PATH" 2>/dev/null || true
  echo "[wp-init] Footer menüsü atandı."
fi

footer1_count=$(wp widget list footer-widget-1 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
if [ "$footer1_count" = "0" ]; then
  wp widget add text footer-widget-1 \
    --title="$SITE_TITLE" \
    --text="Güvenilir hizmet, profesyonel çözümler." \
    --path="$WP_PATH" 2>/dev/null || true
fi

footer2_count=$(wp widget list footer-widget-2 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
if [ "$footer2_count" = "0" ]; then
  wp widget add text footer-widget-2 \
    --title="İletişim" \
    --text="info@example.com<br>0850 000 00 00" \
    --path="$WP_PATH" 2>/dev/null || true
fi

wp post delete 1 --force --path="$WP_PATH" 2>/dev/null || true
SAMPLE_PAGE=$(wp post list --post_type=page --name=sample-page --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)
if [ -n "$SAMPLE_PAGE" ]; then
  wp post delete "$SAMPLE_PAGE" --force --path="$WP_PATH" 2>/dev/null || true
fi

wp rewrite flush --path="$WP_PATH" 2>/dev/null || true
echo "[wp-init] Kurumsal site iskeleti hazır."
