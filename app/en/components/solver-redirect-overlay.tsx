"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface SolverRedirectOverlayProps {
  open: boolean;
  title: string;
  subtitle: string;
}

/**
 * Full-screen Apple-like transition shown while redirecting to Solver CMS.
 * A frosted glass surface, a gently breathing logo and a fluid progress line
 * make the user feel they are moving to a new place.
 */
export default function SolverRedirectOverlay({
  open,
  title,
  subtitle,
}: SolverRedirectOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="solver-redirect-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6"
    >
      <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl backdrop-saturate-150" />
      <div className="solver-redirect-mesh absolute inset-0" />

      <div className="solver-redirect-card relative flex flex-col items-center text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="solver-redirect-ring absolute inset-0 rounded-full" />
          <span className="solver-redirect-ring solver-redirect-ring--delay absolute inset-0 rounded-full" />
          <div className="glass-strong relative flex h-20 w-20 items-center justify-center rounded-[22px]">
            <Image
              src="/logo-light.png"
              alt="Solver"
              width={120}
              height={44}
              priority
              className="h-6 w-auto"
            />
          </div>
        </div>

        <h2 className="mt-8 text-[clamp(1.35rem,3vw,1.9rem)] font-semibold tracking-tight text-[#1d1d1f]">
          {title}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
          {subtitle}
        </p>

        <div className="mt-8 h-1 w-56 overflow-hidden rounded-full bg-[#6c5ce7]/12">
          <span className="solver-redirect-bar block h-full w-1/2 rounded-full bg-gradient-to-r from-[#7b6cf0] to-[#5847e0]" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
