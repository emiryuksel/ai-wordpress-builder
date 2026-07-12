"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getActivityActionLabel } from "@/lib/activity-log-labels";

type OverviewResponse = {
  stats: {
    totalUsers: number;
    adminUsers: number;
    totalProjects: number;
    readyProjects: number;
    provisioningProjects: number;
    errorProjects: number;
    totalLogs: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    createdAt: string;
    projectCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    action: string;
    userEmail?: string;
    userName?: string;
    resourceId?: string;
  }>;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#1d1d1f]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/overview");
        const payload = (await response.json()) as OverviewResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Özet yüklenemedi.");
        }
        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Özet yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-3xl px-4 py-8 text-sm text-zinc-500">
        Admin özeti yükleniyor...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/80 px-4 py-6 text-sm text-red-700 backdrop-blur-sm">
        {error ?? "Özet yüklenemedi."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1d1d1f]">Admin özeti</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Üyelikler, projeler ve son sistem aktiviteleri.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam üyelik" value={data.stats.totalUsers} />
        <StatCard label="Admin hesapları" value={data.stats.adminUsers} />
        <StatCard
          label="Toplam site"
          value={data.stats.totalProjects}
          hint={`${data.stats.readyProjects} hazır · ${data.stats.provisioningProjects} kurulumda`}
        />
        <StatCard label="Kayıt sayısı" value={data.stats.totalLogs} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/40 px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1d1d1f]">
              Son üyelikler
            </h2>
            <Link
              href="/admin/users"
              className="text-xs font-medium text-[#5847e0] transition hover:text-[#6353e6]"
            >
              Tümünü gör
            </Link>
          </div>
          <ul className="divide-y divide-white/40">
            {data.recentUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1d1d1f]">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">
                    {user.projectCount} site
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/40 px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1d1d1f]">
              Son kayıtlar
            </h2>
            <Link
              href="/admin/logs"
              className="text-xs font-medium text-[#5847e0] transition hover:text-[#6353e6]"
            >
              Tümünü gör
            </Link>
          </div>
          <ul className="divide-y divide-white/40">
            {data.recentActivity.map((entry) => (
              <li key={entry.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[#1d1d1f]">
                      {getActivityActionLabel(entry.action)}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {entry.userName || entry.userEmail || "Sistem"}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-zinc-400">
                    {new Date(entry.timestamp).toLocaleString("tr-TR")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
