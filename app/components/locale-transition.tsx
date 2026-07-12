"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function LocaleTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Yeni sayfa yüklendiğinde leaving durumunu temizle ve fade-in'i yeniden tetikle
    const node = ref.current;
    if (!node) return;
    node.removeAttribute("data-leaving");
    node.classList.remove("locale-transition");
    // reflow zorla, animasyonu baştan oynat
    void node.offsetWidth;
    node.classList.add("locale-transition");
  }, [pathname]);

  return (
    <div
      id="locale-root"
      ref={ref}
      onAnimationEnd={(event) => {
        // Fade-in bitince transform/animation kalıntısını temizle,
        // böylece sayfa sonunda ekstra scroll alanı / beyaz boşluk oluşmaz.
        if (event.animationName && ref.current) {
          ref.current.classList.remove("locale-transition");
        }
      }}
      className="locale-transition flex min-h-full flex-1 flex-col"
    >
      {children}
    </div>
  );
}
