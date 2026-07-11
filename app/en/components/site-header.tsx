"use client";

import Link from "next/link";
import Image from "next/image";

import type { AuthContext } from "@/app/en/components/auth-modal";
import LanguageSwitch from "@/app/components/language-switch";

interface SiteHeaderProps {
  authContext: AuthContext | null;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
}

export default function SiteHeader({
  authContext,
  onLoginClick,
  onRegisterClick,
  onLogout,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-white/30 bg-white/25 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/en" className="flex min-w-0 items-center">
          <Image
            src="/logo-light.png"
            alt="Solver"
            width={112}
            height={40}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch active="en" />
          {authContext ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                {authContext.user.role === "admin" ? (
                  <Link
                    href="/en/admin"
                    className="rounded-full bg-[#6c5ce7]/12 px-2.5 py-1 text-xs font-medium text-[#5847e0] transition hover:bg-[#6c5ce7]/20"
                  >
                    Admin panel
                  </Link>
                ) : null}
                <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs text-zinc-600">
                  {authContext.unlimited
                    ? `${authContext.projectCount} sites`
                    : `${authContext.projectCount}/${authContext.projectLimit} sites`}
                </span>
              </div>

              <div className="hidden h-6 w-px bg-black/10 sm:block" />

              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-[#1d1d1f]">
                  {authContext.user.name}
                </p>
                <p className="hidden truncate text-xs text-zinc-500 sm:block">
                  {authContext.user.email}
                </p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-white/80"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-white/80"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={onRegisterClick}
                className="rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-3.5 py-1.5 text-sm font-medium text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
