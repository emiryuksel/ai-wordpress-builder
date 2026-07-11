"use client";

import Image from "next/image";
import Link from "next/link";

import LanguageSwitch from "@/app/components/language-switch";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/en/#how-it-works" },
      { label: "Features", href: "/en/#features" },
      { label: "Pricing", href: "/en/#pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/en/legal/privacy" },
      { label: "Terms of Service", href: "/en/legal/terms" },
      { label: "Cookie Policy", href: "/en/legal/cookies" },
      { label: "Data Protection Notice", href: "/en/legal/data-protection" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "withsolver.com", href: "https://withsolver.com", external: true },
      { label: "Support", href: "mailto:destek@withsolver.com", external: true },
    ],
  },
];

function SocialIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <a
      href="https://withsolver.com"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 text-zinc-500 transition hover:bg-white hover:text-[#5847e0]"
    >
      {children}
    </a>
  );
}

export default function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-black/5 bg-white/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand block */}
          <div>
            <Image
              src="/logo-light.png"
              alt="Solver"
              width={112}
              height={40}
              className="h-7 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              AI-powered WordPress site builder. Build by chatting, publish in
              minutes.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <SocialIcon label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21H9z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 4.86A4.94 4.94 0 1 0 12 17a4.94 4.94 0 0 0 0-9.88zm0 8.15A3.21 3.21 0 1 1 12 8.79a3.21 3.21 0 0 1 0 6.42zm5.14-8.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
                </svg>
              </SocialIcon>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="text-sm text-zinc-600 transition hover:text-[#5847e0]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-600 transition hover:text-[#5847e0]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 sm:flex-row">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} withSolver. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Language:
            </span>
            <LanguageSwitch active="en" variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
