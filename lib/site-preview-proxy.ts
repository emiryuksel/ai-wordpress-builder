import { NextResponse } from "next/server";

import {
  buildWordPressSiteUrl,
  getWordPressReachabilityHosts,
} from "@/lib/public-url";
import type { Project } from "@/lib/project-store";

import { WP_PREVIEW_COOKIE } from "@/lib/preview-constants";

const REWRITE_CONTENT_TYPES = new Set([
  "text/html",
  "text/css",
  "application/javascript",
  "text/javascript",
  "application/json",
  "application/xml",
  "text/xml",
]);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

export function buildSitePreviewPath(
  projectId: string,
  cacheBuster?: number,
): string {
  const suffix = cacheBuster ? `?_preview=${cacheBuster}` : "";
  return `/site-preview/${projectId}${suffix}`;
}

export function resolveUpstreamOrigin(project: Project): string {
  try {
    const url = new URL(project.siteUrl);
    if (url.hostname && !url.hostname.startsWith("=")) {
      const port = url.port || String(project.hostPort);
      return `${url.protocol}//${url.hostname}:${port}`;
    }
  } catch {
    // Geçersiz siteUrl — hostPort ile yeniden oluştur.
  }

  return buildWordPressSiteUrl(project.hostPort);
}

function buildProxyBase(request: Request, projectId: string): string {
  const origin = new URL(request.url).origin;
  return `${origin}/site-preview/${projectId}`;
}

function buildUpstreamPath(
  request: Request,
  pathSegments: string[],
): string {
  const incoming = new URL(request.url);
  const path =
    pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";
  return incoming.search ? `${path}${incoming.search}` : path;
}

function filterRequestHeaders(headers: Headers): Headers {
  const filtered = new Headers();

  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection") {
      continue;
    }
    filtered.set(key, value);
  }

  return filtered;
}

function isAlreadyProxied(value: string, proxy: string): boolean {
  return (
    value.includes(`${proxy}/wp-content`) ||
    value.includes(`${proxy}/wp-includes`) ||
    value.includes("/site-preview/")
  );
}

/** Tüm http(s)://host:PORT referanslarını proxy köküne çevir (mixed content önleme). */
function rewritePortUrls(text: string, port: number, proxy: string): string {
  const portPattern = String(port);
  let result = text.replace(
    new RegExp(
      `https?:\\/\\/[^"'\\s<>)]+:${portPattern}(?=[/"'\\s>)])`,
      "gi",
    ),
    proxy,
  );

  try {
    const proxyUrl = new URL(proxy);
    const protocolRelative =
      `//${proxyUrl.host}${proxyUrl.pathname}`.replace(/\/$/, "");
    result = result.replace(
      new RegExp(
        `\\/\\/[^"'\\s<>)]+:${portPattern}(?=[/"'\\s>)])`,
        "gi",
      ),
      protocolRelative,
    );
  } catch {
    // ignore
  }

  return result;
}

function rewriteWpRootPath(path: string, proxy: string): string {
  const cleanProxy = proxy.replace(/\/$/, "");
  if (path.startsWith(cleanProxy)) {
    return path;
  }
  return `${cleanProxy}${path}`;
}

function rewriteSrcsetValue(value: string, proxy: string, port: number): string {
  return value
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();
      const spaceIndex = trimmed.search(/\s+\d/);
      const url =
        spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex).trim();
      const descriptor =
        spaceIndex === -1 ? "" : trimmed.slice(spaceIndex).trim();

      let nextUrl = rewritePortUrls(url, port, proxy);
      if (url.startsWith("/") && !isAlreadyProxied(url, proxy)) {
        nextUrl = rewriteWpRootPath(url, proxy);
      }

      return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
    })
    .join(", ");
}

