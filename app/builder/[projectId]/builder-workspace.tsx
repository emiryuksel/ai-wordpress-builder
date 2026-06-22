"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import WordPressAccessCard from "@/app/components/wordpress-access-card";
import type { WordPressAccessInfo } from "@/lib/support";

type ProjectResponse = {
  projectId: string;
  siteTitle: string;
  siteType: string;
  siteUrl: string;
  hostPort: number;
  status: string;
  suggestedPrimaryColor: string;
  suggestedTheme: string;
  suggestedPlugins?: string[];
  prompt?: string;
  isCorporate?: boolean;
  brandOnboardingComplete?: boolean;
  wordpressAccess?: {
    siteUrl: string;
    adminUrl: string;
    adminUser: string;
    adminPassword: string;
  } | null;
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind?: "text" | "wordpress-access";
  content?: string;
  wordpressAccess?: WordPressAccessInfo;
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

const BRAND_COLOR_OPTIONS = [
  { id: "navy", label: "Lacivert", hex: "#1e40af" },
  { id: "slate", label: "Koyu Gri", hex: "#1e293b" },
  { id: "emerald", label: "Zümrüt", hex: "#059669" },
  { id: "burgundy", label: "Bordo", hex: "#991b1b" },
  { id: "amber", label: "Kehribar", hex: "#d97706" },
  { id: "violet", label: "Mor", hex: "#7c3aed" },
] as const;

const HEADING_FONT_OPTIONS = [
  { id: "poppins", label: "Poppins", value: "Poppins" },
  { id: "montserrat", label: "Montserrat", value: "Montserrat" },
  { id: "playfair", label: "Playfair", value: "Playfair Display" },
  { id: "georgia", label: "Georgia", value: "Georgia" },
] as const;

const BODY_FONT_OPTIONS = [
  { id: "inter", label: "Inter", value: "Inter" },
  { id: "open-sans", label: "Open Sans", value: "Open Sans" },
  { id: "roboto", label: "Roboto", value: "Roboto" },
  { id: "lato", label: "Lato", value: "Lato" },
] as const;

function findColorPresetId(hex: string): (typeof BRAND_COLOR_OPTIONS)[number]["id"] {
  const normalized = hex.trim().toLowerCase();
  const match = BRAND_COLOR_OPTIONS.find(
    (option) => option.hex.toLowerCase() === normalized,
  );
  return match?.id ?? BRAND_COLOR_OPTIONS[0].id;
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    kind: "text",
    content,
  };
}

