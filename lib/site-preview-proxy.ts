import { NextResponse } from "next/server";

import {
  buildWordPressSiteUrl,
  getWordPressUpstreamHosts,
} from "@/lib/public-url";
import type { Project } from "@/lib/project-store";

import {
  rewriteTextForPreview,
  rewriteUrlForPreview,
  transformPreviewHtml,
} from "@/lib/preview-html-transform";
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
  return buildWordPressSiteUrl(project.hostPort);
}

function buildProxyBase(request: Request, projectId: string): string {
  const origin = new URL(request.url).origin;
  return `${origin}/site-preview/${projectId}`;
}

function getUpstreamHostHeader(project: Project): string {
  try {
    return new URL(resolveUpstreamOrigin(project)).host;
  } catch {
    return `127.0.0.1:${project.hostPort}`;
  }
}

function buildUpstreamPath(
  request: Request,
  pathSegments: string[],
): string {
  const incoming = new URL(request.url);
  const path =
    pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";
  const params = new URLSearchParams(incoming.search);
  params.delete("_preview");
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function buildUpstreamRequestHeaders(
  request: Request,
  project: Project,
): Headers {
  const filtered = filterRequestHeaders(request.headers);
  filtered.set("Host", getUpstreamHostHeader(project));
  return filtered;
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

function rewriteLocation(
  location: string,
  project: Project,
  proxyBase: string,
): string {
  return rewriteUrlForPreview(location, project, proxyBase);
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
    ...getWordPressUpstreamHosts(),
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
  let fallbackResponse: Response | null = null;

  for (const host of hosts) {
    const upstreamUrl = `http://${host}:${project.hostPort}${pathWithSearch}`;
    if (tried.has(upstreamUrl)) {
      continue;
    }
    tried.add(upstreamUrl);

    try {
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: buildUpstreamRequestHeaders(request, project),
        body: requestBody,
        redirect: "follow",
      });

      if (response.status >= 200 && response.status < 300) {
        return response;
      }

      if (response.status > 0 && !fallbackResponse) {
        fallbackResponse = response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (fallbackResponse) {
    return fallbackResponse;
  }

  throw lastError ?? new Error("WordPress önizlemesi yüklenemedi.");
}

export async function fetchUpstreamText(
  project: Project,
  upstreamPath: string,
): Promise<string> {
  const response = await fetchUpstream(
    project,
    upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`,
    new Request("http://preview-local"),
  );
  return response.text();
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
  const rewritten = contentType.includes("text/html")
    ? await transformPreviewHtml(rawBody, project, proxyBase, (upstreamPath) =>
        fetchUpstreamText(project, upstreamPath),
      )
    : rewriteTextForPreview(rawBody, project, proxyBase);

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
