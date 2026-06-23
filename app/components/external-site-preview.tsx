"use client";

interface ExternalSitePreviewProps {
  siteTitle: string;
  siteUrl: string;
  primaryColor: string;
}

export default function ExternalSitePreview({
  siteTitle,
  siteUrl,
  primaryColor,
}: ExternalSitePreviewProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-sm"
        style={{ backgroundColor: primaryColor }}
      >
        {siteTitle.trim().charAt(0).toUpperCase() || "S"}
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {siteTitle}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Siteniz başarıyla oluşturuldu. Güvenli bağlantı (HTTPS) nedeniyle canlı
        önizleme yeni sekmede açılır; bu panelde bozuk görünüm oluşmaz.
      </p>

      <p className="mt-4 max-w-lg truncate font-mono text-xs text-zinc-500 dark:text-zinc-500">
        {siteUrl}
      </p>

      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        Siteyi yeni sekmede aç
      </a>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Değişiklik yaptıktan sonra sayfayı yenileyerek sonucu görebilirsiniz.
      </p>
    </div>
  );
}
