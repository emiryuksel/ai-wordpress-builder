import type { Project } from "@/lib/project-store";
import {
  buildWordPressInternalUrl,
  getWordPressContainerSiteUrl,
  getWordPressProxyHost,
} from "@/lib/public-url";
import { resolveProjectSiteUrl } from "@/lib/project-site-url";

function cleanProxy(proxyBase: string): string {
  return proxyBase.replace(/\/$/, "");
}

function getRewriteHostPatterns(project: Project): string[] {
  const port = String(project.hostPort);
  const patterns = new Set<string>([
    "127.0.0.1",
    `localhost:${port}`,
    `127.0.0.1:${port}`,
    `${getWordPressProxyHost()}:${port}`,
  ]);

  try {
    const publicUrl = new URL(resolveProjectSiteUrl(project));
    patterns.add(publicUrl.host);
    patterns.add(publicUrl.hostname);
  } catch {
    // ignore
  }

  try {
    const internal = new URL(buildWordPressInternalUrl(project.hostPort));
    patterns.add(internal.host);
  } catch {
    // ignore
  }

  return [...patterns];
}

function matchesWordPressHost(
  hostname: string,
  urlPort: string,
  project: Project,
): boolean {
  const wpPort = String(project.hostPort);
  const effectivePort = urlPort || wpPort;

  try {
    const publicHost = new URL(resolveProjectSiteUrl(project)).hostname;
    if (hostname === publicHost) {
      return true;
    }
  } catch {
    // ignore
  }

  return getRewriteHostPatterns(project).includes(`${hostname}:${effectivePort}`);
}

