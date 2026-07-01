import type { ChatAction } from "@/lib/intent-schema";

const INVALID_SERVICE_HINTS =
  /lütfen|belirtin|örn\.|istek|görsel anahtar|açıklaması|belirt|ekleme isteği|hizmet adı/i;

const TR_EN_SERVICE_KEYWORDS: Record<string, string> = {
  mühendislik: "engineering",
  muhendislik: "engineering",
  danışmanlık: "consulting",
  danismanlik: "consulting",
  inşaat: "construction",
  insaat: "construction",
  mimarlık: "architecture",
  mimarlik: "architecture",
  yazılım: "software",
  yazilim: "software",
  proje: "project management",
  hukuk: "legal",
  avukat: "legal",
  sağlık: "healthcare",
  saglik: "healthcare",
  klinik: "healthcare",
  muhasebe: "accounting",
  finans: "finance",
  pazarlama: "marketing",
  tasarım: "design",
  tasarim: "design",
  eğitim: "education",
  egitim: "education",
  lojistik: "logistics",
  üretim: "manufacturing",
  uretim: "manufacturing",
};

export function looksLikeInvalidServiceName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.length > 64) {
    return true;
  }
  if (INVALID_SERVICE_HINTS.test(trimmed)) {
    return true;
  }
  if (/\bhizmet(?:i)?\s+ekle\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function looksLikeInvalidServiceDescription(description: string): boolean {
  const trimmed = description.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.length > 220) {
    return true;
  }
  return INVALID_SERVICE_HINTS.test(trimmed);
}

function titleCaseServiceName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toLocaleUpperCase("tr-TR") +
        word.slice(1).toLocaleLowerCase("tr-TR"),
    )
    .join(" ");
}

/** "Mühendislik danışmanlığı hizmeti ekle" → "Mühendislik Danışmanlığı */
export function extractServiceNameFromMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const patterns = [
    /^(.+?)\s+hizmet(?:i)?\s+ekle\.?$/i,
    /^(.+?)\s+hizmet(?:i)?\s+ekleyin\.?$/i,
    /^ekle[:\s]+(.+?)\s+hizmet(?:i)?\.?$/i,
    /^(.+?)\s+hizmet(?:i)?\s+olsun\.?$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    const raw = match?.[1]?.trim();
    if (raw && !looksLikeInvalidServiceName(raw)) {
      return titleCaseServiceName(raw);
    }
  }

  if (/\bhizmet\b/i.test(trimmed)) {
    const generic = trimmed.match(/^(.+?)\s+ekle\.?$/i);
    const candidate = generic?.[1]
      ?.replace(/\s+hizmet(?:i)?$/i, "")
      .trim();
    if (candidate && !looksLikeInvalidServiceName(candidate)) {
      return titleCaseServiceName(candidate);
    }
  }

  return null;
}

export function inferServiceImageKeyword(serviceName: string): string {
  const lower = serviceName.toLocaleLowerCase("tr-TR");
  const keywords = new Set<string>();

  for (const [tr, en] of Object.entries(TR_EN_SERVICE_KEYWORDS)) {
    if (lower.includes(tr)) {
      keywords.add(en);
    }
  }

  if (keywords.size > 0) {
    return Array.from(keywords).join(" ");
  }

  return "corporate business service";
}

export function buildDefaultServiceDescription(serviceName: string): string {
  return `${serviceName} alanında uzman ekibimizle ihtiyaçlarınıza özel çözümler sunuyoruz.`;
}

export function normalizeAddServiceAction(
  action: ChatAction,
  userMessage: string,
): ChatAction {
  if (action.actionType !== "add_service") {
    return action;
  }

  let serviceName = action.serviceName?.trim() ?? "";
  if (looksLikeInvalidServiceName(serviceName)) {
    serviceName = "";
  }

  if (!serviceName && action.value.trim() && !looksLikeInvalidServiceName(action.value)) {
    serviceName = titleCaseServiceName(action.value.trim());
  }

  if (!serviceName) {
    const extracted = extractServiceNameFromMessage(userMessage);
    if (extracted) {
      serviceName = extracted;
    }
  }

  let serviceDescription = action.serviceDescription?.trim() ?? "";
  if (looksLikeInvalidServiceDescription(serviceDescription)) {
    serviceDescription = "";
  }

  let imageKeyword = action.imageKeyword?.trim() ?? "";
  if (
    !imageKeyword ||
    INVALID_SERVICE_HINTS.test(imageKeyword) ||
    imageKeyword.length > 48
  ) {
    imageKeyword = serviceName
      ? inferServiceImageKeyword(serviceName)
      : "corporate business service";
  }

  if (serviceName && !serviceDescription) {
    serviceDescription = buildDefaultServiceDescription(serviceName);
  }

  return {
    ...action,
    target: "service",
    value: "",
    serviceName: serviceName || undefined,
    serviceDescription: serviceDescription || undefined,
    imageKeyword,
  };
}
