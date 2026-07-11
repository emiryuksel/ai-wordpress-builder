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
    <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-10 text-center shadow-sm">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-sm"
        style={{ backgroundColor: primaryColor }}
      >
        {siteTitle.trim().charAt(0).toUpperCase() || "S"}
      </div>

      <h2 className="text-xl font-semibold text-zinc-900">{siteTitle}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
        Your site was created successfully. Due to the secure connection
        (HTTPS), the live preview opens in a new tab so it doesn&apos;t break in
        this panel.
      </p>

      <p className="mt-4 max-w-lg truncate font-mono text-xs text-zinc-500">
        {siteUrl}
      </p>

      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        Open site in a new tab
      </a>

      <p className="mt-4 text-xs text-zinc-500">
        After making changes, refresh the page to see the result.
      </p>
    </div>
  );
}
