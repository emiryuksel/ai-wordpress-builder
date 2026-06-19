/** Ürün kategorisi çıkarımı (görsel eşleştirme artık yalnızca AI ile yapılır) */

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function inferProductCategory(
  productName: string,
  target = "",
): string {
  const haystack = normalizeText(`${productName} ${target}`);

  if (
    /baklava|yemek|gida|mutfak|mum|kahve|ev|dekor|sabun|temizlik|kutu/.test(
      haystack,
    )
  ) {
    return "ev-yasam";
  }

  if (
    /kulaklik|telefon|saat|laptop|bilgisayar|tablet|kamera|elektronik/.test(
      haystack,
    )
  ) {
    return "elektronik";
  }

  if (/tisort|ayakkabi|canta|cuzdan|giyim|moda|pantolon|elbise/.test(haystack)) {
    return "moda";
  }

  const normalizedTarget = normalizeText(target).replace(/\s+/g, "-");
  if (normalizedTarget.includes("elektron")) return "elektronik";
  if (normalizedTarget.includes("moda") || normalizedTarget.includes("giyim")) {
    return "moda";
  }
  if (normalizedTarget.includes("ev") || normalizedTarget.includes("yasam")) {
    return "ev-yasam";
  }

  return "ev-yasam";
}
