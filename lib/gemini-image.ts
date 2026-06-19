const IMAGE_MODELS = [
  process.env.GEMINI_IMAGE_MODEL,
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-preview-image-generation",
].filter((model): model is string => Boolean(model));

const GENERATE_TIMEOUT_MS = 28_000;

interface GeminiImagePart {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiImagePart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

function buildProductImagePrompt(
  productName: string,
  description: string,
  category: string,
  userPrompt: string,
): string {
  const context = [productName, description, category, userPrompt]
    .filter(Boolean)
    .join(". ");

  return [
    "Professional e-commerce product photo for an online store.",
    "The image must match the customer's store concept and request.",
    context,
    "Single product centered, clean white or light neutral background,",
    "soft studio lighting, sharp focus, realistic, commercial catalog style.",
    "No text, no watermark, no logo, no people unless the product requires it.",
  ].join(" ");
}

async function generateImageWithRetry(
  generate: () => Promise<Buffer | null>,
  attempts = 2,
): Promise<Buffer | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const buffer = await generate();
    if (buffer && buffer.length > 1024) {
      return buffer;
    }
  }
  return null;
}

async function requestImageFromModel(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
          },
        }),
      },
    );

    const payload = (await response.json()) as GeminiImageResponse;

    if (!response.ok) {
      const message = payload.error?.message ?? response.statusText;
      console.warn(`[gemini-image] ${model} başarısız: ${message}`);
      return null;
    }

    const parts = payload.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      const data = part.inlineData?.data;
      if (!data) {
        continue;
      }

      return Buffer.from(data, "base64");
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[gemini-image] ${model} hata: ${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateProductImage(
  productName: string,
  description = "",
  category = "",
  userPrompt = "",
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const prompt = buildProductImagePrompt(
    productName,
    description,
    category,
    userPrompt,
  );

  return generateImageWithRetry(async () => {
    for (const model of IMAGE_MODELS) {
      const buffer = await requestImageFromModel(apiKey, model, prompt);
      if (buffer && buffer.length > 1024) {
        return buffer;
      }
    }
    return null;
  });
}

function buildBlogImagePrompt(
  postTitle: string,
  excerpt: string,
  userPrompt: string,
  imagePrompt: string,
): string {
  const context = [postTitle, excerpt, userPrompt, imagePrompt]
    .filter(Boolean)
    .join(". ");

  return [
    "Editorial blog featured image, wide landscape composition.",
    context,
    "Atmospheric, visually rich, professional photography or illustration style.",
    "Suitable as a WordPress blog post header image.",
    "No text, no watermark, no logo, no collage of multiple scenes.",
  ].join(" ");
}

export async function generateBlogFeaturedImage(
  postTitle: string,
  excerpt: string,
  userPrompt: string,
  imagePrompt: string,
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const prompt = buildBlogImagePrompt(
    postTitle,
    excerpt,
    userPrompt,
    imagePrompt,
  );

  return generateImageWithRetry(async () => {
    for (const model of IMAGE_MODELS) {
      const buffer = await requestImageFromModel(apiKey, model, prompt);
      if (buffer && buffer.length > 1024) {
        return buffer;
      }
    }
    return null;
  });
}
