import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { execWpCli, execWpCliSh } from "@/lib/docker-manager";
import { generateBlogFeaturedImage } from "@/lib/gemini-image";
import { getGeminiClient } from "@/lib/gemini-client";

const RUNTIME_ROOT = path.join(process.cwd(), "data", "runtime");
const BLOG_MODEL = "gemini-2.5-flash-lite";
const BLOG_POST_COUNT = 4;
const AI_IMAGE_CONCURRENCY = 3;

interface WpPostRow {
  ID: string;
  post_name: string;
  post_title: string;
}

const blogPostSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  content: z.string(),
  categorySlug: z.string(),
  imagePrompt: z.string(),
});

const blogContentPlanSchema = z.object({
  tagline: z.string(),
  categories: z
    .array(
      z.object({
        name: z.string(),
        slug: z.string(),
      }),
    )
    .min(2)
    .max(4),
  posts: z.array(blogPostSchema).min(4).max(4),
});

export type BlogContentPlan = z.infer<typeof blogContentPlanSchema>;

const blogContentGeminiSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tagline: {
      type: SchemaType.STRING,
      description: "Site alt başlığı, Türkçe, kısa",
    },
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          slug: { type: SchemaType.STRING },
        },
        required: ["name", "slug"],
      },
    },
    posts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          excerpt: { type: SchemaType.STRING },
          content: { type: SchemaType.STRING },
          categorySlug: { type: SchemaType.STRING },
          imagePrompt: { type: SchemaType.STRING },
        },
        required: [
          "title",
          "excerpt",
          "content",
          "categorySlug",
          "imagePrompt",
        ],
      },
    },
  },
  required: ["tagline", "categories", "posts"],
};

const ECOMMERCE_KEYWORDS = /e-?ticaret|e-?commerce|shop|mağaza|woocommerce/i;

