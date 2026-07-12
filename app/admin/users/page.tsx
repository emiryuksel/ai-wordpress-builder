"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
  projectCount: number;
  projects: Array<{
    projectId: string;
    siteTitle: string;
    siteType: string;
    status: string;
    slug?: string;
    updatedAt: string;
    createdAt: string;
  }>;
};

type UsersResponse = {
  users: AdminUser[];
  error?: string;
};

function roleBadge(role: string): string {
  return role === "admin"
    ? "bg-[#6c5ce7]/12 text-[#5847e0]"
    : "bg-white/60 text-zinc-600";
}

function statusBadge(status: string): string {
  switch (status) {
    case "ready":
      return "bg-emerald-100/80 text-emerald-700";
    case "error":
      return "bg-red-100/80 text-red-700";
    default:
      return "bg-[#6c5ce7]/12 text-[#5847e0]";
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/users");
        const payload = (await response.json()) as UsersResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Üyelikler yüklenemedi.");
        }
        if (!cancelled) {
          setUsers(payload.users);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Üyelikler yüklenemedi.",
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
        Üyelikler yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/80 px-4 py-6 text-sm text-red-700 backdrop-blur-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1d1d1f]">Üyelikler</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Kayıtlı tüm kullanıcılar ve oluşturdukları siteler.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/40 bg-white/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Kayıt</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {users.map((user) => {
                const expanded = expandedUserId === user.id;
                return (
                  <tr key={user.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#1d1d1f]">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge(user.role)}`}
                      >
                        {user.role === "admin" ? "Admin" : "Kullanıcı"}
                      </span>
                    </td>
                    <td className="px-4 py-4 capitalize text-zinc-700">
                      {user.plan}
                    </td>
                    <td className="px-4 py-4 text-zinc-700">
                      {user.projectCount}
                    </td>
                    <td className="px-4 py-4 text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-4">
                      {user.projects.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedUserId(expanded ? null : user.id)
                          }
                          className="text-xs font-medium text-[#5847e0] transition hover:text-[#6353e6]"
                        >
                          {expanded ? "Gizle" : "Siteleri göster"}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">Site yok</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {expandedUserId ? (
        <section className="glass rounded-3xl p-4">
          {users
            .filter((user) => user.id === expandedUserId)
            .map((user) => (
              <div key={user.id}>
                <h2 className="text-sm font-semibold text-[#1d1d1f]">
                  {user.name} — siteler
                </h2>
                <ul className="mt-3 space-y-2">
                  {user.projects.map((project) => (
                    <li
                      key={project.projectId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1d1d1f]">
                          {project.siteTitle}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {project.siteType} ·{" "}
                          {new Date(project.updatedAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(project.status)}`}
                        >
                          {project.status}
                        </span>
                        <Link
                          href={`/builder/${project.projectId}`}
                          className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white/80"
                        >
                          Builder
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      ) : null}
    </div>
  );
}
