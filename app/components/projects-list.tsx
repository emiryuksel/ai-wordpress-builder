"use client";

import Link from "next/link";

type ProjectListItem = {
  projectId: string;
  siteTitle: string;
  siteType: string;
  status: string;
  statusLabel: string;
  updatedAt: string;
};

interface ProjectsListProps {
  projects: ProjectListItem[];
  loading?: boolean;
}

function statusTone(status: string): string {
  switch (status) {
    case "ready":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "error":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  }
}

export default function ProjectsList({ projects, loading }: ProjectsListProps) {
  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
        Projeler yükleniyor...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800">
        Henüz projeniz yok. İlk prompt&apos;unuzu göndererek başlayın.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Projelerim
        </h2>
        <span className="text-xs text-zinc-500">{projects.length} proje</span>
      </div>

      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.projectId}>
            <Link
              href={`/builder/${project.projectId}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {project.siteTitle}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {new Date(project.updatedAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(project.status)}`}
              >
                {project.statusLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
