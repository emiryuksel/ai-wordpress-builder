import fs from "node:fs/promises";
import path from "node:path";

import { execWpCliSh } from "@/lib/docker-manager";
import { getRuntimeRoot } from "@/lib/data-paths";

export const CORPORATE_WP_GUARD_FILENAME = "ai-wp-corporate-content.php";

export const CORPORATE_WP_GUARD_PHP = `<?php
/**
 * Plugin Name: AI WP Corporate Content Guard
 * Description: Kurumsal ana sayfa HTML'ini ve görselleri WordPress filtrelerinden korur.
 */
if (!defined('ABSPATH')) {
    exit;
}

function ai_wp_corporate_has_marker($content) {
    return is_string($content) && strpos($content, 'ai-wp:corporate-home') !== false;
}

function ai_wp_corporate_should_guard() {
    if (!is_singular('page')) {
        return false;
    }
    $post = get_queried_object();
    return $post instanceof WP_Post && ai_wp_corporate_has_marker($post->post_content);
}

function ai_wp_corporate_disable_content_filters() {
    remove_filter('the_content', 'wpautop');
    remove_filter('the_content', 'shortcode_unautop');
    remove_filter('the_content', 'wptexturize');
    remove_filter('the_content', 'wp_filter_content_tags');
}

function ai_wp_corporate_repair_image_tags($content) {
    $content = preg_replace('/(<img\\b[^>]*?)"\\s*\\/(\\s+(?:loading|fetchpriority|decoding)=)/i', '$1"$2', $content);
    return preg_replace('/<img\\b([^>]*?)\\s*\\/>/i', '<img$1>', $content);
}

add_filter('the_content', function ($content) {
    if (!ai_wp_corporate_has_marker($content)) {
        return $content;
    }
    ai_wp_corporate_disable_content_filters();
    return ai_wp_corporate_repair_image_tags($content);
}, 7);

add_filter('content_save_pre', function ($content) {
    if (!ai_wp_corporate_has_marker($content)) {
        return $content;
    }
    remove_filter('content_save_pre', 'wp_filter_content_tags');
    return ai_wp_corporate_repair_image_tags($content);
}, 8);

add_action('wp_footer', function () {
    if (!ai_wp_corporate_should_guard()) {
        return;
    }
    echo '<script data-ai-wp-corp-images="1">(function(){function reloadCorpImages(){document.querySelectorAll(".corp-hero-img,.corp-card-img,.corp-gallery-item img").forEach(function(img){var src=img.getAttribute("src");if(src&&(!img.complete||img.naturalWidth===0)){img.setAttribute("src",src);}});}window.addEventListener("pageshow",function(e){if(e.persisted){reloadCorpImages();}});if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",reloadCorpImages);}else{reloadCorpImages();}})();</script>';
}, 99);
`;

export async function installCorporateWpGuard(projectId: string): Promise<void> {
  const corporateDir = path.join(getRuntimeRoot(), projectId, "corporate-images");
  await fs.mkdir(corporateDir, { recursive: true });
  const localPath = path.join(corporateDir, CORPORATE_WP_GUARD_FILENAME);
  await fs.writeFile(localPath, CORPORATE_WP_GUARD_PHP, "utf8");

  await execWpCliSh(
    projectId,
    `mkdir -p /var/www/html/wp-content/mu-plugins && cp /corporate-images/${CORPORATE_WP_GUARD_FILENAME} /var/www/html/wp-content/mu-plugins/${CORPORATE_WP_GUARD_FILENAME}`,
    60_000,
  );
}
