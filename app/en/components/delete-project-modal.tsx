"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DeleteProjectModalProps = {
  open: boolean;
  projectId: string;
  siteTitle: string;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteProjectModal({
  open,
  projectId,
  siteTitle,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  const [confirmTitle, setConfirmTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setConfirmTitle("");
      setError(null);
      setLoading(false);
    }
  }, [open, projectId]);

  if (!open || !mounted) {
    return null;
  }

  const canDelete = confirmTitle === siteTitle;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canDelete) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTitle }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete the project.");
      }

      onDeleted();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not delete the project.",
      );
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1b4b]/30 px-4 backdrop-blur-md">
      <div
        className="glass-strong w-full max-w-md overflow-hidden rounded-[28px] p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delete-project-modal-title"
              className="text-xl font-semibold tracking-tight text-[#1d1d1f]"
            >
              Delete project
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              This action cannot be undone. Your site and all its content will be
              permanently deleted.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/50 text-zinc-500 transition hover:bg-white/80 hover:text-zinc-800 disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-red-200/70 bg-red-50/70 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">{siteTitle}</p>
          <p className="mt-1 text-red-700">
            Type the project name exactly below to delete it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-700">Project name</span>
            <input
              value={confirmTitle}
              onChange={(event) => setConfirmTitle(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={siteTitle}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/12"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/70 bg-white/60 px-4 text-sm font-medium text-zinc-700 transition hover:bg-white/90 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canDelete}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(220,38,38,0.6)] transition hover:from-red-500 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete project"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
