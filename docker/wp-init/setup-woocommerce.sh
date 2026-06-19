#!/bin/sh
set -u

WP_PATH="/var/www/html"
CONFIG_FILE="/wp-init/site.config"

if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

SITE_TITLE="${SITE_TITLE:-Online Mağaza}"

if ! wp plugin is-active woocommerce --path="$WP_PATH" 2>/dev/null; then
  echo "[wp-init] WooCommerce aktif değil, e-ticaret içeriği atlanıyor."
  exit 0
fi

echo "[wp-init] WooCommerce mağazası hazırlanıyor..."

ADMIN_ID=$(wp user get "$ADMIN_USER" --field=ID --path="$WP_PATH" 2>/dev/null || echo "1")

ensure_storefront_theme() {
  if ! wp theme is-installed storefront --path="$WP_PATH" 2>/dev/null; then
    wp theme install storefront --path="$WP_PATH" 2>/dev/null || true
  fi

  if wp theme is-installed storefront --path="$WP_PATH" 2>/dev/null; then
    wp theme activate storefront --path="$WP_PATH" 2>/dev/null || true
    echo "[wp-init] Storefront teması aktif."
  else
    echo "[wp-init] UYARI: Storefront kurulamadı, mevcut tema kullanılacak."
  fi
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/ı/i/g; s/ş/s/g; s/ğ/g/g; s/ü/u/g; s/ö/o/g; s/ç/c/g'
}

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

