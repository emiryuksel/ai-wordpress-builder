"use client";

import Image from "next/image";
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
    ? "bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)]"
    : "text-zinc-600 hover:bg-white/60 hover:text-[#1d1d1f]";
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-canvas flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 shrink-0 border-b border-white/30 bg-white/25 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
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
            <span className="rounded-full bg-[#6c5ce7]/12 px-2.5 py-1 text-xs font-medium text-[#5847e0]">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-[#1d1d1f]">{user.name}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-white/80"
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
                  className={`block shrink-0 rounded-2xl px-3 py-2 text-sm font-medium transition md:shrink ${navClassName(active)}`}
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
