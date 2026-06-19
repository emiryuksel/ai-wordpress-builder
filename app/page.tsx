"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type ProvisionResponse = {
  projectId: string;
  hostPort: number;
  siteUrl: string;
  status: string;
  siteType: string;
  siteTitle: string;
  error?: string;
};

type StatusResponse = {
  projectId: string;
  status: string;
  hostPort: number;
  siteUrl: string;
  ready: boolean;
  reachable: boolean;
  message: string;
  error: string | null;
};

const EXAMPLE_PROMPTS = [
  "Minimal bir blog sitesi istiyorum",
  "Koyu temalı bir e-ticaret sitesi kur",
  "Fotoğrafçı portfolyo sitesi, siyah-beyaz tasarım",
];

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000;
const PROVISION_TIMEOUT_MS = 2 * 60 * 1000;

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const isSubmitDisabled =
    !mounted || loading || prompt.trim().length === 0;

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  async function pollStatus(projectId: string) {
    const elapsedSeconds = Math.floor(
      (Date.now() - pollStartedAtRef.current) / 1000,
    );

    if (Date.now() - pollStartedAtRef.current > MAX_POLL_DURATION_MS) {
      stopPolling();
      setLoading(false);
      setError(
        "Kurulum beklenenden uzun sürdü. Docker Desktop açık mı kontrol edin ve tekrar deneyin.",
      );
      return;
    }

    const response = await fetch(
      `/api/provision/status?projectId=${encodeURIComponent(projectId)}&elapsed=${elapsedSeconds}`,
    );
    const data = (await response.json()) as StatusResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Durum sorgulanamadı.");
    }

    setStatusMessage(data.message);

    if (data.status === "error") {
      stopPolling();
      setLoading(false);
      setError(data.error ?? "Kurulum başarısız oldu.");
      return;
    }

    if (data.ready) {
      stopPolling();
      router.push(`/builder/${projectId}`);
    }
  }

  function startPolling(projectId: string) {
    stopPolling();
    pollStartedAtRef.current = Date.now();

    void pollStatus(projectId).catch((pollError) => {
      stopPolling();
      setLoading(false);
      setError(
        pollError instanceof Error
          ? pollError.message
          : "Durum kontrolü başarısız.",
      );
    });

    pollTimerRef.current = setInterval(() => {
      void pollStatus(projectId).catch((pollError) => {
        stopPolling();
        setLoading(false);
        setError(
          pollError instanceof Error
            ? pollError.message
            : "Durum kontrolü başarısız.",
        );
      });
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("İsteğiniz Gemini ile analiz ediliyor...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVISION_TIMEOUT_MS);

    try {
      const response = await fetch("/api/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
        signal: controller.signal,
      });

      const data = (await response.json()) as ProvisionResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Kurulum başlatılamadı.");
      }

      setStatusMessage("Kurulum başladı, Docker container'ları hazırlanıyor...");
      startPolling(data.projectId);
    } catch (submitError) {
      setLoading(false);

      if (submitError instanceof Error && submitError.name === "AbortError") {
        setError(
          "İstek zaman aşımına uğradı. Gemini veya Docker yanıt vermedi — tekrar deneyin.",
        );
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Beklenmeyen bir hata oluştu.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            AI WordPress Builder
          </p>
          <h1
            className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            suppressHydrationWarning
          >
            Ne tür bir site istersiniz?
          </h1>
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sitenizi doğal dille tarif edin. Sistem otomatik olarak WordPress
            kurar, uygun temayı ve eklentileri yükler.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Site açıklaması
            </span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Örn: Mavi tonlarda modern bir blog sitesi istiyorum..."
              rows={5}
              disabled={loading}
              className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-blue-900"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={loading}
                onClick={() => setPrompt(example)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            suppressHydrationWarning
          >
            {loading ? "Kurulum devam ediyor..." : "Siteyi Oluştur"}
          </button>
        </form>

        {loading && statusMessage ? (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            <div className="flex items-center gap-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
              <span>{statusMessage}</span>
            </div>
            <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
              İlk kurulum 1-3 dakika sürebilir (e-ticaret daha uzun). Bu sayfayı
              kapatmayın; ilerleme otomatik güncellenir.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
