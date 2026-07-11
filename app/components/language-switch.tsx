"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

type Locale = "tr" | "en";

interface LanguageSwitchProps {
  active: Locale;
  variant?: "header" | "footer";
}

const TARGET: Record<Locale, string> = {
  tr: "/",
  en: "/en",
};

function triggerLeave() {
  if (typeof document === "undefined") return;
  const root = document.getElementById("locale-root");
  if (root) {
    root.setAttribute("data-leaving", "true");
  }
}

export default function LanguageSwitch({
  active,
  variant = "header",
}: LanguageSwitchProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const go = useCallback(
    (locale: Locale) => {
      if (locale === active) return;
      triggerLeave();
      // Fade-out süresi (0.28s) kadar bekleyip navigasyonu başlat
      window.setTimeout(() => {
        startTransition(() => {
          router.push(TARGET[locale]);
        });
      }, 240);
    },
    [active, router],
  );

  const isFooter = variant === "footer";
  const wrapClass = isFooter
    ? "flex items-center gap-2"
    : "flex items-center rounded-full border border-white/60 bg-white/40 p-0.5";
  const activeClass =
    "rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white shadow-sm";
  const idleClass =
    "rounded-full text-zinc-500 transition hover:text-[#1d1d1f]";
  const sizeClass = isFooter ? "px-3 py-1 text-xs font-medium" : "px-2.5 py-1 text-xs font-medium";

  const trLabel = isFooter ? "Türkçe" : "TR";
  const enLabel = isFooter ? "English" : "EN";

  return (
    <div className={wrapClass}>
      <button
        type="button"
        onClick={() => go("tr")}
        aria-current={active === "tr" ? "true" : undefined}
        className={`${sizeClass} ${active === "tr" ? activeClass : idleClass}`}
      >
        {trLabel}
      </button>
      <button
        type="button"
        onClick={() => go("en")}
        aria-current={active === "en" ? "true" : undefined}
        className={`${sizeClass} ${active === "en" ? activeClass : idleClass}`}
      >
        {enLabel}
      </button>
    </div>
  );
}
