"use client";

import { FormEvent, useEffect, useState } from "react";

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

  useEffect(() => {
    if (open) {
      setConfirmTitle("");
      setError(null);
      setLoading(false);
    }
  }, [open, projectId]);

  if (!open) {
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
        throw new Error(data.error ?? "Proje silinemedi.");
      }

      onDeleted();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Proje silinemedi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delete-project-modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Projeyi sil
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Bu işlem geri alınamaz. WordPress container&apos;ı, veritabanı ve
              tüm site dosyaları kalıcı olarak silinir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-60 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Kapat
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          <p className="font-medium">{siteTitle}</p>
          <p className="mt-1 text-red-700 dark:text-red-300">
            Silmek için aşağıya proje adını tam olarak yazın.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Proje adı
            </span>
            <input
              value={confirmTitle}
              onChange={(event) => setConfirmTitle(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={siteTitle}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || !canDelete}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Siliniyor..." : "Projeyi sil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
