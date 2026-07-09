"use client";

import { useState } from "react";

import { SUPPORT_PHONE, type WordPressAccessInfo } from "@/lib/support";

interface WordPressAccessCardProps {
  access: WordPressAccessInfo;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Panoya erişim reddedilirse sessizce geç.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          copied
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        }`}
      >
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}

export default function WordPressAccessCard({ access }: WordPressAccessCardProps) {
  return (
    <div className="w-full max-w-[95%] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-900/90">
      <div className="border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
        <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Siteniz hazır
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          WordPress yönetim panelinize aşağıdaki bilgilerle giriş yapabilirsiniz.
        </p>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Yönetim paneli
          </p>
          <a
            href={access.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Siteyi görüntüle
            <svg
              className="h-3.5 w-3.5 shrink-0 opacity-80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        <CopyRow label="Kullanıcı adı" value={access.adminUser} />
        <CopyRow label="Şifre" value={access.adminPassword} />
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Ekibimiz sizinle iletişime geçecektir. Sorularınız için{" "}
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
            className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100"
          >
            {SUPPORT_PHONE}
          </a>
        </p>
      </div>
    </div>
  );
}
