import type { Project } from "@/lib/project-store";
import { buildWordPressSiteUrl } from "@/lib/public-url";

function cleanProxy(proxyBase: string): string {
  return proxyBase.replace(/\/$/, "");
}

function getRewriteHostPatterns(project: Project): string[] {
  const port = String(project.hostPort);
  const origin = buildWordPressSiteUrl(project.hostPort);

  try {
    const parsed = new URL(origin);
    return [
      `localhost:${port}`,
      `127.0.0.1:${port}`,
      `${parsed.hostname}:${port}`,
    ];
  } catch {
    return [`localhost:${port}`, `127.0.0.1:${port}`];
  }
}

function matchesWordPressHost(
  hostname: string,
  urlPort: string,
  project: Project,
): boolean {
  const wpPort = String(project.hostPort);
  const effectivePort = urlPort || wpPort;
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
}`;

export async function transformPreviewHtml(
  html: string,
  project: Project,
  proxyBase: string,
): Promise<string> {
  let result = rewriteTextForPreview(html, project, proxyBase);
  result = result.replace(/<base\b[^>]*>/gi, "");
  result = rewriteHtmlAttributes(result, project, proxyBase);

  if (!result.includes("ai-wp:preview-layout")) {
    if (/<\/head>/i.test(result)) {
      result = result.replace(
        /<\/head>/i,
        `<style data-preview-layout="1">${PREVIEW_LAYOUT_FIX_CSS}</style></head>`,
      );
    } else {
      result = `<style data-preview-layout="1">${PREVIEW_LAYOUT_FIX_CSS}</style>${result}`;
    }
  }

  return result;
}