export function rewriteUrlForPreview(
  url: string,
  project: Project,
  proxyBase: string,
): string {
  const proxy = cleanProxy(proxyBase);
  const port = String(project.hostPort);
  const trimmed = url.trim();

  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("#")) {
    return trimmed;
  }

  if (trimmed.startsWith(`${proxy}/`) || trimmed.includes("/site-preview/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/wp-") || trimmed.startsWith("/?")) {
    return `${proxy}${trimmed}`;
  }

  if (project.slug && trimmed.startsWith(`/${project.slug}/`)) {
    return `${proxy}${trimmed.slice(`/${project.slug}`.length)}`;
  }

  if (project.slug && trimmed === `/${project.slug}`) {
    return proxy;
  }

  if (trimmed.startsWith("//")) {
    try {
      const pseudo = new URL(`https:${trimmed}`);
      if (matchesWordPressHost(pseudo.hostname, pseudo.port, project)) {
        return `${proxy}${pseudo.pathname}${pseudo.search}`;
      }
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (
        matchesWordPressHost(parsed.hostname, parsed.port, project) ||
        parsed.port === port ||
        (!parsed.port && port === "80")
      ) {
        return `${proxy}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("/")) {
    return `${proxy}${trimmed}`;
  }

  return trimmed;
}

export function rewriteTextForPreview(
  text: string,
  project: Project,
  proxyBase: string,
): string {
  const proxy = cleanProxy(proxyBase);
  const port = project.hostPort;
  const hostPatterns = getRewriteHostPatterns(project);

  let result = text;

  const publicOrigin = resolveProjectSiteUrl(project).replace(/\/$/, "");
  const proxyClean = cleanProxy(proxyBase);
  if (publicOrigin && publicOrigin !== proxyClean) {
    result = result.replaceAll(publicOrigin, proxyClean);
  }

  for (const hostPattern of hostPatterns) {
    const escaped = hostPattern.replace(/\./g, "\\.");
    result = result.replace(
      new RegExp(`https?:\\/\\/${escaped}(?=[/"'\\s>)])`, "gi"),
      proxy,
    );
    result = result.replace(
      new RegExp(`\\/\\/${escaped}(?=[/"'\\s>)])`, "gi"),
      `//${new URL(proxy).host}`,
    );
  }

  result = result.replace(
    new RegExp(`https?:\\/\\/[^"'\\s<>)]+:${port}(?=[/"'\\s>)])`, "gi"),
    proxy,
  );

  result = result.replace(
    new RegExp(`\\/\\/[^"'\\s<>)]+:${port}(?=[/"'\\s>)])`, "gi"),
    (match) => {
      try {
        const pseudo = new URL(`https:${match}`);
        return `//${new URL(proxy).host}${pseudo.pathname}${pseudo.search}`;
      } catch {
        return match;
      }
    },
  );

  result = result.replace(
    /(?<![\w./])(\/(?:wp-content|wp-includes|wp-json)(?:\/[^\s"'<>)]*)?)/g,
    (path) => {
      if (path.startsWith(proxy)) {
        return path;
      }
      return `${proxy}${path}`;
    },
  );

  return result;
}

function resolveRelativePath(basePath: string, relativeUrl: string): string {
  const baseDir = basePath.replace(/\/[^/]*$/, "/");
  const output: string[] = baseDir.split("/").filter(Boolean);

  for (const segment of relativeUrl.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      output.pop();
      continue;
    }
    output.push(segment);
  }

  return `/${output.join("/")}`;
}

function rewriteCssUrls(
  cssText: string,
  cssUpstreamPath: string,
  project: Project,
  proxyBase: string,
): string {
  const withoutImports = cssText.replace(
    /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*;?/gi,
    (match, _q1, url1, _q2, url2) => {
      const raw = (url1 ?? url2 ?? "").trim();
      if (!raw || raw.startsWith("data:")) {
        return match;
      }
      const absolute = raw.startsWith("/")
        ? raw
        : resolveRelativePath(cssUpstreamPath, raw);
      const rewritten = rewriteUrlForPreview(absolute, project, proxyBase);
      return `@import url("${rewritten}");`;
    },
  );

  return withoutImports.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (match, quote, rawUrl) => {
      const url = rawUrl.trim();
      if (!url || url.startsWith("data:") || url.startsWith("#")) {
        return match;
      }

      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("//")
      ) {
        return `url(${quote}${rewriteUrlForPreview(url, project, proxyBase)}${quote})`;
      }

      const absolute = url.startsWith("/")
        ? url
        : resolveRelativePath(cssUpstreamPath, url);
      return `url(${quote}${rewriteUrlForPreview(absolute, project, proxyBase)}${quote})`;
    },
  );
}

function resolveUpstreamPath(
  href: string,
  project: Project,
  proxyBase?: string,
): string | null {
  const port = String(project.hostPort);
  const proxy = proxyBase ? cleanProxy(proxyBase) : null;

  if (proxy && href.startsWith(`${proxy}/`)) {
    const path = href.slice(proxy.length);
    return path.startsWith("/") ? path : `/${path}`;
  }

  if (href.startsWith("/")) {
    return href;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const parsed = new URL(href);
      if (
        matchesWordPressHost(parsed.hostname, parsed.port, project) ||
        parsed.port === port
      ) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return null;
    }
  }

  if (href.startsWith("//")) {
    try {
      const parsed = new URL(`https:${href}`);
      if (matchesWordPressHost(parsed.hostname, parsed.port, project)) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return null;
    }
  }

  try {
    const origin = resolveProjectSiteUrl(project);
    const parsed = new URL(href, `${origin}/`);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

function rewriteSrcsetAttribute(
  value: string,
  project: Project,
  proxyBase: string,
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
      const nextUrl = rewriteUrlForPreview(url, project, proxyBase);
      return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
    })
    .join(", ");
}

function rewriteHtmlAttributes(
  html: string,
  project: Project,
  proxyBase: string,
): string {
  const attrNames =
    "href|src|action|content|poster|data-src|data-lazy-src|data-bg|data-background|imagesrcset";

  let result = html.replace(
    new RegExp(`\\b(${attrNames})=(["'])([^"']+)\\2`, "gi"),
    (_match, attr, quote, value) => {
      if (attr.toLowerCase() === "srcset" || attr.toLowerCase() === "imagesrcset") {
        return `${attr}=${quote}${rewriteSrcsetAttribute(value, project, proxyBase)}${quote}`;
      }
      return `${attr}=${quote}${rewriteUrlForPreview(value, project, proxyBase)}${quote}`;
    },
  );

  result = result.replace(
    /\bsrcset=(["'])(.*?)\1/gi,
    (_match, quote, value) =>
      `srcset=${quote}${rewriteSrcsetAttribute(value, project, proxyBase)}${quote}`,
  );

  return result;
}

const PREVIEW_LAYOUT_FIX_CSS = `/* ai-wp:preview-layout */
body.home .entry-header,
body.home .ast-single-entry-header,
.home .entry-header,
.page .entry-header .entry-title {
  display: none !important;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  overflow-x: hidden !important;
  background: #f8fafc !important;
}
#page.site,
.site-content,
#content,
.ast-separate-container .ast-article-single,
.ast-page-builder-template .site-content > .ast-container {
  max-width: 1200px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 100% !important;
  box-sizing: border-box !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}
#masthead,
.site-header,
.ast-primary-header-bar {
  width: 100% !important;
  background: #fff !important;
  border-bottom: 1px solid #e2e8f0 !important;
}
.ast-primary-header-bar .ast-container,
.main-header-container,
.ast-builder-grid-row-container,
.site-primary-header-wrap .ast-builder-grid-row-container {
  max-width: 1200px !important;
  margin: 0 auto !important;
  width: 100% !important;
  padding: 0.75rem 1.25rem !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  flex-wrap: wrap !important;
}
.site-header-primary-section-left,
.site-header-primary-section-right,
.ast-builder-layout-element,
.ast-builder-menu-1,
.main-header-bar-navigation {
  display: flex !important;
  align-items: center !important;
}
.main-header-menu,
.main-navigation ul,
.ast-builder-menu-1 .main-header-menu,
.ast-builder-menu-1 nav > ul,
#ast-hf-menu-1,
.ast-nav-menu {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 0.25rem 1.25rem !important;
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.main-header-menu > li,
.main-navigation li,
.ast-builder-menu-1 .menu-item {
  display: block !important;
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.main-header-menu a,
.main-navigation a,
.ast-builder-menu-1 .menu-item > a {
  display: inline-block !important;
  padding: 0.35rem 0 !important;
  text-decoration: none !important;
  color: #334155 !important;
  white-space: nowrap !important;
}
.site-title,
.site-title a,
.ast-site-identity .site-title a {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  text-decoration: none !important;
}
.corp-page {
  margin: 0 auto !important;
  max-width: 100% !important;
}`;

async function inlineStylesheets(
  html: string,
  project: Project,
  proxyBase: string,
  fetchCss: (upstreamPath: string) => Promise<string>,
): Promise<string> {
  let result = html;
  const linkTags = [...result.matchAll(/<link\b[^>]*>/gi)].map(
    (match) => match[0],
  );

  for (const linkTag of linkTags) {
    if (!/\brel=["'][^"']*stylesheet/i.test(linkTag)) {
      continue;
    }

    const hrefMatch = linkTag.match(/\bhref=(["'])([^"']+)\1/i);
    if (!hrefMatch?.[2]) {
      continue;
    }

    const upstreamPath = resolveUpstreamPath(hrefMatch[2], project, proxyBase);
    if (!upstreamPath) {
      continue;
    }

    try {
      const cssText = await fetchCss(upstreamPath);
      const inlined = rewriteCssUrls(
        rewriteTextForPreview(cssText, project, proxyBase),
        upstreamPath.split("?")[0] ?? upstreamPath,
        project,
        proxyBase,
      );
      result = result.replace(
        linkTag,
        `<style data-preview-inlined="1">${inlined}</style>`,
      );
    } catch {
      const rewrittenTag = linkTag.replace(
        hrefMatch[2],
        rewriteUrlForPreview(hrefMatch[2], project, proxyBase),
      );
      result = result.replace(linkTag, rewrittenTag);
    }
  }

  return result;
}

function injectPreviewLayoutCss(html: string): string {
  if (html.includes("ai-wp:preview-layout")) {
    return html;
  }

  if (/<\/head>/i.test(html)) {
    return html.replace(
      /<\/head>/i,
      `<style data-preview-layout="1">${PREVIEW_LAYOUT_FIX_CSS}</style></head>`,
    );
  }

  return `<style data-preview-layout="1">${PREVIEW_LAYOUT_FIX_CSS}</style>${html}`;
}

export async function transformPreviewHtml(
  html: string,
  project: Project,
  proxyBase: string,
  fetchCss: (upstreamPath: string) => Promise<string>,
  options?: { lightweight?: boolean },
): Promise<string> {
  let result = rewriteTextForPreview(html, project, proxyBase);
  result = result.replace(/<base\b[^>]*>/gi, "");
  result = rewriteHtmlAttributes(result, project, proxyBase);
  if (!options?.lightweight) {
    result = await inlineStylesheets(result, project, proxyBase, fetchCss);
    result = injectPreviewLayoutCss(result);
  }
  return result;
}
