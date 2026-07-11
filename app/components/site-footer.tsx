"use client";

import Image from "next/image";

function SocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="https://withsolver.com/tr"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 text-zinc-500 transition hover:bg-white hover:text-[#5847e0]"
    >
      {children}
    </a>
  );
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-white/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-md">
          <Image
            src="/logo-light.png"
            alt="Solver"
            width={112}
            height={40}
            className="h-7 w-auto"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
            Yapay zeka destekli web sitesi işletim sistemi. Konuşarak inşa edin.
          </p>

          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Language:
            </span>
            <button
              type="button"
              className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 transition hover:text-[#1d1d1f]"
            >
              ENGLISH
            </button>
            <button
              type="button"
              className="rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-3 py-1 text-xs font-medium text-white shadow-sm"
            >
              TÜRKÇE
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <SocialIcon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21H9z" />
              </svg>
            </SocialIcon>
            <SocialIcon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 4.86A4.94 4.94 0 1 0 12 17a4.94 4.94 0 0 0 0-9.88zm0 8.15A3.21 3.21 0 1 1 12 8.79a3.21 3.21 0 0 1 0 6.42zm5.14-8.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z" />
              </svg>
            </SocialIcon>
            <SocialIcon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
              </svg>
            </SocialIcon>
          </div>
        </div>

        <div className="mt-12 border-t border-black/5 pt-6">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} withSolver. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
