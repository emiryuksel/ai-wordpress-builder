import { NextResponse } from "next/server";

import { fetchWordPressFromContainer } from "@/lib/docker-manager";
import {
  getWordPressUpstreamHosts,
  getSitePublicOrigin,
  getWordPressContainerSiteUrl,
  getWordPressUpstreamHostHeader,
  resolveProxyBase,
} from "@/lib/public-url";
import { resolveProjectSiteUrl, syncWordPressSiteUrl } from "@/lib/project-site-url";
import type { Project } from "@/lib/project-store";

import {
  rewriteTextForPreview,
  rewriteUrlForPreview,
  transformPreviewHtml,
} from "@/lib/preview-html-transform";
import { WP_PREVIEW_COOKIE } from "@/lib/preview-constants";

export { buildSitePreviewPath, buildSitePublicPath } from "@/lib/preview-paths";

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

export interface ProxySitePreviewOptions {
  /** @deprecated Tam HTML rewrite her zaman uygulanır. */
  mode?: "preview" | "public";
}

const UPSTREAM_FETCH_TIMEOUT_MS = 8_000;

export function resolveUpstreamOrigin(project: Project): string {
  return getWordPressContainerSiteUrl();
}

function buildProxyBase(request: Request, project: Project): string {
  return resolveProxyBase(request, project);
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
  params.delete("_pt");
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function buildUpstreamRequestHeaders(
  request: Request,
  project: Project,
): Headers {
  const filtered = filterRequestHeaders(request.headers);
  const requestUrl = new URL(request.url);

  filtered.set("Host", getWordPressUpstreamHostHeader());
  filtered.set(
    "X-Forwarded-Proto",
    requestUrl.protocol.replace(":", "") || "http",
  );

  try {
    const publicUrl = resolveProjectSiteUrl(project);
    filtered.set("X-Forwarded-Host", new URL(publicUrl).host);
  } catch {
    // ignore
  }

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

function splitCombinedSetCookieHeader(header: string): string[] {
  return header.split(/,(?=\s*[^;,=\s]+=[^;,]*)/);
}

function readUpstreamSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const combined = headers.get("set-cookie");
  if (!combined) {
    return [];
  }

  return splitCombinedSetCookieHeader(combined);
}

function resolveProxyCookiePath(request: Request, project: Project): string {
  const slug = project.slug?.trim();
  if (slug) {
    return `/${slug}`;
  }

  const pathname = new URL(request.url).pathname;
  const previewMatch = pathname.match(/^\/site-preview\/([^/]+)/);
  if (previewMatch?.[1]) {
    return `/site-preview/${previewMatch[1]}`;
  }

  return "/";
}

function rewriteSetCookieForProxy(
  cookie: string,
  request: Request,
  project: Project,
): string {
  const isSecure = new URL(request.url).protocol === "https:";

  let rewritten = cookie.replace(/;\s*domain=[^;]*/gi, "").trim();

  // WordPress sets Path=/wp-admin but the public URL is /{slug}/wp-admin.
  rewritten = rewritten.replace(/;\s*path=[^;]*/gi, "");
  rewritten += `; Path=${resolveProxyCookiePath(request, project)}`;

  if (isSecure) {
    if (!/;\s*secure\b/i.test(rewritten)) {
      rewritten += "; Secure";
    }
  } else {
    rewritten = rewritten.replace(/;\s*secure\b/gi, "");
  }

  if (!/;\s*samesite=/i.test(rewritten)) {
    rewritten += "; SameSite=Lax";
  }

  return rewritten;
}

function applyProxySetCookies(
  target: Headers,
  upstreamHeaders: Headers,
  request: Request,
  project: Project,
): void {
  for (const cookie of readUpstreamSetCookies(upstreamHeaders)) {
    target.append(
      "set-cookie",
      rewriteSetCookieForProxy(cookie, request, project),
    );
  }
}

function buildResponseHeaders(
  upstreamHeaders: Headers,
  request: Request,
  project: Project,
): Headers {
  const headers = new Headers();

  for (const [key, value] of upstreamHeaders.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }
    if (lower === "x-frame-options" || lower === "content-security-policy") {
      continue;
    }
    if (lower === "set-cookie") {
      continue;
    }
    if (lower === "location") {
      headers.set(key, value);
      continue;
    }
    headers.set(key, value);
  }

  applyProxySetCookies(headers, upstreamHeaders, request, project);

  headers.set(
    "content-security-policy",
    "frame-ancestors 'self'; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
  );

  return headers;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 307 || status === 308;
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
  let successResponse: Response | null = null;

  for (const host of hosts) {
    const upstreamUrl = `http://${host}:${project.hostPort}${pathWithSearch}`;
    if (tried.has(upstreamUrl)) {
      continue;
    }
    tried.add(upstreamUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        UPSTREAM_FETCH_TIMEOUT_MS,
      );

      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: buildUpstreamRequestHeaders(request, project),
        body: requestBody,
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status >= 200 && response.status < 300) {
        successResponse = response;
        break;
      }

      if (isRedirectStatus(response.status) && !fallbackResponse) {
        fallbackResponse = response;
        continue;
      }

      if (response.status > 0 && !fallbackResponse) {
        fallbackResponse = response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (successResponse) {
    return successResponse;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const dockerResponse = await fetchWordPressFromContainer(
      project.id,
      pathWithSearch,
    );
    if (dockerResponse && dockerResponse.status >= 200 && dockerResponse.status < 400) {
      return dockerResponse;
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

function isPublicSiteRedirect(location: string, project: Project): boolean {
  const trimmed = location.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const publicUrl = resolveProjectSiteUrl(project);
    if (trimmed.startsWith(publicUrl)) {
      return true;
    }
    const origin = getSitePublicOrigin();
    return trimmed.startsWith(origin);
  } catch {
    return false;
  }
}

function needsSiteurlSync(location: string, project: Project): boolean {
  const trimmed = location.trim();
  if (!trimmed) {
    return false;
  }

  const internal = getWordPressContainerSiteUrl().replace(/\/$/, "");
  const normalized = trimmed.replace(/\/$/, "");
  if (normalized === internal || normalized.startsWith(`${internal}/`)) {
    return false;
  }

  return isPublicSiteRedirect(trimmed, project);
}

export async function proxySitePreviewRequest(
  request: Request,
  project: Project,
  pathSegments: string[],
  options: ProxySitePreviewOptions = {},
): Promise<NextResponse> {
  const proxyBase = buildProxyBase(request, project);
  const pathWithSearch = buildUpstreamPath(request, pathSegments);

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetchUpstream(project, pathWithSearch, request);

    if (isRedirectStatus(upstreamResponse.status)) {
      const redirectLocation = upstreamResponse.headers.get("location") ?? "";
      if (needsSiteurlSync(redirectLocation, project)) {
        void syncWordPressSiteUrl(project);
        const dockerResponse = await fetchWordPressFromContainer(
          project.id,
          pathWithSearch,
        );
        if (
          dockerResponse &&
          dockerResponse.status >= 200 &&
          dockerResponse.status < 400
        ) {
          upstreamResponse = dockerResponse;
        }
      }
    }
  } catch {
    return NextResponse.json(
      { error: "WordPress önizlemesi yüklenemedi." },
      { status: 502 },
    );
  }

  const responseHeaders = buildResponseHeaders(
    upstreamResponse.headers,
    request,
    project,
  );

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
    ? await transformPreviewHtml(
        rawBody,
        project,
        proxyBase,
        (upstreamPath) => fetchUpstreamText(project, upstreamPath),
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
