import { NextResponse } from "next/server";

import { buildWordPressSiteUrl } from "@/lib/public-url";
import type { Project } from "@/lib/project-store";

const REWRITE_CONTENT_TYPES = new Set([
  "text/html",
  "text/css",
  "application/javascript",
  "text/javascript",
  "application/json",
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

function buildUpstreamUrl(
  request: Request,
  upstreamOrigin: string,
  pathSegments: string[],
): URL {
  const upstream = new URL(
    pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/",
    `${upstreamOrigin.replace(/\/$/, "")}/`,
  );
  const incoming = new URL(request.url);

  incoming.searchParams.forEach((value, key) => {
    if (key === "_preview") {
      return;
    }
    upstream.searchParams.set(key, value);
  });

  return upstream;
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

function rewriteBody(
  body: string,
  upstreamOrigin: string,
  proxyBase: string,
): string {
  const upstream = upstreamOrigin.replace(/\/$/, "");
  const proxy = proxyBase.replace(/\/$/, "");
  let result = body.replaceAll(upstream, proxy);

  // Kök-göreli WordPress yolları (/wp-content, /wp-includes, …)
  result = result.replace(
    /(\s(?:href|src|action)=["'])\/(?!\/)/gi,
    `$1${proxy}/`,
  );
  result = result.replace(/url\(\s*\/(?!\/)/gi, `url(${proxy}/`);
  result = result.replace(/url\(\s*["']\/(?!\/)/gi, `url("${proxy}/`);

  return result;
}

function rewriteLocation(
  location: string,
  upstreamOrigin: string,
  proxyBase: string,
): string {
  const upstream = upstreamOrigin.replace(/\/$/, "");
  const proxy = proxyBase.replace(/\/$/, "");

  if (location.startsWith(upstream)) {
    return `${proxy}${location.slice(upstream.length)}`;
  }

  if (location.startsWith("/")) {
    return `${proxy}${location}`;
  }

  return location;
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

export async function proxySitePreviewRequest(
  request: Request,
  project: Project,
  pathSegments: string[],
): Promise<NextResponse> {
  const upstreamOrigin = resolveUpstreamOrigin(project);
  const proxyBase = buildProxyBase(request, project.id);
  const upstreamUrl = buildUpstreamUrl(request, upstreamOrigin, pathSegments);

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers: filterRequestHeaders(request.headers),
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.arrayBuffer()
          : undefined,
      redirect: "manual",
    });
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
      rewriteLocation(location, upstreamOrigin, proxyBase),
    );
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  const shouldRewrite = [...REWRITE_CONTENT_TYPES].some((type) =>
    contentType.includes(type),
  );

  if (!shouldRewrite) {
    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  const rawBody = await upstreamResponse.text();
  const rewritten = rewriteBody(rawBody, upstreamOrigin, proxyBase);

  responseHeaders.delete("content-length");
  return new NextResponse(rewritten, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
