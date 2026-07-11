import Image from "next/image";
import Link from "next/link";

import SiteFooter from "@/app/components/site-footer";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalContent = {
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
};

export default function LegalPage({ content }: { content: LegalContent }) {
  return (
    <div className="app-canvas flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/30 bg-white/25 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center">
            <Image
              src="/logo-light.png"
              alt="Solver"
              width={112}
              height={40}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-white/80"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M10 3 5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ana sayfa
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-[#6c5ce7]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#5847e0]">
              ✦ YASAL
            </span>
            <h1 className="mt-5 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
              {content.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base">
              {content.intro}
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Son güncelleme: {content.updatedAt}
            </p>
          </div>

          <div className="glass-strong mt-12 space-y-10 rounded-[32px] p-6 sm:p-10">
            {content.sections.map((section, index) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
                  {index + 1}. {section.heading}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="mt-3 text-sm leading-relaxed text-zinc-600"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet.slice(0, 24)}
                        className="flex gap-2.5 text-sm leading-relaxed text-zinc-600"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6c5ce7]/60" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-zinc-400">
            Bu metin genel bilgilendirme amaçlıdır. Somut hukuki ihtiyaçlarınız için
            bir hukuk danışmanına başvurmanızı öneririz.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
