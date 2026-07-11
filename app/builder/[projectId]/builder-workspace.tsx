"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import WordPressAccessCard from "@/app/components/wordpress-access-card";
import { buildSitePreviewPath } from "@/lib/preview-paths";
import type { WordPressAccessInfo } from "@/lib/support";

type ProjectResponse = {
  projectId: string;
  slug?: string;
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
  { id: "white", label: "Beyaz", hex: "#ffffff" },
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

function withWordPressAccessCard(
  messages: ChatMessage[],
  project: ProjectResponse,
  briefingSentRef: { current: boolean },
): ChatMessage[] {
  if (
    project.status !== "ready" ||
    !project.wordpressAccess ||
    briefingSentRef.current
  ) {
    return messages;
  }

  briefingSentRef.current = true;
  return [...messages, createWordPressAccessMessage(project.wordpressAccess)];
}

function brandPanelSessionKey(projectId: string): string {
  return `brand-panel-seen-${projectId}`;
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
        className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3"
        role="status"
        aria-live="polite"
        aria-label="İstek işleniyor"
      >
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6c5ce7] [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8577f2] [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a394ff] [animation-delay:300ms]" />
        </span>
        <span className="text-xs text-zinc-500">İşleniyor…</span>
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
  const [previewAccessToken, setPreviewAccessToken] = useState<string | null>(
    null,
  );
  const [previewOverlayShown, setPreviewOverlayShown] = useState(false);
  const [previewOverlayActive, setPreviewOverlayActive] = useState(false);
  const [previewReachable, setPreviewReachable] = useState(false);
  const [provisionMessage, setProvisionMessage] = useState("Siteniz hazırlanıyor...");
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandColorId, setBrandColorId] =
    useState<(typeof BRAND_COLOR_OPTIONS)[number]["id"]>("white");
  const [brandHeadingFontId, setBrandHeadingFontId] =
    useState<(typeof HEADING_FONT_OPTIONS)[number]["id"]>("poppins");
  const [brandBodyFontId, setBrandBodyFontId] =
    useState<(typeof BODY_FONT_OPTIONS)[number]["id"]>("inter");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
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
    // Marka kartında varsayılan olarak Beyaz seçili gelir (ilk sıradaki seçenek).
    // AI'nın önerdiği renge otomatik geçmiyoruz; kullanıcı isterse seçer.
    setBrandColorId("white");

    const openBrandPanel = shouldOpenBrandPanel(project);
    if (openBrandPanel) {
      sessionStorage.setItem(brandPanelSessionKey(project.projectId), "1");
      setBrandPanelOpen(true);
      setMessages(
        withWordPressAccessCard(
          [
            createMessage(
              "assistant",
              project.status === "ready"
                ? "Siteniz hazır. Aşağıdan marka adınızı, renk ve font tercihlerinizi seçin — site anında güncellenir. Sonrasında buradan serbestçe düzenleme isteyebilirsiniz."
                : "Siteniz arka planda kuruluyor. Bu sırada marka kimliğinizi tanımlayın — kurulum bitince tercihleriniz otomatik uygulanır.",
            ),
          ],
          project,
          readyBriefingSentRef,
        ),
      );
      return;
    }

    setMessages(
      withWordPressAccessCard(
        [
          createMessage(
            "assistant",
            project.status === "ready"
              ? "Siteniz hazır. Tema, renk, font veya içerik değişikliklerini buradan yazabilirsiniz."
              : "Siteniz arka planda kuruluyor. Kurulum tamamlanınca buradan düzenleme isteyebilirsiniz.",
          ),
        ],
        project,
        readyBriefingSentRef,
      ),
    );
  }, [project]);

  const appendReadyBriefing = useCallback((data: ProjectResponse) => {
    if (!data.wordpressAccess || readyBriefingSentRef.current) {
      return;
    }

    readyBriefingSentRef.current = true;
    setMessages((current) => [
      ...current,
      createWordPressAccessMessage(data.wordpressAccess!),
    ]);
  }, []);

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
    if (!project || project.status !== "ready") {
      setPreviewAccessToken(null);
      return;
    }

    let cancelled = false;

    void fetch(`/api/projects/${projectId}/preview-token`)
      .then((response) => response.json())
      .then((data: { token?: string }) => {
        if (!cancelled) {
          setPreviewAccessToken(data.token ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewAccessToken(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project, projectId]);

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

    void fetch(`/api/projects/${projectId}/repair`, { method: "POST" }).catch(
      () => undefined,
    );
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

  const reloadPreviewIframe = useCallback(() => {
    const iframe = previewIframeRef.current;
    if (!iframe?.contentWindow) {
      setPreviewCacheBuster(Date.now());
      return;
    }

    try {
      iframe.contentWindow.location.reload();
    } catch {
      setPreviewCacheBuster(Date.now());
    }
  }, []);

  const previewUrl = useMemo(() => {
    if (!previewAccessToken) {
      return null;
    }
    return buildSitePreviewPath(
      projectId,
      previewCacheBuster,
      previewAccessToken,
    );
  }, [projectId, previewCacheBuster, previewAccessToken]);

  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe || !previewUrl) {
      return;
    }

    try {
      const nextSrc = new URL(previewUrl, window.location.origin).href;
      if (iframe.src !== nextSrc) {
        iframe.src = previewUrl;
      }
    } catch {
      iframe.src = previewUrl;
    }
  }, [previewUrl]);

  function refreshPreview() {
    reloadPreviewIframe();
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
        slug?: string;
        siteUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Marka ayarları uygulanamadı.");
      }

      const nextSiteUrl = data.siteUrl ?? project?.siteUrl ?? "";

      setProject((current) =>
        current
          ? {
              ...current,
              slug: data.slug ?? current.slug,
              siteUrl: data.siteUrl ?? current.siteUrl,
              siteTitle: brandName.trim() || current.siteTitle,
              suggestedPrimaryColor: colorOption.hex,
              brandOnboardingComplete: true,
              wordpressAccess: current.wordpressAccess
                ? {
                    ...current.wordpressAccess,
                    siteUrl: nextSiteUrl.replace(/\/$/, ""),
                    adminUrl: `${nextSiteUrl.replace(/\/$/, "")}/wp-admin`,
                  }
                : current.wordpressAccess,
            }
          : current,
      );

      // Marka adı slug'ı değiştirdiyse, halihazırda gösterilen "Siteniz hazır"
      // kartındaki eski URL'i yeni adresle güncelle.
      if (data.slug && nextSiteUrl) {
        const normalizedSiteUrl = nextSiteUrl.replace(/\/$/, "");
        setMessages((current) =>
          current.map((message) =>
            message.kind === "wordpress-access" && message.wordpressAccess
              ? {
                  ...message,
                  wordpressAccess: {
                    ...message.wordpressAccess,
                    siteUrl: normalizedSiteUrl,
                    adminUrl: `${normalizedSiteUrl}/wp-admin`,
                  },
                }
              : message,
          ),
        );
      }

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
      if (data.slug) {
        setPreviewCacheBuster(Date.now());
      } else if (!data.queued) {
        reloadPreviewIframe();
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

        reloadPreviewIframe();
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
      <div className="app-canvas flex min-h-screen flex-1 items-center justify-center">
        <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-zinc-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7]" />
          Proje yükleniyor...
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="app-canvas flex min-h-screen flex-1 items-center justify-center px-4">
        <div className="glass-strong max-w-md rounded-[28px] p-8 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
            Proje bulunamadı
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {projectError ?? "Bilinmeyen hata"}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-5 text-sm font-medium text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  const isSiteReady = project.status === "ready";
  const showLivePreview =
    isSiteReady && previewReachable && previewUrl !== null;

  return (
    <div className="app-canvas flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/30 bg-white/25 px-4 py-3 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0">
            <Image
              src="/logo-light.png"
              alt="Solver"
              width={112}
              height={40}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <div className="hidden h-7 w-px bg-black/10 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#1d1d1f]">
              {project.siteTitle}
            </p>
            <p className="truncate text-xs text-zinc-500">{project.siteUrl}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/60 bg-white/50 px-3.5 py-1.5 text-sm text-zinc-700 transition hover:bg-white/80"
          >
            Yeni site
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex w-[35%] min-w-[320px] flex-col border-r border-white/40 bg-white/35 backdrop-blur-xl">
          <div className="border-b border-white/50 px-4 py-3">
            <h2 className="text-sm font-medium text-[#1d1d1f]">
              Site düzenleme asistanı
            </h2>
            <p className="text-xs text-zinc-500">
              Tema, hero, hizmet ve iletişim değişikliklerini buradan isteyin.
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
                        ? "bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white shadow-[0_8px_20px_-8px_rgba(88,71,224,0.6)]"
                        : "glass text-zinc-800"
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
                  className="glass w-full max-w-[95%] rounded-[24px] p-4"
                >
                  <p className="text-sm font-medium text-[#1d1d1f]">
                    Markanızı tanımlayın
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {isSiteReady
                      ? "Seçimleriniz canlı önizlemeye yansır."
                      : "Site kurulurken tercihleriniz kaydedilir ve hazır olunca uygulanır."}
                  </p>

                  <label className="mt-4 block text-xs font-medium text-zinc-600">
                    <span className="flex items-center justify-between">
                      Marka adı
                      <span className="font-normal text-zinc-400">
                        düzenleyebilirsiniz
                      </span>
                    </span>
                    <div className="relative mt-1.5">
                      <input
                        value={brandName}
                        onChange={(event) => setBrandName(event.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 pr-10 text-sm text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.06)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/12"
                        placeholder="Örn: Yüksel İnşaat"
                        required
                      />
                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M13.5 3.5a1.4 1.4 0 0 1 2 2L7 14l-3 1 1-3 8.5-8.5Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </label>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-medium text-zinc-600">
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
                                ? "border-transparent bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)]"
                                : "border-zinc-300 bg-white text-zinc-700 shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] hover:border-zinc-400 hover:bg-zinc-50"
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
                    <legend className="text-xs font-medium text-zinc-600">
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
                                ? "border-transparent bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)]"
                                : "border-zinc-300 bg-white text-zinc-700 shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] hover:border-zinc-400 hover:bg-zinc-50"
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
                    <legend className="text-xs font-medium text-zinc-600">
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
                                ? "border-transparent bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)]"
                                : "border-zinc-300 bg-white text-zinc-700 shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] hover:border-zinc-400 hover:bg-zinc-50"
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
                    <p className="mt-3 text-xs text-red-600">{brandError}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={brandSaving || !brandName.trim()}
                    className="mt-4 w-full rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6] disabled:cursor-not-allowed disabled:opacity-60"
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
            className="border-t border-white/50 p-4"
          >
            {chatError ? (
              <p className="mb-2 text-xs text-red-600">{chatError}</p>
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
                      : 'Örn: "Hero başlığını değiştir" veya "Danışmanlık hizmeti ekle"'
                }
                className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/12 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || brandPanelOpen || !isSiteReady || !input.trim()}
                className="inline-flex min-w-[5.5rem] items-center justify-center self-end rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  "Gönder"
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/40 bg-white/25 px-4 py-2 text-xs text-zinc-600 backdrop-blur-xl">
            <span>Canlı önizleme</span>
            <div className="flex items-center gap-2">
              {isSiteReady ? (
                <a
                  href={project.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-white/90"
                >
                  Siteyi görüntüle
                </a>
              ) : null}
              <button
                type="button"
                onClick={refreshPreview}
                className="rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-white/90"
              >
                Önizlemeyi yenile
              </button>
            </div>
          </div>

          <div className="relative flex-1 p-4">
            {showLivePreview && previewUrl ? (
              <iframe
                ref={previewIframeRef}
                title="WordPress önizleme"
                src={previewUrl}
                className={`mx-auto block h-full w-full max-w-[1280px] rounded-2xl border border-white/60 bg-white shadow-[0_20px_60px_-20px_rgba(30,27,75,0.28)] transition-opacity duration-300 ease-out ${
                  previewOverlayActive || brandSaving
                    ? "opacity-75"
                    : "opacity-100"
                }`}
              />
            ) : (
              <div className="glass flex h-full w-full flex-col items-center justify-center rounded-2xl px-6 text-center">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7]" />
                <p className="mt-4 text-sm font-medium text-[#1d1d1f]">
                  {provisionMessage}
                </p>
                <p className="mt-2 max-w-sm text-xs text-zinc-500">
                  Siteniz hazırlanıyor. Bu süreyi soldaki marka kimliği kartını
                  doldurarak değerlendirebilirsiniz.
                </p>
              </div>
            )}
            {previewOverlayShown ? (
              <div
                className={`pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl bg-white/25 transition-all duration-500 ease-out ${
                  previewOverlayActive || brandSaving
                    ? "opacity-100 backdrop-blur-[6px]"
                    : "opacity-0 backdrop-blur-none"
                }`}
                aria-hidden={!previewOverlayActive}
              >
                <div
                  className={`glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all duration-500 ease-out ${
                    previewOverlayActive || brandSaving
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0"
                  }`}
                >
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7]" />
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
