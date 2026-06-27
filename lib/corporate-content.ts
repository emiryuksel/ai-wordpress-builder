import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { execWpCli, execWpCliSh } from "@/lib/docker-manager";
import { getRuntimeRoot } from "@/lib/data-paths";
import { generateCorporateImage } from "@/lib/gemini-image";
import { getGeminiClient } from "@/lib/gemini-client";
import { applyChatAction } from "@/lib/wp-cli";
import { isCorporateProject } from "@/lib/site-type";

export { isCorporateProject };

const CORPORATE_MODEL = "gemini-2.5-flash-lite";
const AI_IMAGE_CONCURRENCY = 4;
const CORPORATE_IMAGE_MAX_ROUNDS = 6;
const CORPORATE_JOB_MAX_ATTEMPTS = 5;
const HERO_IMAGE_MAX_ATTEMPTS = 8;
const CORPORATE_HOME_SLUG = "ana-sayfa";

const CORP_IMAGE_SLOT = {
  hero: () => "{{CORP_IMG:hero}}",
  product: (index: number) => `{{CORP_IMG:product:${index}}}`,
  gallery: (index: number) => `{{CORP_IMG:gallery:${index}}}`,
} as const;

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'%3E%3Crect fill='%23e2e8f0' width='800' height='500'/%3E%3C/svg%3E";

const corporateContentPlanSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
    ctaLabel: z.string(),
    imagePrompt: z.string(),
  }),
  products: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        imagePrompt: z.string(),
      }),
    )
    .min(3)
    .max(6),
  socialProof: z.object({
    customerCount: z.number().int().min(100),
    testimonial: z.string(),
    rating: z.number().min(4).max(5),
  }),
  gallery: z
    .array(
      z.object({
        caption: z.string(),
        imagePrompt: z.string(),
      }),
    )
    .min(3)
    .max(6),
  footer: z.object({
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    copyright: z.string(),
  }),
});

export type CorporateContentPlan = z.infer<typeof corporateContentPlanSchema>;

const corporateGeminiSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    hero: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        subtitle: { type: SchemaType.STRING },
        ctaLabel: { type: SchemaType.STRING },
        imagePrompt: { type: SchemaType.STRING },
      },
      required: ["title", "subtitle", "ctaLabel", "imagePrompt"],
    },
    products: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          imagePrompt: { type: SchemaType.STRING },
        },
        required: ["name", "description", "imagePrompt"],
      },
    },
    socialProof: {
      type: SchemaType.OBJECT,
      properties: {
        customerCount: { type: SchemaType.NUMBER },
        testimonial: { type: SchemaType.STRING },
        rating: { type: SchemaType.NUMBER },
      },
      required: ["customerCount", "testimonial", "rating"],
    },
    gallery: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          caption: { type: SchemaType.STRING },
          imagePrompt: { type: SchemaType.STRING },
        },
        required: ["caption", "imagePrompt"],
      },
    },
    footer: {
      type: SchemaType.OBJECT,
      properties: {
        email: { type: SchemaType.STRING },
        phone: { type: SchemaType.STRING },
        address: { type: SchemaType.STRING },
        copyright: { type: SchemaType.STRING },
      },
      required: ["email", "phone", "address", "copyright"],
    },
  },
  required: ["hero", "products", "socialProof", "gallery", "footer"],
};

