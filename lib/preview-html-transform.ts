import type { Project } from "@/lib/project-store";
import { buildWordPressSiteUrl } from "@/lib/public-url";

function cleanProxy(proxyBase: string): string {
  return proxyBase.replace(/\/$/, "");
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
      if (pseudo.port === port || (!pseudo.port && port === "80")) {
        return `${proxy}${pseudo.pathname}${pseudo.search}`;
      }
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.port === port || (!parsed.port && port === "80")) {
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

  let result = text.replace(
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

function resolveUpstreamPath(href: string, project: Project): string | null {
  const port = String(project.hostPort);

  if (href.startsWith("/")) {
    return href;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const parsed = new URL(href);
      if (parsed.port === port || (!parsed.port && port === "80")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return null;
    }
  }

  if (href.startsWith("//")) {
    try {
      const parsed = new URL(`https:${href}`);
      if (parsed.port === port || (!parsed.port && port === "80")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return null;
    }
  }

  try {
    const origin = buildWordPressSiteUrl(project.hostPort);
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
    (match, attr, quote, value) => {
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

export async function transformPreviewHtml(
  html: string,
  project: Project,
  proxyBase: string,
  fetchText: (upstreamPath: string) => Promise<string>,
): Promise<string> {
  let result = rewriteTextForPreview(html, project, proxyBase);
  result = result.replace(/<base\b[^>]*>/gi, "");
  result = rewriteHtmlAttributes(result, project, proxyBase);

  const linkTags = [...result.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);

  for (const linkTag of linkTags) {
    if (!/\brel=["'][^"']*stylesheet/i.test(linkTag)) {
      continue;
    }

    const hrefMatch = linkTag.match(/\bhref=["']([^"']+)["']/i);
    if (!hrefMatch?.[1]) {
      continue;
    }

    const upstreamPath = resolveUpstreamPath(hrefMatch[1], project);
    if (!upstreamPath) {
      continue;
    }

    try {
      const cssText = await fetchText(upstreamPath);
      const inlined = rewriteTextForPreview(cssText, project, proxyBase);
      const styleTag = `<style data-preview-inlined="1">${inlined}</style>`;
      result = result.replace(linkTag, styleTag);
    } catch {
      const rewrittenTag = linkTag.replace(
        hrefMatch[1],
        rewriteUrlForPreview(hrefMatch[1], project, proxyBase),
      );
      result = result.replace(linkTag, rewrittenTag);
    }
  }

  return result;
}