export function isBlogProject(input: {
  siteType: string;
  suggestedPlugins: string[];
  prompt?: string;
}): boolean {
  const hasWoo = input.suggestedPlugins.some(
    (plugin) => plugin.trim().toLowerCase() === "woocommerce",
  );

  if (hasWoo) {
    return false;
  }

  const combined = `${input.siteType} ${input.prompt ?? ""}`;

  if (ECOMMERCE_KEYWORDS.test(combined)) {
    return false;
  }

  return /blog|günlük|yazı|dergi|haber/i.test(combined) || !hasWoo;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultBlogPlan(userPrompt: string, siteTitle: string): BlogContentPlan {
  const topic = userPrompt.trim() || siteTitle;

  return {
    tagline: `${siteTitle} — ${topic} üzerine yazılar`,
    categories: [
      { name: "Rehberler", slug: "rehberler" },
      { name: "İlham", slug: "ilham" },
      { name: "Haberler", slug: "haberler" },
    ],
    posts: [
      {
        title: `${topic} ile Tanışın: Başlangıç Rehberi`,
        excerpt: `${topic} hakkında bilmeniz gereken temel kavramlar.`,
        content: `<p>${topic} dünyasına hoş geldiniz. Bu yazıda temel kavramları ve pratik ipuçlarını paylaşıyoruz.</p><p>İster yeni başlıyor olun ister deneyimli olun, bu rehber size yol gösterecek.</p>`,
        categorySlug: "rehberler",
        imagePrompt: `Inspiring editorial photo about ${topic}, soft natural light, blog header`,
      },
      {
        title: `2026'da ${topic} Trendleri`,
        excerpt: "Bu yıl öne çıkan yaklaşımlar ve yenilikler.",
        content: `<p>Yeni yılda ${topic} alanında öne çıkan trendleri derledik.</p><p>Minimal tasarım, sürdürülebilir malzemeler ve kişiselleştirme bu yılın vazgeçilmezleri arasında.</p>`,
        categorySlug: "haberler",
        imagePrompt: `Modern trend mood board related to ${topic}, editorial style`,
      },
      {
        title: `${siteTitle} Ekibinden 5 Pratik İpucu`,
        excerpt: "Hemen uygulayabileceğiniz öneriler.",
        content: `<p>Uzmanlarımızın ${topic} konusundaki en sevdiği ipuçlarını derledik.</p><p>Küçük değişikliklerle büyük fark yaratabilirsiniz.</p>`,
        categorySlug: "rehberler",
        imagePrompt: `Hands-on creative workspace scene about ${topic}, warm tones`,
      },
      {
        title: `İlham Veren ${topic} Örnekleri`,
        excerpt: "Topluluğumuzdan seçilmiş çalışmalar.",
        content: `<p>Okuyucularımızın ${topic} alanındaki yaratıcı örneklerini inceledik.</p><p>Her biri farklı bir bakış açısı sunuyor.</p>`,
        categorySlug: "ilham",
        imagePrompt: `Beautiful curated gallery scene about ${topic}, aesthetic composition`,
      },
    ],
  };
}

export async function generateBlogContentPlan(
  userPrompt: string,
  siteTitle: string,
): Promise<BlogContentPlan> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: BLOG_MODEL,
      systemInstruction: `Sen bir blog içerik editörüsün.
Kullanıcının site isteğine uygun Türkçe blog planı üret.

Kurallar:
- Tam 4 adet özgün blog yazısı üret; konular kullanıcı prompt'u ve site başlığıyla doğrudan ilişkili olsun.
- content alanı 2-3 paragraf HTML (<p>...</p>) içersin.
- excerpt tek cümle, çekici olsun.
- categories 2-4 adet Türkçe kategori; slug küçük harf, tire ile (ASCII).
- categorySlug her yazı için categories içindeki slug'lardan biri olmalı.
- imagePrompt İngilizce, görsel üretim modeli için detaylı sahne tarifi (blog kapak görseli).
- Genel, alakasız veya tekrarlayan başlıklardan kaçın.`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: blogContentGeminiSchema,
        temperature: 0.5,
      },
    });

    const result = await model.generateContent(
      `Site başlığı: ${siteTitle}\nKullanıcı isteği: ${userPrompt}`,
    );
    const text = result.response.text();

    if (!text) {
      return defaultBlogPlan(userPrompt, siteTitle);
    }

    return blogContentPlanSchema.parse(JSON.parse(text));
  } catch (error) {
    console.warn("[blog-content] Plan üretilemedi, varsayılan kullanılıyor:", error);
    return defaultBlogPlan(userPrompt, siteTitle);
  }
}

async function getPublishedPostCount(projectId: string): Promise<number> {
  return Number.parseInt(
    (
      await execWpCli(projectId, [
        "post",
        "list",
        "--post_type=post",
        "--post_status=publish",
        "--format=count",
      ])
    ).trim(),
    10,
  );
}

function planFilePath(projectId: string): string {
  return path.join(RUNTIME_ROOT, projectId, "blog-plan.json");
}

async function saveBlogPlan(
  projectId: string,
  plan: BlogContentPlan,
): Promise<void> {
  await fs.writeFile(planFilePath(projectId), JSON.stringify(plan, null, 2), "utf8");
}

