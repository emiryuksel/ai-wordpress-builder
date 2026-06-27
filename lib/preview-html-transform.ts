import type { Project } from "@/lib/project-store";
import {
  buildWordPressInternalUrl,
  getSitePublicOrigin,
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
    "0.0.0.0",
    `0.0.0.0:${process.env.PORT ?? "3100"}`,
  ]);

  try {
    const containerOrigin = new URL(getWordPressContainerSiteUrl());
    patterns.add(containerOrigin.host);
    patterns.add(containerOrigin.hostname);
  } catch {
    // ignore
  }

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

function stripSlugPrefix(pathname: string, project: Project): string {
  if (!project.slug) {
    return pathname;
  }

  const prefix = `/${project.slug}`;
  if (pathname === prefix || pathname === `${prefix}/`) {
    return "/";
  }

  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/";
  }

  return pathname;
}

function dedupeSlugInUrl(url: string, project: Project): string {
  if (!project.slug) {
    return url;
  }

  const double = `/${project.slug}/${project.slug}`;
  return url.replaceAll(double, `/${project.slug}`);
}

function splitUrlHash(url: string): { base: string; hash: string } {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) {
    return { base: url, hash: "" };
  }
  return { base: url.slice(0, hashIndex), hash: url.slice(hashIndex) };
}

function isHomePagePath(pathname: string, project: Project): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/") {
    return true;
  }
  if (project.slug) {
    return normalized === `/${project.slug}`;
  }
  return false;
}