setup_storefront_chrome() {
  echo "[wp-init] Header ve footer düzeni ayarlanıyor..."

  wp option update blogdescription "Güvenli alışveriş · 500₺ üzeri ücretsiz kargo" --path="$WP_PATH" 2>/dev/null || true

  wp theme mod set storefront_copyright_text "© $(date +%Y) $SITE_TITLE · Tüm hakları saklıdır." --path="$WP_PATH" 2>/dev/null || true

  ABOUT_ID=$(create_page_if_missing "Hakkımızda" "hakkimizda" "<p>Türkiye'nin güvenilir online mağazası. Kaliteli ürünleri uygun fiyatlarla sunuyoruz.</p>")
  CONTACT_ID=$(create_page_if_missing "İletişim" "iletisim" "<p><strong>E-posta:</strong> destek@example.com<br><strong>Telefon:</strong> 0850 000 00 00<br><strong>Adres:</strong> İstanbul, Türkiye</p>")
  SHIPPING_ID=$(create_page_if_missing "Kargo ve İade" "kargo-ve-iade" "<p>500₺ ve üzeri siparişlerde ücretsiz kargo. 14 gün içinde koşulsuz iade garantisi.</p>")

  SHOP_ID=$(wp option get woocommerce_shop_page_id --path="$WP_PATH" 2>/dev/null || true)
  CART_ID=$(wp option get woocommerce_cart_page_id --path="$WP_PATH" 2>/dev/null || true)
  CHECKOUT_ID=$(wp option get woocommerce_checkout_page_id --path="$WP_PATH" 2>/dev/null || true)
  ACCOUNT_ID=$(wp option get woocommerce_myaccount_page_id --path="$WP_PATH" 2>/dev/null || true)

  # Ana menü
  MENU_ID=$(wp menu list --fields=term_id,name --format=csv --path="$WP_PATH" 2>/dev/null | grep "Ana Menü" | cut -d',' -f1 | head -n 1)
  if [ -z "$MENU_ID" ]; then
    MENU_ID=$(wp menu create "Ana Menü" --porcelain --path="$WP_PATH" 2>/dev/null || true)
  fi

  if [ -n "$MENU_ID" ] && [ "$MENU_ID" != "0" ]; then
    menu_count=$(wp menu item list "$MENU_ID" --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
    if [ "$menu_count" -lt 3 ]; then
      [ -n "$SHOP_ID" ] && [ "$SHOP_ID" != "0" ] && wp menu item add-post "$MENU_ID" "$SHOP_ID" --title="Mağaza" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$CART_ID" ] && [ "$CART_ID" != "0" ] && wp menu item add-post "$MENU_ID" "$CART_ID" --title="Sepet" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$CHECKOUT_ID" ] && [ "$CHECKOUT_ID" != "0" ] && wp menu item add-post "$MENU_ID" "$CHECKOUT_ID" --title="Ödeme" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$ACCOUNT_ID" ] && [ "$ACCOUNT_ID" != "0" ] && wp menu item add-post "$MENU_ID" "$ACCOUNT_ID" --title="Hesabım" --path="$WP_PATH" 2>/dev/null || true
    fi

    wp menu location assign "$MENU_ID" primary --path="$WP_PATH" 2>/dev/null || true
    wp menu location assign "$MENU_ID" secondary_menu --path="$WP_PATH" 2>/dev/null || true
    wp menu location assign "$MENU_ID" mobile_menu --path="$WP_PATH" 2>/dev/null || true
    echo "[wp-init] Ana menü atandı."
  fi

  # Footer menü
  FOOTER_MENU_ID=$(wp menu list --fields=term_id,name --format=csv --path="$WP_PATH" 2>/dev/null | grep "Footer Menüsü" | cut -d',' -f1 | head -n 1)
  if [ -z "$FOOTER_MENU_ID" ]; then
    FOOTER_MENU_ID=$(wp menu create "Footer Menüsü" --porcelain --path="$WP_PATH" 2>/dev/null || true)
  fi

  if [ -n "$FOOTER_MENU_ID" ] && [ "$FOOTER_MENU_ID" != "0" ]; then
    footer_count=$(wp menu item list "$FOOTER_MENU_ID" --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
    if [ "$footer_count" -lt 2 ]; then
      [ -n "$ABOUT_ID" ] && wp menu item add-post "$FOOTER_MENU_ID" "$ABOUT_ID" --title="Hakkımızda" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$CONTACT_ID" ] && wp menu item add-post "$FOOTER_MENU_ID" "$CONTACT_ID" --title="İletişim" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$SHIPPING_ID" ] && wp menu item add-post "$FOOTER_MENU_ID" "$SHIPPING_ID" --title="Kargo ve İade" --path="$WP_PATH" 2>/dev/null || true
      [ -n "$SHOP_ID" ] && [ "$SHOP_ID" != "0" ] && wp menu item add-post "$FOOTER_MENU_ID" "$SHOP_ID" --title="Mağaza" --path="$WP_PATH" 2>/dev/null || true
    fi
    wp menu location assign "$FOOTER_MENU_ID" footer_menu --path="$WP_PATH" 2>/dev/null || true
    echo "[wp-init] Footer menüsü atandı."
  fi

  # Footer widget alanları
  footer1_count=$(wp widget list footer-1 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer1_count" = "0" ]; then
    wp widget add text footer-1 \
      --title="$SITE_TITLE" \
      --text="Kaliteli ürünler, güvenli ödeme ve hızlı kargo ile alışverişin keyfini çıkarın." \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  footer2_count=$(wp widget list footer-2 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer2_count" = "0" ]; then
    wp widget add text footer-2 \
      --title="Müşteri Hizmetleri" \
      --text="Pazartesi–Cuma 09:00–18:00<br>destek@example.com<br>0850 000 00 00" \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  footer3_count=$(wp widget list footer-3 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer3_count" = "0" ]; then
    wp widget add text footer-3 \
      --title="Kargo Bilgisi" \
      --text="500₺ üzeri siparişlerde ücretsiz kargo.<br>1–3 iş günü içinde teslimat." \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  footer4_count=$(wp widget list footer-4 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$footer4_count" = "0" ]; then
    wp widget add text footer-4 \
      --title="Güvenli Alışveriş" \
      --text="256-bit SSL şifreleme<br>Kolay iade · Güvenli ödeme" \
      --path="$WP_PATH" 2>/dev/null || true
  fi

  echo "[wp-init] Footer widget'ları eklendi."
}

ensure_storefront_theme

# Mağaza sayfaları (shop, sepet, ödeme, hesabım)
wp wc tool run install_pages --user="$ADMIN_ID" --path="$WP_PATH" 2>/dev/null || true

wp option update woocommerce_currency TRY --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_currency_pos right_space --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_price_thousand_sep . --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_price_decimal_sep , --path="$WP_PATH" 2>/dev/null || true
wp option update blogname "$SITE_TITLE" --path="$WP_PATH" 2>/dev/null || true

wp option update woocommerce_shop_page_display "" --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_catalog_columns 4 --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_catalog_rows 3 --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_enable_ajax_add_to_cart yes --path="$WP_PATH" 2>/dev/null || true

wp option update woocommerce_task_list_hidden yes --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_extended_task_list_hidden yes --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_demo_store yes --path="$WP_PATH" 2>/dev/null || true
wp option update woocommerce_demo_store_notice "Bu bir demo mağazadır — ödeme alınmaz." --path="$WP_PATH" 2>/dev/null || true

get_or_create_term() {
  name="$1"
  slug="$2"
  existing=$(wp term list product_cat --slug="$slug" --field=term_id --path="$WP_PATH" 2>/dev/null | head -n 1)
  if [ -n "$existing" ]; then
    echo "$existing"
    return 0
  fi
  wp term create product_cat "$name" --slug="$slug" --porcelain --path="$WP_PATH" 2>/dev/null
}

CAT_ELEC=$(get_or_create_term "Elektronik" "elektronik")
CAT_FASHION=$(get_or_create_term "Moda" "moda")
CAT_HOME=$(get_or_create_term "Ev ve Yaşam" "ev-yasam")

create_product() {
  name="$1"
  price="$2"
  cat_id="$3"
  description="$4"
  sale_price="${5:-}"

  slug=$(slugify "$name")
  existing_id=$(wp post list --post_type=product --name="$slug" --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)

  if [ -n "$existing_id" ]; then
    echo "[wp-init] Ürün zaten var: $name"
    return 0
  fi

  if [ -n "$sale_price" ]; then
    product_id=$(wp wc product create \
      --name="$name" \
      --type=simple \
      --regular_price="$price" \
      --sale_price="$sale_price" \
      --description="$description" \
      --short_description="Hızlı kargo · Kolay iade" \
      --catalog_visibility=visible \
      --status=publish \
      --user="$ADMIN_ID" \
      --categories="[{\"id\":$cat_id}]" \
      --path="$WP_PATH" \
      --porcelain 2>/dev/null || true)
  else
    product_id=$(wp wc product create \
      --name="$name" \
      --type=simple \
      --regular_price="$price" \
      --description="$description" \
      --short_description="Hızlı kargo · Kolay iade" \
      --catalog_visibility=visible \
      --status=publish \
      --user="$ADMIN_ID" \
      --categories="[{\"id\":$cat_id}]" \
      --path="$WP_PATH" \
      --porcelain 2>/dev/null || true)
  fi

  if [ -n "$product_id" ] && [ "$product_id" != "0" ]; then
    echo "[wp-init] Ürün eklendi: $name (görsel AI ile eklenecek)"
  else
    echo "[wp-init] UYARI: Ürün eklenemedi: $name"
  fi
}

PRODUCT_COUNT=$(wp post list --post_type=product --format=count --path="$WP_PATH" 2>/dev/null || echo "0")

if [ "$PRODUCT_COUNT" -lt 3 ]; then
  echo "[wp-init] Örnek ürünler oluşturuluyor..."
  create_product "Kablosuz Bluetooth Kulaklık" "899.90" "$CAT_ELEC" "Gürültü engelleme özellikli kablosuz kulaklık. 24 saat pil ömrü." "749.90"
  create_product "Akıllı Saat Pro" "2499.00" "$CAT_ELEC" "Adım sayar, nabız ölçer ve bildirim desteği." ""
  create_product "Deri Sırt Çantası" "749.50" "$CAT_FASHION" "Günlük kullanım için şık ve dayanıklı deri çanta." "599.00"
  create_product "Organik Pamuk Tişört" "299.00" "$CAT_FASHION" "%100 organik pamuk, unisex kesim." ""
  create_product "Koşu Ayakkabısı" "1199.00" "$CAT_FASHION" "Hafif taban, nefes alan mesh üst yüzey." "999.00"
  create_product "French Press Kahve Demliği" "459.00" "$CAT_HOME" "Cam gövde, paslanmaz çelik filtre." ""
  create_product "Aromaterapi Mum Seti" "189.90" "$CAT_HOME" "3'lü lavanta ve vanilya kokulu mum seti." ""
  create_product "Yoga Matı" "349.00" "$CAT_HOME" "Kaymaz yüzey, taşıma askısı dahil." ""
else
  echo "[wp-init] Mevcut ürünler korunuyor (görseller AI ile güncellenecek)."
fi

SHOP_ID=$(wp option get woocommerce_shop_page_id --path="$WP_PATH" 2>/dev/null || true)

if [ -n "$SHOP_ID" ] && [ "$SHOP_ID" != "0" ]; then
  wp option update show_on_front page --path="$WP_PATH" 2>/dev/null || true
  wp option update page_on_front "$SHOP_ID" --path="$WP_PATH" 2>/dev/null || true
  echo "[wp-init] Ana sayfa mağaza olarak ayarlandı."
fi

setup_storefront_chrome

wp post delete 1 --force --path="$WP_PATH" 2>/dev/null || true

SAMPLE_PAGE=$(wp post list --post_type=page --name=sample-page --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)
if [ -n "$SAMPLE_PAGE" ]; then
  wp post delete "$SAMPLE_PAGE" --force --path="$WP_PATH" 2>/dev/null || true
fi

wp rewrite flush --path="$WP_PATH" 2>/dev/null || true

echo "[wp-init] WooCommerce mağazası hazır."
