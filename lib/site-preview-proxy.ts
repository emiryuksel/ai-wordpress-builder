import { NextResponse } from "next/server";

import { buildWordPressSiteUrl } from "@/lib/public-url";
import type { Project } from "@/lib/project-store";

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

function collectUpstreamOrigins(project: Project): string[] {
  const origins = new Set<string>();
  const primary = resolveUpstreamOrigin(project).replace(/\/$/, "");
  origins.add(primary);

  const fromPort = buildWordPressSiteUrl(project.hostPort).replace(/\/$/, "");
  origins.add(fromPort);

  origins.add(`http://127.0.0.1:${project.hostPort}`);
  origins.add(`http://localhost:${project.hostPort}`);

  try {
    const host = new URL(primary).host;
    origins.add(`//${host}`);
    origins.add(`http://${host}`);
    origins.add(`https://${host}`);
  } catch {
    // ignore
  }

  try {
    const malformed = new URL(project.siteUrl);
    if (malformed.hostname.startsWith("=")) {
      const fixed = malformed.hostname.replace(/^=+/, "");
      origins.add(`http://${fixed}:${project.hostPort}`);
    }
  } catch {
    // ignore
  }

  return [...origins].sort((a, b) => b.length - a.length);
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

function isAlreadyProxied(value: string, proxy: string): boolean {
  return (
    value.includes(`${proxy}/wp-content`) ||
    value.includes(`${proxy}/wp-includes`)
  );
}

function rewriteAbsoluteUrls(
  text: string,
  origins: string[],
  proxy: string,
): string {
  let result = text;

  for (const origin of origins) {
    if (!origin || origin === proxy) {
      continue;
    }
    result = result.replaceAll(origin, proxy);
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

function rewriteSrcsetValue(
  value: string,
  origins: string[],
  proxy: string,
): string {
  return value
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();
      const spaceIndex = trimmed.search(/\s+\d/);
      const url =
        spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex).trim();
      const descriptor =
        spaceIndex === -1 ? "" : trimmed.slice(spaceIndex).trim();

      let nextUrl = url;
      if (url.startsWith("/")) {
        nextUrl = rewriteWpRootPath(url, proxy);
      } else {
        for (const origin of origins) {
          if (url.startsWith(origin)) {
            nextUrl = `${proxy}${url.slice(origin.length)}`;
            break;
          }
        }
      }

      return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
    })
    .join(", ");
}

function rewriteRootRelativeWpUrls(text: string, proxy: string): string {
  const cleanProxy = proxy.replace(/\/$/, "");

  return text.replace(
    /(^|["'(=\s])(\/(?:wp-content|wp-includes|wp-json)[^"'()\s,>]*)/g,
    (match, prefix, path) => {
      if (path.startsWith(cleanProxy) || isAlreadyProxied(path, proxy)) {
        return match;
      }
      return `${prefix}${cleanProxy}${path}`;
    },
  );
}

function rewriteBody(
  body: string,
  project: Project,
  proxyBase: string,
): string {
  const proxy = proxyBase.replace(/\/$/, "");
  const origins = collectUpstreamOrigins(project);

  let result = rewriteAbsoluteUrls(body, origins, proxy);

  result = result.replace(
    /\bsrcset=(["'])(.*?)\1/gi,
    (match, quote, value) => {
      if (isAlreadyProxied(value, proxy)) {
        return match;
      }
      return `srcset=${quote}${rewriteSrcsetValue(value, origins, proxy)}${quote}`;
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

  result = result.replace(
    /url\(\s*(["']?)(\/(?:wp-content|wp-includes)[^"')]*)\1\s*\)/gi,
    (match, quote, path) => {
      if (isAlreadyProxied(path, proxy)) {
        return match;
      }
      return `url(${quote}${rewriteWpRootPath(path, proxy)}${quote})`;
    },
  );

  result = rewriteRootRelativeWpUrls(result, proxy);

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

  if (location.startsWith("/wp-")) {
    return `${proxy}${location}`;
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
  const rewritten = rewriteBody(rawBody, project, proxyBase);

  responseHeaders.delete("content-length");
  return new NextResponse(rewritten, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