function normalizeSamePageHashLink(
  url: string,
  project: Project,
  proxyBase: string,
): string | null {
  const trimmed = url.trim();
  const { base, hash } = splitUrlHash(trimmed);
  if (!hash || hash === "#") {
    return null;
  }

  const proxy = cleanProxy(proxyBase);

  if (!base) {
    return hash;
  }

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const parsed = new URL(base);
      if (matchesWordPressHost(parsed.hostname, parsed.port, project)) {
        const path = stripSlugPrefix(parsed.pathname, project);
        if (isHomePagePath(path, project)) {
          return hash;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  if (base.startsWith("//")) {
    try {
      const parsed = new URL(`https:${base}`);
      if (matchesWordPressHost(parsed.hostname, parsed.port, project)) {
        const path = stripSlugPrefix(parsed.pathname, project);
        if (isHomePagePath(path, project)) {
          return hash;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  if (base.startsWith("/")) {
    const pathname = base.split("?")[0] ?? base;
    const path = stripSlugPrefix(pathname, project);
    if (isHomePagePath(path, project)) {
      return hash;
    }
  }

  if (base === proxy || base === `${proxy}/`) {
    return hash;
  }

  return null;
}

function rewriteUrlBaseForPreview(
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
    return dedupeSlugInUrl(trimmed, project);
  }

  if (trimmed.startsWith("?")) {
    return `${proxy}${trimmed}`;
  }

  if (trimmed.startsWith("/wp-") || trimmed.startsWith("/?")) {
    return dedupeSlugInUrl(`${proxy}${trimmed}`, project);
  }

  if (project.slug && trimmed.startsWith(`/${project.slug}/`)) {
    return dedupeSlugInUrl(
      `${proxy}${trimmed.slice(`/${project.slug}`.length)}`,
      project,
    );
  }

  if (project.slug && trimmed === `/${project.slug}`) {
    return proxy;
  }

  if (trimmed.startsWith("//")) {
    try {
      const pseudo = new URL(`https:${trimmed}`);
      if (matchesWordPressHost(pseudo.hostname, pseudo.port, project)) {
        const path =
          stripSlugPrefix(pseudo.pathname, project) + pseudo.search;
        return dedupeSlugInUrl(`${proxy}${path}`, project);
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
        const path =
          stripSlugPrefix(parsed.pathname, project) + parsed.search;
        return dedupeSlugInUrl(`${proxy}${path}`, project);
      }
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("/")) {
    const [pathname, search = ""] = trimmed.split("?");
    const path = stripSlugPrefix(pathname ?? trimmed, project);
    const rewritten = search
      ? `${proxy}${path}?${search}`
      : `${proxy}${path}`;
    return dedupeSlugInUrl(rewritten, project);
  }

  return dedupeSlugInUrl(trimmed, project);
}

export function rewriteUrlForPreview(
  url: string,
  project: Project,
  proxyBase: string,
): string {
  const trimmed = url.trim();

  if (!trimmed || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const samePageHash = normalizeSamePageHashLink(trimmed, project, proxyBase);
  if (samePageHash) {
    return samePageHash;
  }

  const { base, hash } = splitUrlHash(trimmed);
  if (!base || base.startsWith("#")) {
    return trimmed;
  }

  const rewritten = rewriteUrlBaseForPreview(base, project, proxyBase);
  return hash ? `${rewritten}${hash}` : rewritten;
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
  const publicHost = new URL(getSitePublicOrigin()).host;
  const publicSiteOrigin = getSitePublicOrigin();

  if (publicOrigin && publicOrigin !== proxyClean) {
    result = result.replaceAll(publicOrigin, proxyClean);
  }

  // Çift slug güvenlik ağı
  if (project.slug) {
    result = dedupeSlugInUrl(result, project);
  }

  // Docker içi origin sızıntıları (0.0.0.0:3100 vb.)
  const leakedOrigins = [
    `http://0.0.0.0:${process.env.PORT ?? "3100"}`,
    `https://0.0.0.0:${process.env.PORT ?? "3100"}`,
    `http://127.0.0.1:${port}`,
    `https://127.0.0.1:${port}`,
    getWordPressContainerSiteUrl(),
  ];
  for (const leaked of leakedOrigins) {
    if (leaked && leaked !== proxyClean) {
      result = result.replaceAll(leaked, proxyClean);
    }
  }

  for (const hostPattern of hostPatterns) {
    // Public domain zaten slug içeriyorsa hostname→proxy değişimi çift slug üretir.
    if (hostPattern === publicHost || hostPattern === publicSiteOrigin.replace(/^https?:\/\//, "")) {
      continue;
    }

    const escaped = hostPattern.replace(/\./g, "\\.");
    result = result.replace(
      new RegExp(`https?:\\/\\/${escaped}(?=[/"'\\s>)])`, "gi"),
      proxy,
    );
    result = result.replace(
      new RegExp(`\\/\\/${escaped}(?=[/"'\\s>)])`, "gi"),
      `//${publicHost}`,
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
    /(?<![\w./])(\/(?:wp-content|wp-includes|wp-json|wp-admin)(?:\/[^\s"'<>)]*)?)/g,
    (path) => {
      if (path.startsWith(proxy) || path.includes(`/${project.slug}/wp-`)) {
        return path;
      }
      return dedupeSlugInUrl(`${proxy}${path}`, project);
    },
  );

  return dedupeSlugInUrl(result, project);
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
  scroll-behavior: auto !important;
}
.corp-section,
#corp-hero,
#corp-footer {
  scroll-margin-top: 5rem !important;
}
#page.site {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
#masthead,
.site-header,
header.site-header,
.ast-primary-header-bar,
.site-primary-header-wrap {
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: calc(50% - 50vw) !important;
  margin-right: calc(50% - 50vw) !important;
  box-sizing: border-box !important;
}
.site-content,
#content,
.ast-separate-container .ast-article-single,
.ast-page-builder-template .site-content > .ast-container,
.corp-page {
  max-width: 1200px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 100% !important;
  box-sizing: border-box !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}
.site-header .ast-container,
.ast-primary-header-bar .ast-container,
.main-header-container {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
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
#corp-footer.corp-footer {
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: calc(50% - 50vw) !important;
  margin-right: calc(50% - 50vw) !important;
  margin-bottom: 0 !important;
  border-radius: 0 !important;
  box-sizing: border-box !important;
  padding-left: max(1.25rem, calc(50vw - 600px + 1.25rem)) !important;
  padding-right: max(1.25rem, calc(50vw - 600px + 1.25rem)) !important;
}
.site-footer,
footer.site-footer,
#colophon,
.ast-footer-overlay {
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: calc(50% - 50vw) !important;
  margin-right: calc(50% - 50vw) !important;
  box-sizing: border-box !important;
}
.site-footer .ast-container,
#colophon .ast-container {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
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
  white-space: nowrap !important;
}
.site-title,
.site-title a,
.ast-site-identity .site-title a {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  text-decoration: none !important;
}`;

function rewriteHtmlPreservingScripts(
  html: string,
  project: Project,
  proxyBase: string,
): string {
  const parts = html.split(
    /(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>)/gi,
  );
  return parts
    .map((part, index) =>
      index % 2 === 1
        ? part
        : rewriteTextForPreview(part, project, proxyBase),
    )
    .join("");
}

function rewriteStylesheetLinks(
  html: string,
  project: Project,
  proxyBase: string,
): string {
  return html.replace(/<link\b[^>]*>/gi, (linkTag) => {
    if (!/\brel=["'][^"']*stylesheet/i.test(linkTag)) {
      return linkTag;
    }

    const hrefMatch = linkTag.match(/\bhref=(["'])([^"']+)\1/i);
    if (!hrefMatch?.[2]) {
      return linkTag;
    }

    const rewritten = rewriteUrlForPreview(hrefMatch[2], project, proxyBase);
    return linkTag.replace(hrefMatch[2], rewritten);
  });
}

function disableAstraSmoothScrollToId(html: string): string {
  return html.replace(/"is_scroll_to_id"\s*:\s*"1"/g, '"is_scroll_to_id":"0"');
}

function injectInstantHashScrollScript(html: string): string {
  if (html.includes("data-preview-hash-scroll")) {
    return html;
  }

  const script =
    '<script data-preview-hash-scroll="1">(function(){document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest(\'a[href*="#"]\');if(!a)return;var href=a.getAttribute("href");if(!href||href==="#")return;var i=href.indexOf("#");if(i<0)return;var hash=href.slice(i);var id=hash.slice(1);if(!id)return;var path=href.slice(0,i);if(path){try{if(/^https?:\\/\\//i.test(path)){var u=new URL(path);if(u.origin!==location.origin)return;var p=(u.pathname.replace(/\\/$/,"")||"/");var c=(location.pathname.replace(/\\/$/,"")||"/");if(p!==c&&p+"/"!==c&&p!==c+"/")return}else if(path.charAt(0)==="/"){var bp=((path.split("#")[0]||"/").replace(/\\/$/,"")||"/");var cp=(location.pathname.replace(/\\/$/,"")||"/");if(bp!==cp&&bp+"/"!==cp&&bp!==cp+"/")return}}catch(_){return}}var el=document.getElementById(id);if(!el)return;e.preventDefault();e.stopImmediatePropagation();if(location.hash!==hash){history.replaceState(null,"",hash)}el.scrollIntoView({block:"start"});},true);})();</script>';

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${script}`);
  }

  return `${script}${html}`;
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

function injectProxyBaseTag(html: string, proxyBase: string): string {
  const baseHref = `${cleanProxy(proxyBase)}/`;
  const withoutBase = html.replace(/<base\b[^>]*>/gi, "");

  if (/<head[^>]*>/i.test(withoutBase)) {
    return withoutBase.replace(
      /<head[^>]*>/i,
      (match) => `${match}<base href="${baseHref}">`,
    );
  }

  return `<base href="${baseHref}">${withoutBase}`;
}

export async function transformPreviewHtml(
  html: string,
  project: Project,
  proxyBase: string,
  _fetchCss?: (upstreamPath: string) => Promise<string>,
  _options?: { lightweight?: boolean },
): Promise<string> {
  let result = rewriteHtmlPreservingScripts(html, project, proxyBase);
  result = disableAstraSmoothScrollToId(result);
  result = injectProxyBaseTag(result, proxyBase);
  result = rewriteHtmlAttributes(result, project, proxyBase);
  result = rewriteStylesheetLinks(result, project, proxyBase);
  result = injectInstantHashScrollScript(result);
  result = injectPreviewLayoutCss(result);
  return result;
}
