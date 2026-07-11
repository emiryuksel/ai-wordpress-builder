"use client";

import { useState } from "react";

import { SUPPORT_PHONE, type WordPressAccessInfo } from "@/lib/en/support";

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
      // Silently ignore if clipboard access is denied.
    }
  }

  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        title="Click to copy"
        className="group mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-left shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] transition hover:border-[#6c5ce7]/50 hover:bg-[#6c5ce7]/5"
      >
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-[#1d1d1f]">
          {value}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#6c5ce7]/12 text-[#5847e0] group-hover:bg-[#6c5ce7]/20"
          }`}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="m3.5 8.5 3 3 6-7"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect
                  x="5.5"
                  y="5.5"
                  width="8"
                  height="8"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M10.5 5.5v-1a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 2.5 4.5v5A1.5 1.5 0 0 0 4 11h1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Copy
            </>
          )}
        </span>
      </button>
    </div>
  );
}

export default function WordPressAccessCard({ access }: WordPressAccessCardProps) {
  return (
    <div className="glass w-full max-w-[95%] overflow-hidden rounded-[24px]">
      <div className="border-b border-white/50 px-4 py-3.5">
        <p className="text-sm font-semibold tracking-tight text-[#1d1d1f]">
          Your site is ready
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          You can sign in to your WordPress admin panel with the details below.
        </p>
      </div>

      <div className="divide-y divide-white/50">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Admin panel
          </p>
          <a
            href={access.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
          >
            View site
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

        <CopyRow label="Username" value={access.adminUser} />
        <CopyRow label="Password" value={access.adminPassword} />
      </div>

      <div className="border-t border-white/50 bg-white/30 px-4 py-3">
        <p className="text-xs leading-relaxed text-zinc-500">
          Our team will get in touch with you. For questions, call{" "}
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
            className="font-medium text-[#5847e0] underline decoration-[#6c5ce7]/40 underline-offset-2 transition hover:text-[#4a3bd0]"
          >
            {SUPPORT_PHONE}
          </a>
        </p>
      </div>
    </div>
  );
}
