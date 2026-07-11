"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import DeleteProjectModal from "@/app/components/delete-project-modal";

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
  onProjectDeleted?: () => void;
}

type SortMode = "recent" | "name";

const HERO_GRADIENTS = [
  "from-[#6c5ce7] via-[#5847e0] to-[#3f2fc7]",
  "from-[#a855f7] via-[#7b6cf0] to-[#5847e0]",
  "from-[#5847e0] via-[#6c5ce7] to-[#a394ff]",
  "from-[#7b6cf0] via-[#8577f2] to-[#a855f7]",
];

function heroGradient(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) {
    sum += id.charCodeAt(i);
  }
  return HERO_GRADIENTS[sum % HERO_GRADIENTS.length];
}

function statusTone(status: string): string {
  switch (status) {
    case "ready":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-red-100 text-red-700";
    default:
      return "bg-[#6c5ce7]/12 text-[#5847e0]";
  }
}

function formatEdited(value: string): string {
  const date = new Date(value);
  return `Son düzenleme ${date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  })}, ${date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function ProjectsList({
  projects,
  loading,
  onProjectDeleted,
}: ProjectsListProps) {
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? projects.filter(
          (project) =>
            project.siteTitle.toLowerCase().includes(normalized) ||
            project.siteType.toLowerCase().includes(normalized),
        )
      : projects;

    return [...filtered].sort((a, b) => {
      if (sortMode === "name") {
        return a.siteTitle.localeCompare(b.siteTitle, "tr");
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, query, sortMode]);

  function scrollBy(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * 340, behavior: "smooth" });
  }

  return (
    <>
      <div className="glass-strong rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
              Projelerim
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {projects.length} proje
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="m14 14 3 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ara"
                className="w-full rounded-full border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/12 sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setSortMode((current) => (current === "recent" ? "name" : "recent"))
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] transition hover:border-zinc-400 hover:bg-zinc-50"
              title={sortMode === "recent" ? "Tarihe göre sıralı" : "İsme göre sıralı"}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 3v10m0 0L2 11m2 2 2-2M12 13V3m0 0-2 2m2-2 2 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {sortMode === "recent" ? "Tarih" : "İsim"}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-zinc-500">Projeler yükleniyor...</p>
        ) : projects.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-black/10 bg-white/40 px-5 py-10 text-center text-sm text-zinc-500">
            Henüz projeniz yok. İlk prompt&apos;unuzu göndererek başlayın.
          </div>
        ) : visibleProjects.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">
            &quot;{query}&quot; ile eşleşen proje bulunamadı.
          </p>
        ) : (
          <div className="relative mt-6">
            <div
              ref={scrollerRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visibleProjects.map((project) => (
                <div
                  key={project.projectId}
                  className="group relative w-[300px] shrink-0 snap-start"
                >
                  <Link href={`/builder/${project.projectId}`} className="block">
                    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_10px_30px_-16px_rgba(30,27,75,0.3)] transition-shadow duration-300 group-hover:shadow-[0_20px_50px_-20px_rgba(30,27,75,0.4)]">
                      <div
                        className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${heroGradient(
                          project.projectId,
                        )}`}
                      >
                        <span className="text-4xl font-bold text-white/95 drop-shadow-sm">
                          {project.siteTitle.charAt(0).toUpperCase()}
                        </span>
                        <span
                          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(
                            project.status,
                          )}`}
                        >
                          {project.statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 px-1">
                      <p className="truncate text-sm font-semibold text-[#1d1d1f]">
                        {project.siteTitle}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {project.siteType} · {formatEdited(project.updatedAt)}
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(project)}
                    className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/80 text-zinc-500 opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
                    aria-label={`${project.siteTitle} projesini sil`}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3 4h10M6.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1m-6 0 .7 8.1a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9L12 4"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {visibleProjects.length > 2 ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  aria-label="Önceki"
                  className="absolute left-1 top-[80px] flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-zinc-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#5847e0]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M10 3 5 8l5 5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  aria-label="Sonraki"
                  className="absolute right-1 top-[80px] flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-zinc-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#5847e0]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M6 3l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <DeleteProjectModal
          open
          projectId={deleteTarget.projectId}
          siteTitle={deleteTarget.siteTitle}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => onProjectDeleted?.()}
        />
      ) : null}
    </>
  );
}
