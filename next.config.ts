import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // WordPress /wp-admin/ trailing slash'ini gerektirir; Next.js'in otomatik
  // /wp-admin/ → /wp-admin (308) yönlendirmesi WP'nin 301'i ile döngü yaratır.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
