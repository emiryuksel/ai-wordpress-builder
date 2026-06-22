/** Geçici: yalnızca kurumsal site akışı aktif */
export const CORPORATE_ONLY_MODE = true;

export const ECOMMERCE_KEYWORDS =
  /e-?ticaret|e-?commerce|shop|mağaza|magaza|woocommerce/i;

export const CORPORATE_KEYWORDS =
  /kurumsal|corporate|business|şirket|sirket|firma|hizmet|agency|consulting|danışmanlık|danismanlik|inşaat|insaat|klinik|avukat|holding|mühendislik|muhendislik|yazılım|yazilim|b2b/i;

export function isEcommerceProject(input: {
  siteType: string;
  suggestedPlugins: string[];
  prompt?: string;
}): boolean {
  if (CORPORATE_ONLY_MODE) {
    return false;
  }

  const hasWoo = input.suggestedPlugins.some(
    (plugin) => plugin.trim().toLowerCase() === "woocommerce",
  );

  const combined = `${input.siteType} ${input.prompt ?? ""}`;

  return hasWoo || ECOMMERCE_KEYWORDS.test(combined);
}

export function isCorporateProject(input: {
  siteType: string;
  suggestedPlugins: string[];
  prompt?: string;
}): boolean {
  if (CORPORATE_ONLY_MODE) {
    return true;
  }

  if (isEcommerceProject(input)) {
    return false;
  }

  const combined = `${input.siteType} ${input.prompt ?? ""}`.toLowerCase();

  return CORPORATE_KEYWORDS.test(combined);
}
