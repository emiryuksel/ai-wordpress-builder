"use client";

import Link from "next/link";

import type { AuthContext } from "@/app/components/auth-modal";

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
    <header className="shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            AI WordPress Builder
          </p>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {authContext ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                {authContext.user.role === "admin" ? (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    Admin
                  </span>
                ) : null}
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {authContext.unlimited
                    ? `${authContext.projectCount} site`
                    : `${authContext.projectCount}/${authContext.projectLimit} site`}
                </span>
                <span
                  className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-400 dark:border-zinc-700"
                  title="Premium yakında"
                >
                  Premium yakında
                </span>
              </div>

              <div className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />

              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {authContext.user.name}
                </p>
                <p className="hidden truncate text-xs text-zinc-500 sm:block">
                  {authContext.user.email}
                </p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Çıkış yap
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Giriş yap
              </button>
              <button
                type="button"
                onClick={onRegisterClick}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Kayıt ol
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