function defaultCorporatePlan(
  userPrompt: string,
  siteTitle: string,
): CorporateContentPlan {
  const sector = userPrompt.trim() || siteTitle;

  return {
    hero: {
      title: `${siteTitle} ile tanışın`,
      subtitle: `${sector} alanında güvenilir, profesyonel çözümler sunuyoruz.`,
      ctaLabel: "Hizmetlerimizi Keşfedin",
      imagePrompt: `Modern corporate hero for ${sector}, professional workspace, wide banner`,
    },
    products: [
      {
        name: "Danışmanlık Hizmeti",
        description: "Sektörünüze özel stratejik danışmanlık ve planlama.",
        imagePrompt: `Business consulting for ${sector}`,
      },
      {
        name: "Uygulama ve Kurulum",
        description: "Projelerinizi uçtan uca hayata geçiriyoruz.",
        imagePrompt: `Project delivery ${sector}`,
      },
      {
        name: "Bakım ve Destek",
        description: "Sürekli destek ve iyileştirme hizmetleri.",
        imagePrompt: `Customer support ${sector}`,
      },
    ],
    socialProof: {
      customerCount: 850,
      testimonial: "Profesyonel ekip, zamanında teslimat ve kaliteli hizmet.",
      rating: 5,
    },
    gallery: [
      {
        caption: "Proje sahnesi",
        imagePrompt: `Corporate project ${sector}`,
      },
      {
        caption: "Ekip çalışması",
        imagePrompt: `Team collaboration ${sector}`,
      },
      {
        caption: "Müşteri memnuniyeti",
        imagePrompt: `Happy clients ${sector}`,
      },
    ],
    footer: {
      email: "info@example.com",
      phone: "0850 000 00 00",
      address: "İstanbul, Türkiye",
      copyright: `© ${new Date().getFullYear()} ${siteTitle}. Tüm hakları saklıdır.`,
    },
  };
}

export async function generateCorporateContentPlan(
  userPrompt: string,
  siteTitle: string,
): Promise<CorporateContentPlan> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: CORPORATE_MODEL,
      systemInstruction: `Kurumsal web sitesi için Türkçe içerik planı üret. products 3-6, gallery 3-6. imagePrompt İngilizce. hero.title verilen site başlığını içermeli; tercihen "{siteTitle} ile tanışın" formatında olmalı. XYZ gibi placeholder firma adı kullanma.`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: corporateGeminiSchema,
        temperature: 0.5,
      },
    });

    const result = await model.generateContent(
      `Site başlığı: ${siteTitle}\nİstek: ${userPrompt}`,
    );
    const text = result.response.text();
    if (!text) {
      return defaultCorporatePlan(userPrompt, siteTitle);
    }
    const plan = corporateContentPlanSchema.parse(JSON.parse(text));
    normalizeCorporateHeroTitle(plan, siteTitle);
    return plan;
  } catch (error) {
    console.warn("[corporate-content] Plan fallback:", error);
    return defaultCorporatePlan(userPrompt, siteTitle);
  }
}

function normalizeCorporateHeroTitle(plan: CorporateContentPlan, siteTitle: string): void {
  const title = siteTitle.trim();
  if (!title) {
    return;
  }

  const heroTitle = plan.hero.title.trim();
  if (!heroTitle || !heroTitle.toLowerCase().includes(title.toLowerCase())) {
    plan.hero.title = `${title} ile tanışın`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStars(rating: number): string {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const current = nextIndex;
    nextIndex += 1;
    if (current >= items.length) {
      return;
    }
    results[current] = await worker(items[current], current);
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runNext()),
  );

  return results;
}

interface CorporateImageJob {
  slot: string;
  legacySlots: string[];
  prompt: string;
  fileName: string;
}

function buildCorporateImageJobs(plan: CorporateContentPlan): CorporateImageJob[] {
  const jobs: CorporateImageJob[] = [
    {
      slot: CORP_IMAGE_SLOT.hero(),
      legacySlots: ["{{HERO_IMG}}"],
      prompt: plan.hero.imagePrompt,
      fileName: "hero.jpg",
    },
  ];

  plan.products.forEach((product, index) => {
    jobs.push({
      slot: CORP_IMAGE_SLOT.product(index),
      legacySlots: [`{{PRODUCT_IMG_${index}}}`],
      prompt: product.imagePrompt,
      fileName: `product-${index}.jpg`,
    });
  });

  plan.gallery.forEach((item, index) => {
    jobs.push({
      slot: CORP_IMAGE_SLOT.gallery(index),
      legacySlots: [`{{GALLERY_IMG_${index}}}`],
      prompt: item.imagePrompt,
      fileName: `gallery-${index}.jpg`,
    });
  });

  return jobs;
}

function normalizeAttachmentPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function applyCorporateImageUrl(html: string, job: CorporateImageJob, url: string): string {
  const normalized = normalizeAttachmentPath(url);
  let out = html.replaceAll(job.slot, normalized);
  for (const legacySlot of job.legacySlots) {
    out = out.replaceAll(legacySlot, normalized);
  }
  return out;
}

function applyLegacyPlaceholderSvg(html: string, urlsInOrder: string[]): string {
  let out = html;
  for (const url of urlsInOrder) {
    if (!out.includes(PLACEHOLDER_SVG)) {
      break;
    }
    out = out.replace(PLACEHOLDER_SVG, url);
  }
  return out;
}

function jobNeedsImage(html: string, job: CorporateImageJob): boolean {
  if (html.includes(job.slot)) {
    return true;
  }
  return job.legacySlots.some((legacySlot) => html.includes(legacySlot));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortCorporateImageJobs(jobs: CorporateImageJob[]): CorporateImageJob[] {
  return [...jobs].sort((left, right) => {
    const leftIsHero = left.slot === CORP_IMAGE_SLOT.hero() ? 0 : 1;
    const rightIsHero = right.slot === CORP_IMAGE_SLOT.hero() ? 0 : 1;
    return leftIsHero - rightIsHero;
  });
}

async function listPendingCorporateImageJobs(
  projectId: string,
): Promise<CorporateImageJob[]> {
  const plan = await loadPlan(projectId);
  const pageId = await getHomePageId(projectId);
  if (!plan || !pageId) {
    return [];
  }

  const html = await execWpCli(projectId, ["post", "get", pageId, "--field=post_content"]);
  const jobs = buildCorporateImageJobs(plan);
  return sortCorporateImageJobs(resolvePendingCorporateImageJobs(html, jobs));
}

function resolvePendingCorporateImageJobs(
  html: string,
  jobs: CorporateImageJob[],
): CorporateImageJob[] {
  const pending = jobs.filter((job) => jobNeedsImage(html, job));
  if (pending.length === 0 && html.includes(PLACEHOLDER_SVG)) {
    return jobs;
  }
  return pending;
}

function planPath(projectId: string): string {
  return path.join(getRuntimeRoot(), projectId, "corporate-plan.json");
}

export function buildCorporatePageHtml(
  plan: CorporateContentPlan,
  primaryColor: string,
): string {
  const products = plan.products
    .map(
      (p, i) => `<article class="corp-card"><img src="${CORP_IMAGE_SLOT.product(i)}" alt="${escapeHtml(p.name)}" class="corp-card-img"/><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p></article>`,
    )
    .join("");
  const gallery = plan.gallery
    .map(
      (g, i) => `<figure class="corp-gallery-item"><img src="${CORP_IMAGE_SLOT.gallery(i)}" alt="${escapeHtml(g.caption)}"/><figcaption>${escapeHtml(g.caption)}</figcaption></figure>`,
    )
    .join("");

  return `<!-- ai-wp:corporate-home -->
<style>
.corp-page{--corp-primary:${primaryColor};color:#0f172a}
.corp-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:2rem;align-items:center;padding:3rem 1.5rem;background:linear-gradient(135deg,#f8fafc,#e2e8f0);border-radius:12px;margin-bottom:2.5rem}
.corp-hero h1{font-size:2.25rem;margin:0 0 1rem}.corp-hero p{color:#475569;margin:0 0 1.5rem}
.corp-cta{display:inline-block;background:var(--corp-primary);color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600}
.corp-hero-img{width:100%;border-radius:12px;object-fit:cover;min-height:260px}
.corp-section{padding:2rem 0}.corp-section h2{font-size:1.75rem;margin-bottom:1.25rem}
.corp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem}
.corp-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem}
.corp-card-img{width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:.75rem;background:#f1f5f9}
.corp-proof{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:2rem;text-align:center}
.corp-stars{color:#f59e0b;font-size:1.5rem}.corp-proof-count{font-size:1.25rem;font-weight:700;margin-top:.75rem;color:var(--corp-primary)}
.corp-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}
.corp-gallery-item img{width:100%;height:160px;object-fit:cover;border-radius:8px;background:#f1f5f9}
.corp-footer{margin-top:2.5rem;padding:2rem;background:#0f172a;color:#e2e8f0;border-radius:12px}
.corp-social{margin-top:1rem;display:flex;gap:1rem;opacity:.7;font-size:.9rem}
@media(max-width:768px){.corp-hero{grid-template-columns:1fr}}
</style>
<div class="corp-page">
<section id="corp-hero" class="corp-hero"><div><h1>${escapeHtml(plan.hero.title)}</h1><p>${escapeHtml(plan.hero.subtitle)}</p><a class="corp-cta" href="#urunler">${escapeHtml(plan.hero.ctaLabel)}</a></div><img class="corp-hero-img" src="${CORP_IMAGE_SLOT.hero()}" alt="hero"/></section>
<section id="urunler" class="corp-section"><h2>Ürünler ve Hizmetler</h2><div class="corp-grid">${products}</div></section>
<section id="sosyal-kanit" class="corp-section"><div class="corp-proof"><div class="corp-stars">${renderStars(plan.socialProof.rating)}</div><p>"${escapeHtml(plan.socialProof.testimonial)}"</p><p class="corp-proof-count">${plan.socialProof.customerCount.toLocaleString("tr-TR")}+ müşteriye hizmet verdik</p></div></section>
<section id="galeri" class="corp-section"><h2>Galeri</h2><div class="corp-gallery">${gallery}</div></section>
<footer id="corp-footer" class="corp-footer"><p><strong>İletişim</strong></p><p>E-posta: ${escapeHtml(plan.footer.email)}</p><p>Telefon: ${escapeHtml(plan.footer.phone)}</p><p>${escapeHtml(plan.footer.address)}</p><div class="corp-social"><span>LinkedIn</span><span>Instagram</span><span>X</span></div><p style="margin-top:1rem;font-size:.85rem;opacity:.8">${escapeHtml(plan.footer.copyright)}</p></footer>
</div>`;
}

async function savePlan(projectId: string, plan: CorporateContentPlan): Promise<void> {
  await fs.writeFile(planPath(projectId), JSON.stringify(plan, null, 2), "utf8");
}

async function loadPlan(projectId: string): Promise<CorporateContentPlan | null> {
  try {
    const raw = await fs.readFile(planPath(projectId), "utf8");
    return corporateContentPlanSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function getHomePageId(projectId: string): Promise<string | null> {
  try {
    const front = (await execWpCli(projectId, ["option", "get", "page_on_front"])).trim();
    if (front && front !== "0") return front;
  } catch {
    /* ignore */
  }
  try {
    const id = (
      await execWpCli(projectId, [
        "post",
        "list",
        "--post_type=page",
        `--name=${CORPORATE_HOME_SLUG}`,
        "--field=ID",
      ])
    ).trim();
    return id.split("\n")[0] || null;
  } catch {
    return null;
  }
}

async function updateHomeContent(projectId: string, html: string): Promise<void> {
  const pageId = await getHomePageId(projectId);
  if (!pageId) throw new Error("Kurumsal ana sayfa bulunamadı.");
  const file = path.join(getRuntimeRoot(), projectId, "corporate-images", "home.html");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html, "utf8");
  await execWpCliSh(
    projectId,
    `wp post update ${pageId} --post_content="$(cat /corporate-images/home.html)" --path=/var/www/html`,
    180_000,
  );
}

/** Kurumsal ana sayfadaki --corp-primary değişkenini günceller (CTA, vurgular). */
export async function updateCorporatePagePrimaryColor(
  projectId: string,
  primaryColor: string,
): Promise<void> {
  const pageId = await getHomePageId(projectId);
  if (!pageId) {
    return;
  }

  const html = await execWpCli(projectId, [
    "post",
    "get",
    pageId,
    "--field=post_content",
  ]);

  if (!html.includes("ai-wp:corporate-home")) {
    return;
  }

  const normalized = primaryColor.trim().toLowerCase();
  const updated = html.replace(
    /--corp-primary:\s*[^;]+/i,
    `--corp-primary: ${normalized}`,
  );

  if (updated !== html) {
    await updateHomeContent(projectId, updated);
  }
}

function buildHeroHeadingFromBrand(brandName: string, currentTitle = ""): string {
  const brand = brandName.trim();
  const current = currentTitle.trim();

  if (current.endsWith(" ile tanışın")) {
    return `${brand} ile tanışın`;
  }

  if (current.endsWith(" ile Tanışın")) {
    return `${brand} ile Tanışın`;
  }

  return brand;
}

function extractHeroTitleFromHtml(html: string): string {
  const match = html.match(
    /<section id="corp-hero"[^>]*>[\s\S]*?<h1>([^<]*)<\/h1>/i,
  );
  return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Kurumsal ana sayfa hero başlığını ve telif satırını marka adıyla günceller. */
export async function updateCorporateHeroBrandName(
  projectId: string,
  brandName: string,
): Promise<void> {
  const pageId = await getHomePageId(projectId);
  if (!pageId) {
    return;
  }

  const html = await execWpCli(projectId, [
    "post",
    "get",
    pageId,
    "--field=post_content",
  ]);

  if (!html.includes("ai-wp:corporate-home")) {
    return;
  }

  const currentHeroTitle = extractHeroTitleFromHtml(html);
  const nextHeroTitle = buildHeroHeadingFromBrand(brandName, currentHeroTitle);
  const escapedHeroTitle = escapeHtml(nextHeroTitle);
  const year = new Date().getFullYear();
  const copyright = `© ${year} ${brandName.trim()}. Tüm hakları saklıdır.`;

  let updated = html.replace(
    /(<section id="corp-hero"[^>]*>[\s\S]*?<h1>)([^<]*)(<\/h1>)/i,
    `$1${escapedHeroTitle}$3`,
  );

  updated = updated.replace(
    /(<footer id="corp-footer"[\s\S]*?<p style="margin-top:1rem;font-size:\.85rem;opacity:\.8">)[^<]*(<\/p><\/footer>)/i,
    `$1${escapeHtml(copyright)}$2`,
  );

  if (updated !== html) {
    await updateHomeContent(projectId, updated);
  }

  const plan = await loadPlan(projectId);
  if (plan) {
    plan.hero.title = nextHeroTitle;
    plan.footer.copyright = copyright;
    await savePlan(projectId, plan);
  }
}

async function importImage(
  projectId: string,
  name: string,
  buffer: Buffer,
): Promise<string | null> {
  const dir = path.join(getRuntimeRoot(), projectId, "corporate-images");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  try {
    const id = (
      await execWpCliSh(
        projectId,
        `wp media import "/corporate-images/${name}" --porcelain --path=/var/www/html`,
        180_000,
      )
    ).trim();
    if (!id || id === "0") return null;
    return (
      await execWpCliSh(
        projectId,
        `wp eval 'echo wp_get_attachment_url(${id});' --path=/var/www/html`,
        60_000,
      )
    ).trim();
  } catch {
    return null;
  }
}

export async function setupCorporateContent(
  projectId: string,
  userPrompt: string,
  siteTitle: string,
  primaryColor = "#1e40af",
): Promise<void> {
  const pageId = await getHomePageId(projectId);
  if (!pageId) throw new Error("Kurumsal ana sayfa henüz oluşturulmadı.");
  const existing = await execWpCli(projectId, ["post", "get", pageId, "--field=post_content"]);
  if (existing.includes("ai-wp:corporate-home")) return;

  const plan = await generateCorporateContentPlan(userPrompt, siteTitle);
  await savePlan(projectId, plan);
  await updateHomeContent(
    projectId,
    buildCorporatePageHtml(plan, primaryColor),
  );
}

async function generateAndImportCorporateImage(
  projectId: string,
  job: CorporateImageJob,
  userPrompt: string,
  maxAttempts = CORPORATE_JOB_MAX_ATTEMPTS,
): Promise<string | null> {
  const isHero = job.slot === CORP_IMAGE_SLOT.hero();
  const attempts = isHero ? Math.max(maxAttempts, HERO_IMAGE_MAX_ATTEMPTS) : maxAttempts;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const buffer = await generateCorporateImage(
      job.prompt,
      userPrompt,
      isHero ? 5 : 3,
    );
    if (!buffer) {
      if (attempt < attempts - 1) {
        await sleep(1500 + attempt * 1000);
      }
      continue;
    }

    const url = await importImage(projectId, job.fileName, buffer);
    if (url) {
      return url;
    }

    if (attempt < attempts - 1) {
      await sleep(1500 + attempt * 1000);
    }
  }

  return null;
}

export async function enrichCorporateAiImages(
  projectId: string,
  userPrompt: string,
): Promise<void> {
  const plan = await loadPlan(projectId);
  const pageId = await getHomePageId(projectId);
  if (!plan || !pageId) {
    return;
  }

  let html = await execWpCli(projectId, ["post", "get", pageId, "--field=post_content"]);
  const jobs = buildCorporateImageJobs(plan);
  const pendingJobs = sortCorporateImageJobs(
    resolvePendingCorporateImageJobs(html, jobs),
  );
  if (pendingJobs.length === 0) {
    return;
  }

  const heroJob = pendingJobs.find((job) => job.slot === CORP_IMAGE_SLOT.hero());
  const otherJobs = pendingJobs.filter((job) => job.slot !== CORP_IMAGE_SLOT.hero());
  const importedUrls: string[] = [];

  if (heroJob) {
    const heroUrl = await generateAndImportCorporateImage(
      projectId,
      heroJob,
      userPrompt,
      HERO_IMAGE_MAX_ATTEMPTS,
    );
    if (heroUrl) {
      html = applyCorporateImageUrl(html, heroJob, heroUrl);
      importedUrls.push(heroUrl);
      await updateHomeContent(projectId, html);
    } else {
      console.warn("[corporate-content] Hero görseli üretilemedi, yeniden denenecek.");
    }
  }

  const results = await mapWithConcurrency(
    otherJobs,
    AI_IMAGE_CONCURRENCY,
    async (job) => {
      const url = await generateAndImportCorporateImage(projectId, job, userPrompt);
      return { job, url };
    },
  );

  for (const { job, url } of results) {
    if (!url) {
      console.warn(`[corporate-content] Görsel üretilemedi: ${job.fileName}`);
      continue;
    }
    html = applyCorporateImageUrl(html, job, url);
    importedUrls.push(url);
  }

  if (importedUrls.length > 0) {
    html = applyLegacyPlaceholderSvg(html, importedUrls);
    await updateHomeContent(projectId, html);
  }
}

/** Eksik kalan kurumsal görseller için yeniden dener. */
export async function ensureMissingCorporateAiImages(
  projectId: string,
  userPrompt: string,
): Promise<void> {
  for (let round = 0; round < CORPORATE_IMAGE_MAX_ROUNDS; round += 1) {
    const pending = await listPendingCorporateImageJobs(projectId);
    if (pending.length === 0) {
      return;
    }

    await enrichCorporateAiImages(projectId, userPrompt);

    const remaining = await listPendingCorporateImageJobs(projectId);
    if (remaining.length === 0) {
      return;
    }

    console.warn(
      `[corporate-content] ${remaining.length} görsel eksik (tur ${round + 1}/${CORPORATE_IMAGE_MAX_ROUNDS}): ${remaining.map((job) => job.fileName).join(", ")}`,
    );
    await sleep(2000 + round * 1500);
  }
}

export async function runCorporateImageEnrichment(
  projectId: string,
  userPrompt: string,
): Promise<void> {
  await enrichCorporateAiImages(projectId, userPrompt);
  await ensureMissingCorporateAiImages(projectId, userPrompt);

  const remaining = await listPendingCorporateImageJobs(projectId);
  if (remaining.length === 0) {
    return;
  }

  const missingNames = remaining.map((job) => job.fileName).join(", ");
  throw new Error(`Kurumsal görseller tamamlanamadı: ${missingNames}`);
}

export async function repairCorporateSite(
  projectId: string,
  primaryColor: string,
  userPrompt = "",
  siteTitle = "",
): Promise<void> {
  const { applyAstraBlogChrome } = await import("@/lib/wp-cli");
  const pageId = await getHomePageId(projectId);
  const content = pageId
    ? await execWpCli(projectId, ["post", "get", pageId, "--field=post_content"])
    : "";
  if (!content.includes("ai-wp:corporate-home")) {
    await setupCorporateContent(projectId, userPrompt, siteTitle || "Kurumsal Site", primaryColor);
  }
  await applyAstraBlogChrome(projectId, primaryColor || "#1e40af");
  if (siteTitle.trim()) {
    await updateCorporateHeroBrandName(projectId, siteTitle.trim());
  }
  if (userPrompt) {
    await runCorporateImageEnrichment(projectId, userPrompt);
  }
}

export interface CorporateBrandInput {
  brandName?: string;
  primaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export async function applyCorporateBrand(
  projectId: string,
  input: CorporateBrandInput,
): Promise<string[]> {
  const { applyAstraBlogChrome } = await import("@/lib/wp-cli");
  const messages: string[] = [];

  if (input.brandName?.trim()) {
    const brandName = input.brandName.trim();
    await applyChatAction(projectId, {
      actionType: "change_site_title",
      target: "site",
      value: brandName,
    });
    await updateCorporateHeroBrandName(projectId, brandName);
    messages.push(`Marka adı "${brandName}" olarak güncellendi.`);
  }

  if (input.headingFont?.trim()) {
    await applyChatAction(projectId, {
      actionType: "change_font",
      target: "heading",
      value: input.headingFont.trim(),
    });
    messages.push(`Başlık fontu: ${input.headingFont.trim()}`);
  }

  if (input.bodyFont?.trim()) {
    await applyChatAction(projectId, {
      actionType: "change_font",
      target: "body",
      value: input.bodyFont.trim(),
    });
    messages.push(`Gövde fontu: ${input.bodyFont.trim()}`);
  }

  if (input.primaryColor?.trim()) {
    const color = input.primaryColor.trim();
    await updateCorporatePagePrimaryColor(projectId, color);
    await applyAstraBlogChrome(projectId, color);
    messages.push("Marka rengi güncellendi.");
  }

  if (messages.length === 0) throw new Error("En az bir marka alanı gerekli.");
  return messages;
}

export async function applyPendingCorporateBrand(projectId: string): Promise<boolean> {
  const { getProject, updateProject } = await import("@/lib/project-store");
  const { applyBrandSlug } = await import("@/lib/project-site-url");
  const project = await getProject(projectId);

  if (!project?.pendingBrand) {
    return false;
  }

  const pending = project.pendingBrand;
  let current = project;

  if (pending.brandName?.trim()) {
    current = await applyBrandSlug(project, pending.brandName);
  }

  await applyCorporateBrand(projectId, pending);
  await updateProject(projectId, {
    pendingBrand: undefined,
    brandOnboardingComplete: true,
    siteTitle: pending.brandName?.trim() || current.siteTitle,
    suggestedPrimaryColor: pending.primaryColor || current.suggestedPrimaryColor,
  });
  return true;
}