function createWordPressAccessMessage(access: WordPressAccessInfo): ChatMessage {
  return {
    id: `assistant-wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    kind: "wordpress-access",
    wordpressAccess: access,
  };
}

function brandPanelSessionKey(projectId: string): string {
  return `brand-panel-seen-${projectId}`;
}

function readyBriefingSessionKey(projectId: string): string {
  return `ready-briefing-${projectId}`;
}

function shouldOpenBrandPanel(project: ProjectResponse): boolean {
  if (project.brandOnboardingComplete) {
    return false;
  }
  if (project.status === "ready") {
    return false;
  }
  if (typeof window !== "undefined") {
    if (sessionStorage.getItem(brandPanelSessionKey(project.projectId))) {
      return false;
    }
  }
  return true;
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [previewCacheBuster, setPreviewCacheBuster] = useState(() => Date.now());
  const [previewOverlayShown, setPreviewOverlayShown] = useState(false);
  const [previewOverlayActive, setPreviewOverlayActive] = useState(false);
  const [previewReachable, setPreviewReachable] = useState(false);
  const [provisionMessage, setProvisionMessage] = useState("Site kuruluyor...");
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandColorId, setBrandColorId] =
    useState<(typeof BRAND_COLOR_OPTIONS)[number]["id"]>("navy");
  const [brandHeadingFontId, setBrandHeadingFontId] =
    useState<(typeof HEADING_FONT_OPTIONS)[number]["id"]>("poppins");
  const [brandBodyFontId, setBrandBodyFontId] =
    useState<(typeof BODY_FONT_OPTIONS)[number]["id"]>("inter");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const siteRepairStartedRef = useRef(false);
  const brandOnboardingShownRef = useRef(false);
  const readyBriefingSentRef = useRef(false);
  const provisionPollStartedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!project || brandOnboardingShownRef.current) {
      return;
    }

    brandOnboardingShownRef.current = true;
    setBrandName(project.siteTitle);
    setBrandColorId(findColorPresetId(project.suggestedPrimaryColor || "#1e40af"));

    const openBrandPanel = shouldOpenBrandPanel(project);
    if (openBrandPanel) {
      sessionStorage.setItem(brandPanelSessionKey(project.projectId), "1");
      setBrandPanelOpen(true);
      setMessages([
        createMessage(
          "assistant",
          project.status === "ready"
            ? "Siteniz hazır. Aşağıdan marka adınızı, renk ve font tercihlerinizi seçin — site anında güncellenir. Sonrasında buradan serbestçe düzenleme isteyebilirsiniz."
            : "Siteniz arka planda kuruluyor. Bu sırada marka kimliğinizi tanımlayın — kurulum bitince tercihleriniz otomatik uygulanır.",
        ),
      ]);
      return;
    }

    setMessages([
      createMessage(
        "assistant",
        project.status === "ready"
          ? "Siteniz hazır. Tema, renk, font veya içerik değişikliklerini buradan yazabilirsiniz."
          : "Siteniz arka planda kuruluyor. Kurulum tamamlanınca buradan düzenleme isteyebilirsiniz.",
      ),
    ]);
  }, [project]);

  const appendReadyBriefing = useCallback(
    (data: ProjectResponse) => {
      if (!data.wordpressAccess || readyBriefingSentRef.current) {
        return;
      }

      if (sessionStorage.getItem(readyBriefingSessionKey(projectId))) {
        readyBriefingSentRef.current = true;
        return;
      }

      readyBriefingSentRef.current = true;
      sessionStorage.setItem(readyBriefingSessionKey(projectId), "1");
      const access = data.wordpressAccess;
      if (!access) {
        return;
      }

      setMessages((current) => [...current, createWordPressAccessMessage(access)]);
    },
    [projectId],
  );

  useEffect(() => {
    if (!project || project.status !== "ready") {
      return;
    }

    if (project.wordpressAccess) {
      appendReadyBriefing(project);
      return;
    }

    void fetch(`/api/projects/${projectId}`)
      .then(async (response) => {
        const data = (await response.json()) as ProjectResponse;
        if (!response.ok) {
          return;
        }
        setProject(data);
        appendReadyBriefing(data);
      })
      .catch(() => undefined);
  }, [appendReadyBriefing, project, projectId]);

  useEffect(() => {
    if (!project || project.status === "ready" || project.status === "error") {
      if (project?.status === "ready") {
        setPreviewReachable(true);
      }
      return;
    }

    let cancelled = false;
    provisionPollStartedAtRef.current = Date.now();

    async function pollProvisioningStatus() {
      const elapsedSeconds = Math.floor(
        (Date.now() - provisionPollStartedAtRef.current) / 1000,
      );

      try {
        const response = await fetch(
          `/api/provision/status?projectId=${encodeURIComponent(projectId)}&elapsed=${elapsedSeconds}`,
        );
        const data = (await response.json()) as {
          status: string;
          ready: boolean;
          reachable: boolean;
          message: string;
          error: string | null;
        };

        if (cancelled || !response.ok) {
          return;
        }

        setProvisionMessage(data.message);
        setPreviewReachable(data.reachable);

        if (data.status === "error") {
          setProjectError(data.error ?? "Kurulum başarısız oldu.");
          return;
        }

        setProject((current) =>
          current ? { ...current, status: data.status } : current,
        );

        if (data.ready) {
          const projectResponse = await fetch(`/api/projects/${projectId}`);
          const projectData = (await projectResponse.json()) as ProjectResponse;
          if (!cancelled && projectResponse.ok) {
            setProject(projectData);
            setPreviewReachable(true);
            setPreviewCacheBuster(Date.now());
            appendReadyBriefing(projectData);
          }
        }
      } catch {
        // Sonraki turda tekrar dene.
      }
    }

    void pollProvisioningStatus();
    const timer = window.setInterval(() => {
      void pollProvisioningStatus();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [appendReadyBriefing, project, projectId]);

  useEffect(() => {
    if (!project || project.status !== "ready" || siteRepairStartedRef.current) {
      return;
    }

    siteRepairStartedRef.current = true;

    void fetch(`/api/projects/${projectId}/repair`, { method: "POST" })
      .then(() => {
        window.setTimeout(() => setPreviewCacheBuster(Date.now()), 8000);
        window.setTimeout(() => setPreviewCacheBuster(Date.now()), 20000);
      })
      .catch(() => undefined);
  }, [project, projectId]);

  useEffect(() => {
    const isUpdating = sending || brandSaving;

    if (isUpdating) {
      setPreviewOverlayShown(true);
      const enterTimer = window.setTimeout(() => setPreviewOverlayActive(true), 20);
      return () => clearTimeout(enterTimer);
    }

    setPreviewOverlayActive(false);
    const exitTimer = window.setTimeout(() => setPreviewOverlayShown(false), 500);
    return () => clearTimeout(exitTimer);
  }, [sending, brandSaving]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, brandPanelOpen, scrollToBottom]);

  useEffect(() => {
    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = (await response.json()) as ProjectResponse;

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Bu projeyi görüntülemek için giriş yapmalısınız.");
          }
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

  async function handleBrandSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (brandSaving) return;

    const colorOption =
      BRAND_COLOR_OPTIONS.find((option) => option.id === brandColorId) ??
      BRAND_COLOR_OPTIONS[0];
    const headingFont =
      HEADING_FONT_OPTIONS.find((option) => option.id === brandHeadingFontId) ??
      HEADING_FONT_OPTIONS[0];
    const bodyFont =
      BODY_FONT_OPTIONS.find((option) => option.id === brandBodyFontId) ??
      BODY_FONT_OPTIONS[0];

    setBrandSaving(true);
    setBrandError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          primaryColor: colorOption.hex,
          headingFont: headingFont.value,
          bodyFont: bodyFont.value,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        queued?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Marka ayarları uygulanamadı.");
      }

      setProject((current) =>
        current
          ? {
              ...current,
              siteTitle: brandName.trim() || current.siteTitle,
              suggestedPrimaryColor: colorOption.hex,
              brandOnboardingComplete: true,
            }
          : current,
      );

      setMessages((current) => [
        ...current,
        createMessage(
          "user",
          `Marka: ${brandName.trim()}, ${colorOption.label}, başlık ${headingFont.label}, gövde ${bodyFont.label}`,
        ),
        createMessage(
          "assistant",
          data.reply ??
            (data.queued
              ? "Marka tercihleriniz kaydedildi. Site hazır olunca otomatik uygulanacak."
              : "Marka ayarları uygulandı. Artık renk, font veya içerik değişikliklerini yazabilirsiniz."),
        ),
      ]);
      setBrandPanelOpen(false);
      if (!data.queued) {
        refreshPreview();
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    } catch (error) {
      setBrandError(
        error instanceof Error ? error.message : "Marka ayarları uygulanamadı.",
      );
    } finally {
      setBrandSaving(false);
    }
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
  const isSiteReady = project.status === "ready";
  const showLivePreview = isSiteReady && previewReachable;
  const previewColorLabel =
    BRAND_COLOR_OPTIONS.find(
      (option) =>
        option.hex.toLowerCase() === project.suggestedPrimaryColor.toLowerCase(),
    )?.label ?? project.suggestedPrimaryColor;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            AI WordPress Builder
          </h1>
          <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
            {project.siteTitle}
          </p>
          <p className="truncate text-xs text-zinc-500">{previewUrl}</p>
        </div>

        <div className="flex items-center gap-2">
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
                {message.kind === "wordpress-access" && message.wordpressAccess ? (
                  <WordPressAccessCard access={message.wordpressAccess} />
                ) : (
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    {message.content}
                  </div>
                )}
              </div>
            ))}
            {sending ? <TypingIndicator /> : null}

            {brandPanelOpen ? (
              <div className="flex justify-start">
                <form
                  onSubmit={handleBrandSubmit}
                  className="w-full max-w-[95%] rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30"
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Markanızı tanımlayın
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {isSiteReady
                      ? "Seçimleriniz canlı önizlemeye yansır."
                      : "Site kurulurken tercihleriniz kaydedilir ve hazır olunca uygulanır."}
                  </p>

                  <label className="mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Marka adı
                    <input
                      value={brandName}
                      onChange={(event) => setBrandName(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      placeholder="Örn: Yüksel İnşaat"
                      required
                    />
                  </label>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Marka rengi
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BRAND_COLOR_OPTIONS.map((option) => {
                        const selected = brandColorId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setBrandColorId(option.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            <span
                              className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: option.hex }}
                              aria-hidden
                            />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Başlık fontu
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {HEADING_FONT_OPTIONS.map((option) => {
                        const selected = brandHeadingFontId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setBrandHeadingFontId(option.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                            style={{ fontFamily: option.value }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Gövde fontu
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BODY_FONT_OPTIONS.map((option) => {
                        const selected = brandBodyFontId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setBrandBodyFontId(option.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                            style={{ fontFamily: option.value }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  {brandError ? (
                    <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                      {brandError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={brandSaving || !brandName.trim()}
                    className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    {brandSaving ? "Uygulanıyor…" : "Markayı uygula"}
                  </button>
                </form>
              </div>
            ) : null}

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
                disabled={sending || brandPanelOpen || !isSiteReady}
                placeholder={
                  brandPanelOpen
                    ? "Önce marka ayarlarını tamamlayın"
                    : !isSiteReady
                      ? "Site kurulurken bekleyin..."
                      : 'Örn: "Başlık fontunu değiştir"'
                }
                className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-blue-900"
              />
              <button
                type="submit"
                disabled={sending || brandPanelOpen || !isSiteReady || !input.trim()}
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
          <div className="flex items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <span>Canlı önizleme</span>
            <div className="flex items-center gap-2">
              <span
                className="hidden items-center gap-1.5 sm:inline-flex"
                style={{ color: project.suggestedPrimaryColor }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: project.suggestedPrimaryColor }}
                />
                {previewColorLabel}
              </span>
              {isSiteReady ? (
                <a
                  href={project.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Siteyi görüntüle
                </a>
              ) : null}
              <button
                type="button"
                onClick={refreshPreview}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Önizlemeyi yenile
              </button>
            </div>
          </div>

          <div className="relative flex-1 p-3">
            {showLivePreview ? (
              <iframe
                key={previewCacheBuster}
                title="WordPress önizleme"
                src={previewUrl}
                className={`h-full w-full rounded-xl border border-zinc-300 bg-white shadow-sm transition-[filter,transform] duration-500 ease-out dark:border-zinc-700 ${
                  previewOverlayActive || brandSaving
                    ? "scale-[0.998] blur-[3px]"
                    : "scale-100 blur-0"
                }`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200" />
                <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {provisionMessage}
                </p>
                <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                  Kurulum arka planda devam ediyor. Bu süreyi soldaki marka
                  kimliği kartını doldurarak değerlendirebilirsiniz.
                </p>
              </div>
            )}
            {previewOverlayShown ? (
              <div
                className={`pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl bg-white/25 transition-all duration-500 ease-out dark:bg-zinc-950/30 ${
                  previewOverlayActive || brandSaving
                    ? "opacity-100 backdrop-blur-[6px]"
                    : "opacity-0 backdrop-blur-none"
                }`}
                aria-hidden={!previewOverlayActive}
              >
                <div
                  className={`flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-all duration-500 ease-out dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 ${
                    previewOverlayActive || brandSaving
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
