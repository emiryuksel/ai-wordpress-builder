import { type NextRequest, NextResponse } from "next/server";

import { WP_PREVIEW_COOKIE } from "@/lib/preview-constants";

const WP_ASSET_PREFIXES = ["/wp-content", "/wp-includes", "/wp-json"] as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!WP_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const projectId = request.cookies.get(WP_PREVIEW_COOKIE)?.value;
  if (!projectId) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/site-preview/${projectId}${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/wp-content/:path*", "/wp-includes/:path*", "/wp-json/:path*"],
};
