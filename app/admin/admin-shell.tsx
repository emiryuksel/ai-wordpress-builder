"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminShellUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

interface AdminShellProps {
  user: AdminShellUser;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Özet", exact: true },
  { href: "/admin/users", label: "Üyelikler" },
  { href: "/admin/logs", label: "Kayıtlar" },
];

function navClassName(active: boolean): string {
  return active
    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              AI WordPress Builder
            </Link>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {user.name}
              </p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Ana sayfa
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition md:shrink ${navClassName(active)}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