async function loadBlogPlan(
  projectId: string,
): Promise<BlogContentPlan | null> {
  try {
    const raw = await fs.readFile(planFilePath(projectId), "utf8");
    return blogContentPlanSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function listPublishedPosts(projectId: string): Promise<WpPostRow[]> {
  try {
    const output = await execWpCli(projectId, [
      "post",
      "list",
      "--post_type=post",
      "--post_status=publish",
      "--fields=ID,post_name,post_title",
      "--format=json",
    ]);

    const rows = JSON.parse(output) as WpPostRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function findPostIdForPlanPost(
  wpPosts: WpPostRow[],
  planPost: BlogContentPlan["posts"][number],
): string | undefined {
  const targetSlug = slugify(planPost.title);

  for (const row of wpPosts) {
    if (row.post_name === targetSlug) {
      return row.ID;
    }
  }

  for (const row of wpPosts) {
    if (
      row.post_name.startsWith(targetSlug.slice(0, 40)) ||
      targetSlug.startsWith(row.post_name)
    ) {
      return row.ID;
    }
  }

  for (const row of wpPosts) {
    if (slugify(row.post_title) === targetSlug) {
      return row.ID;
    }
  }

  const normalizedTitle = planPost.title.trim().toLowerCase();
  for (const row of wpPosts) {
    if (row.post_title.trim().toLowerCase() === normalizedTitle) {
      return row.ID;
    }
  }

  return undefined;
}

async function postHasFeaturedImage(
  projectId: string,
  postId: string,
): Promise<boolean> {
  const thumb = (
    await execWpCli(projectId, [
      "post",
      "meta",
      "get",
      postId,
      "_thumbnail_id",
    ])
  ).trim();

  return Boolean(thumb && thumb !== "0");
}

async function attachAiBlogFeaturedImage(
  projectId: string,
  postId: string,
  post: BlogContentPlan["posts"][number],
  userPrompt: string,
): Promise<boolean> {
  const buffer = await generateBlogFeaturedImage(
    post.title,
    post.excerpt,
    userPrompt,
    post.imagePrompt,
  );

  if (!buffer) {
    return false;
  }

  const imagesDir = path.join(RUNTIME_ROOT, projectId, "blog-images");
  await fs.mkdir(imagesDir, { recursive: true });
  const fileName = `blog-ai-${postId}.jpg`;
  await fs.writeFile(path.join(imagesDir, fileName), buffer);

  const output = await execWpCliSh(
    projectId,
    `wp media import "/blog-images/${fileName}" --post_id=${postId} --featured_image --porcelain --path=/var/www/html`,
    180_000,
  );

  return Boolean(output && !output.toLowerCase().includes("error"));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) {
      return;
    }
    results[current] = await worker(items[current]);
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runNext()),
  );

  return results;
}

function buildFastBlogSetupScript(
  plan: BlogContentPlan,
  posts: BlogContentPlan["posts"],
): string {
  const lines = [
    "set -u",
    'WP_PATH="/var/www/html"',
    `wp option update blogdescription ${JSON.stringify(plan.tagline)} --path="$WP_PATH" 2>/dev/null || true`,
  ];

  for (const category of plan.categories) {
    const slug = slugify(category.slug);
    lines.push(`
slug="${slug}"
existing=$(wp term list category --slug="$slug" --field=term_id --path="$WP_PATH" 2>/dev/null | head -n 1)
if [ -z "$existing" ]; then
  wp term create category ${JSON.stringify(category.name)} --slug="$slug" --porcelain --path="$WP_PATH" 2>/dev/null || true
fi`);
  }

  posts.forEach((post, index) => {
    const postSlug = slugify(post.title);
    const fileBase = `fast-${index}`;
    const categorySlug = slugify(post.categorySlug);

    lines.push(`
cat > /blog-images/${fileBase}.html <<'EOHTML'
${post.content}
EOHTML
cat > /blog-images/${fileBase}.meta <<'EOMETA'
${post.title}
EOMETA
cat > /blog-images/${fileBase}.excerpt <<'EOEXCERPT'
${post.excerpt}
EOEXCERPT
existing_post=$(wp post list --post_type=post --name="${postSlug}" --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)
if [ -z "$existing_post" ]; then
  existing_post=$(wp post list --post_type=post --s="${post.title}" --field=ID --path="$WP_PATH" 2>/dev/null | head -n 1)
fi
if [ -n "$existing_post" ]; then
  echo "[blog] Yazı zaten var: ${postSlug}"
else
  TITLE=$(cat /blog-images/${fileBase}.meta)
  EXCERPT=$(cat /blog-images/${fileBase}.excerpt)
  CONTENT=$(cat /blog-images/${fileBase}.html)
  POST_ID=$(wp post create --post_title="$TITLE" --post_content="$CONTENT" --post_excerpt="$EXCERPT" --post_status=publish --post_name="${postSlug}" --porcelain --path="$WP_PATH")
  CAT_ID=$(wp term list category --slug="${categorySlug}" --field=term_id --path="$WP_PATH" 2>/dev/null | head -n 1)
  if [ -n "$POST_ID" ] && [ -n "$CAT_ID" ]; then
    wp post term set "$POST_ID" category "$CAT_ID" --path="$WP_PATH" 2>/dev/null || true
  fi
  echo "[blog] Yazı eklendi: ${postSlug} (görsel AI ile eklenecek)"
fi
rm -f /blog-images/${fileBase}.html /blog-images/${fileBase}.meta /blog-images/${fileBase}.excerpt`);
  });

  lines.push(`
footer_count=$(wp widget list footer-widget-3 --format=count --path="$WP_PATH" 2>/dev/null || echo "0")
if [ "$footer_count" = "0" ]; then
  wp widget add categories footer-widget-3 --title="Kategoriler" --path="$WP_PATH" 2>/dev/null || true
fi
wp rewrite flush --path="$WP_PATH" 2>/dev/null || true`);

  return lines.join("\n");
}

/** Yazıları oluşturur; görseller enrichBlogAiImages ile AI üretilir */
export async function setupBlogContent(
  projectId: string,
  userPrompt: string,
  siteTitle: string,
): Promise<void> {
  const existingCount = await getPublishedPostCount(projectId);

  if (existingCount >= BLOG_POST_COUNT) {
    console.log(`[blog-content] ${projectId}: yazılar zaten mevcut, atlanıyor.`);
    return;
  }

  const plan = await generateBlogContentPlan(userPrompt, siteTitle);
  const posts = plan.posts.slice(0, BLOG_POST_COUNT);

  await saveBlogPlan(projectId, { ...plan, posts });
  await execWpCliSh(
    projectId,
    buildFastBlogSetupScript(plan, posts),
    240_000,
  );
}

/** Tüm blog yazılarına kullanıcı isteğine uygun AI kapak görseli üretir */
export async function enrichBlogAiImages(
  projectId: string,
  userPrompt: string,
): Promise<void> {
  const plan = await loadBlogPlan(projectId);

  if (!plan) {
    return;
  }

  const wpPosts = await listPublishedPosts(projectId);
  const posts = plan.posts.slice(0, BLOG_POST_COUNT);

  await mapWithConcurrency(posts, AI_IMAGE_CONCURRENCY, async (post) => {
    const postId = findPostIdForPlanPost(wpPosts, post);

    if (!postId) {
      console.warn(
        `[blog-content] Yazı eşleşmedi, görsel atlanıyor: ${post.title}`,
      );
      return;
    }

    const hasImage = await postHasFeaturedImage(projectId, postId);
    if (hasImage) {
      return;
    }

    const success = await attachAiBlogFeaturedImage(
      projectId,
      postId,
      post,
      userPrompt,
    );

    if (!success) {
      console.warn(`[blog-content] AI görsel üretilemedi: ${post.title}`);
    }
  });
}

/** Görseli olmayan yazılar için AI ile tekrar dener */
export async function ensureMissingBlogAiImages(
  projectId: string,
  userPrompt: string,
): Promise<void> {
  const plan = await loadBlogPlan(projectId);
  if (!plan) {
    return;
  }

  const wpPosts = await listPublishedPosts(projectId);

  for (const post of plan.posts.slice(0, BLOG_POST_COUNT)) {
    const postId = findPostIdForPlanPost(wpPosts, post);
    if (!postId || (await postHasFeaturedImage(projectId, postId))) {
      continue;
    }

    await attachAiBlogFeaturedImage(projectId, postId, post, userPrompt);
  }
}

/** Mevcut blog sitesinde header renkleri ve eksik görselleri onarır */
export async function repairBlogSite(
  projectId: string,
  primaryColor: string,
  userPrompt = "",
): Promise<void> {
  const { applyAstraBlogChrome } = await import("@/lib/wp-cli");

  await applyAstraBlogChrome(projectId, primaryColor || "#2563eb");

  if (userPrompt) {
    await enrichBlogAiImages(projectId, userPrompt);
    await ensureMissingBlogAiImages(projectId, userPrompt);
  }
}
