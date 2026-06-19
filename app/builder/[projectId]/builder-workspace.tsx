"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ProjectResponse = {
  projectId: string;
  siteTitle: string;
  siteType: string;
  siteUrl: string;
  hostPort: number;
  status: string;
  suggestedPrimaryColor: string;
  suggestedTheme: string;
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  success: boolean;
  applied?: boolean;
  reply: string;
  error?: string;
  action?: {
    actionType: string;
    target: string;
    value: string;
    productName?: string;
  };
};

interface BuilderWorkspaceProps {
  projectId: string;
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-2.5 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800"
        role="status"
        aria-live="polite"
        aria-label="İstek işleniyor"
      >
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500 [animation-delay:300ms]" />
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          İşleniyor…
        </span>
      </div>
    </div>
  );
}

export default function BuilderWorkspace({ projectId }: BuilderWorkspaceProps) {
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "Merhaba! Siteniz hazır. Site adını değiştirebilir, ürün ekleyebilir (AI ürün görseli üretir) veya renk/font düzenleyebilirsiniz — örneğin: \"Site adını TechShop yap\", \"799 TL'lik kablosuz kulaklık ekle\".",
    ),
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [previewCacheBuster, setPreviewCacheBuster] = useState(() => Date.now());
  const [previewOverlayShown, setPreviewOverlayShown] = useState(false);
  const [previewOverlayActive, setPreviewOverlayActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blogRepairStartedRef = useRef(false);

  useEffect(() => {
    if (!project || project.status !== "ready" || blogRepairStartedRef.current) {
      return;
    }

    if (!/blog/i.test(project.siteType)) {
      return;
    }

    blogRepairStartedRef.current = true;

    void fetch(`/api/projects/${projectId}/repair`, { method: "POST" })
      .then(() => {
        window.setTimeout(() => setPreviewCacheBuster(Date.now()), 8000);
        window.setTimeout(() => setPreviewCacheBuster(Date.now()), 20000);
      })
      .catch(() => undefined);
  }, [project, projectId]);

  useEffect(() => {
    if (sending) {
      setPreviewOverlayShown(true);
      const enterTimer = window.setTimeout(() => setPreviewOverlayActive(true), 20);
      return () => clearTimeout(enterTimer);
    }

    setPreviewOverlayActive(false);
    const exitTimer = window.setTimeout(() => setPreviewOverlayShown(false), 500);
    return () => clearTimeout(exitTimer);
  }, [sending]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  useEffect(() => {
    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = (await response.json()) as ProjectResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Proje bilgisi alınamadı.");
        }

        setProject(data);
      } catch (error) {
        setProjectError(
          error instanceof Error ? error.message : "Proje yüklenemedi.",
        );
      } finally {
        setLoadingProject(false);
      }
    }

    void loadProject();
  }, [projectId]);

  function refreshPreview() {
    setPreviewCacheBuster(Date.now());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || sending) {
      return;
    }

    setSending(true);
    setChatError(null);
    setInput("");

    const userMessage = createMessage("user", trimmedInput);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: trimmedInput,
        }),
      });

      const data = (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Mesaj gönderilemedi.");
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.reply),
      ]);

      if (data.applied) {
        if (
          data.action?.actionType === "change_color" &&
          data.action.value.startsWith("#")
        ) {
          setProject((current) =>
            current
              ? { ...current, suggestedPrimaryColor: data.action!.value }
              : current,
          );
        }

        if (
          data.action?.actionType === "change_site_title" &&
          data.action.value.trim()
        ) {
          setProject((current) =>
            current
              ? { ...current, siteTitle: data.action!.value.trim() }
              : current,
          );
        }

        refreshPreview();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Mesaj gönderilemedi.";
      setChatError(message);
      setMessages((current) => [
        ...current,
        createMessage("assistant", `Bir hata oluştu: ${message}`),
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  if (loadingProject) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
          Proje yükleniyor...
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-zinc-900">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Proje bulunamadı
          </h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {projectError ?? "Bilinmeyen hata"}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  const previewUrl = `${project.siteUrl}?_preview=${previewCacheBuster}`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Builder
          </p>
          <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {project.siteTitle}
          </h1>
          <p className="truncate text-xs text-zinc-500">
            {project.siteType} · {previewUrl}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshPreview}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Önizlemeyi yenile
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Yeni site
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex w-[35%] min-w-[320px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Site düzenleme asistanı
            </h2>
            <p className="text-xs text-zinc-500">
              Tema, renk ve layout değişikliklerini buradan isteyin.
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {sending ? <TypingIndicator /> : null}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-zinc-100 p-4 dark:border-zinc-800"
          >
            {chatError ? (
              <p className="mb-2 text-xs text-red-600 dark:text-red-400">
                {chatError}
              </p>
            ) : null}

            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                disabled={sending}
                placeholder='Örn: "Başlık fontunu değiştir"'
                className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-blue-900"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex min-w-[5.5rem] items-center justify-center self-end rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {sending ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
                ) : (
                  "Gönder"
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="flex min-w-0 flex-1 flex-col bg-zinc-200 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-300 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <span>Canlı önizleme</span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: project.suggestedPrimaryColor }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.suggestedPrimaryColor }}
              />
              {project.suggestedPrimaryColor}
            </span>
          </div>

          <div className="relative flex-1 p-3">
            <iframe
              key={previewCacheBuster}
              title="WordPress önizleme"
              src={previewUrl}
              className={`h-full w-full rounded-xl border border-zinc-300 bg-white shadow-sm transition-[filter,transform] duration-500 ease-out dark:border-zinc-700 ${
                previewOverlayActive
                  ? "scale-[0.998] blur-[3px]"
                  : "scale-100 blur-0"
              }`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
            {previewOverlayShown ? (
              <div
                className={`pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl bg-white/25 transition-all duration-500 ease-out dark:bg-zinc-950/30 ${
                  previewOverlayActive
                    ? "opacity-100 backdrop-blur-[6px]"
                    : "opacity-0 backdrop-blur-none"
                }`}
                aria-hidden={!previewOverlayActive}
              >
                <div
                  className={`flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-all duration-500 ease-out dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 ${
                    previewOverlayActive
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0"
                  }`}
                >
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
                  Güncelleniyor
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