function rewriteRootRelativeWpUrls(text: string, proxy: string): string {
  const cleanProxy = proxy.replace(/\/$/, "");

  let result = text.replace(
    /(?<![\w./])(\/(?:wp-content|wp-includes|wp-json)(?:\/[^\s"'<>)]*)?)/g,
    (path) => {
      if (path.startsWith(cleanProxy) || isAlreadyProxied(path, proxy)) {
        return path;
      }
      return `${cleanProxy}${path}`;
    },
  );

  result = result.replace(
    /(^|["'(=:,\s])(\/(?:wp-content|wp-includes|wp-json)[^"'()\s,>]*)/g,
    (match, prefix, path) => {
      if (path.startsWith(cleanProxy) || isAlreadyProxied(path, proxy)) {
        return match;
      }
      return `${prefix}${cleanProxy}${path}`;
    },
  );

  return result;
}

function injectHtmlBaseTag(html: string, proxy: string): string {
  const baseTag = `<base href="${proxy.replace(/\/$/, "")}/">`;
  if (html.includes("<base ")) {
    return html;
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
}

function attachPreviewCookie(
  response: NextResponse,
  projectId: string,
): NextResponse {
  response.cookies.set(WP_PREVIEW_COOKIE, projectId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });
  return response;
}

function rewriteBody(
  body: string,
  project: Project,
  proxyBase: string,
  contentType: string,
): string {
  const proxy = proxyBase.replace(/\/$/, "");
  const port = project.hostPort;

  let result = rewritePortUrls(body, port, proxy);
  result = rewriteRootRelativeWpUrls(result, proxy);

  result = result.replace(
    /\bsrcset=(["'])(.*?)\1/gi,
    (match, quote, value) => {
      if (isAlreadyProxied(value, proxy)) {
        return match;
      }
      return `srcset=${quote}${rewriteSrcsetValue(value, proxy, port)}${quote}`;
    },
  );

  result = result.replace(
    /\b(?:href|src|action|content|poster|data-src|data-lazy-src|data-bg|data-background|imagesrcset)=(["'])(\/(?!\/)[^"']*)\2/gi,
    (match, _quote, path) => {
      if (!path.startsWith("/wp-") || isAlreadyProxied(path, proxy)) {
        return match;
      }
      return match.replace(path, rewriteWpRootPath(path, proxy));
    },
  );

  if (contentType.includes("text/html")) {
    result = injectHtmlBaseTag(result, proxy);
  }

  return result;
}

function rewriteLocation(
  location: string,
  project: Project,
  proxyBase: string,
): string {
  const proxy = proxyBase.replace(/\/$/, "");
  let next = rewritePortUrls(location, project.hostPort, proxy);
  if (next.startsWith("/wp-")) {
    next = `${proxy}${next}`;
  }
  return next;
}

function buildResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers();

  for (const [key, value] of upstreamHeaders.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }
    if (lower === "x-frame-options" || lower === "content-security-policy") {
      continue;
    }
    if (lower === "location") {
      headers.set(key, value);
      continue;
    }
    headers.set(key, value);
  }

  headers.set(
    "content-security-policy",
    "frame-ancestors 'self'; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
  );

  return headers;
}

async function fetchUpstream(
  project: Project,
  pathWithSearch: string,
  request: Request,
): Promise<Response> {
  const hosts = [
    ...getWordPressReachabilityHosts(),
    ...(() => {
      try {
        return [new URL(resolveUpstreamOrigin(project)).hostname];
      } catch {
        return [];
      }
    })(),
  ];

  const requestBody =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

  const tried = new Set<string>();
  let lastError: unknown;

  for (const host of hosts) {
    const upstreamUrl = `http://${host}:${project.hostPort}${pathWithSearch}`;
    if (tried.has(upstreamUrl)) {
      continue;
    }
    tried.add(upstreamUrl);

    try {
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: filterRequestHeaders(request.headers),
        body: requestBody,
        redirect: "manual",
      });

      if (response.status > 0) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("WordPress önizlemesi yüklenemedi.");
}

export async function proxySitePreviewRequest(
  request: Request,
  project: Project,
  pathSegments: string[],
): Promise<NextResponse> {
  const proxyBase = buildProxyBase(request, project.id);
  const pathWithSearch = buildUpstreamPath(request, pathSegments);

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetchUpstream(project, pathWithSearch, request);
  } catch {
    return NextResponse.json(
      { error: "WordPress önizlemesi yüklenemedi." },
      { status: 502 },
    );
  }

  const responseHeaders = buildResponseHeaders(upstreamResponse.headers);

  const location = upstreamResponse.headers.get("location");
  if (location) {
    responseHeaders.set(
      "location",
      rewriteLocation(location, project, proxyBase),
    );
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  const shouldRewrite = [...REWRITE_CONTENT_TYPES].some((type) =>
    contentType.includes(type),
  );

  if (!shouldRewrite) {
    return attachPreviewCookie(
      new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      }),
      project.id,
    );
  }

  const rawBody = await upstreamResponse.text();
  const rewritten = rewriteBody(rawBody, project, proxyBase, contentType);

  responseHeaders.delete("content-length");
  return attachPreviewCookie(
    new NextResponse(rewritten, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    }),
    project.id,
  );
}

export function isPreviewAssetPath(path: string[] | undefined): boolean {
  if (!path?.length) {
    return false;
  }
  const root = path[0];
  return root === "wp-content" || root === "wp-includes" || root === "wp-json";
}
