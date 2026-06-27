"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import AuthModal, { type AuthContext } from "@/app/components/auth-modal";
import ProjectsList from "@/app/components/projects-list";
import SiteHeader from "@/app/components/site-header";

type ProvisionResponse = {
  projectId: string;
  error?: string;
  authRequired?: boolean;
  limitReached?: boolean;
};

type MeResponse = {
  authenticated: boolean;
  user?: AuthContext["user"];
  projectCount?: number;
  projectLimit?: number;
  unlimited?: boolean;
  canCreateProject?: boolean;
  premiumAvailable?: boolean;
};

type ProjectsResponse = {
  projects: Array<{
    projectId: string;
    siteTitle: string;
    siteType: string;
    status: string;
    statusLabel: string;
    updatedAt: string;
  }>;
};

const EXAMPLE_PROMPTS = [
  "Bir inşaat firması web sitesi",
  "Hukuk bürosu web sitesi",
  "Yazılım şirketi için modern web sitesi",
];

const PROVISION_TIMEOUT_MS = 2 * 60 * 1000;

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [projects, setProjects] = useState<ProjectsResponse["projects"]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"register" | "login">(
    "register",
  );
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        setProjects([]);
        return;
      }
      const data = (await response.json()) as ProjectsResponse;
      setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = (await response.json()) as MeResponse;
      if (!data.authenticated || !data.user) {
        setAuthContext(null);
        setProjects([]);
        return;
      }

      setAuthContext({
        user: data.user,
        projectCount: data.projectCount ?? 0,
        projectLimit: data.projectLimit ?? 2,
        unlimited: data.unlimited ?? false,
        canCreateProject: data.canCreateProject ?? true,
      });
      await refreshProjects();
    } catch {
      setAuthContext(null);
    }
  }, [refreshProjects]);

  useEffect(() => {
    setMounted(true);
    void refreshAuth();
  }, [refreshAuth]);

  const isSubmitDisabled =
    !mounted || loading || prompt.trim().length === 0;

  async function startProvision(trimmedPrompt: string) {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), PROVISION_TIMEOUT_MS);

    try {
      const response = await fetch("/api/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
        signal: controller.signal,
      });

      const data = (await response.json()) as ProvisionResponse;

      if (response.status === 401 && data.authRequired) {
        setPendingPrompt(trimmedPrompt);
        setAuthModalMode("register");
        setAuthModalOpen(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Kurulum başlatılamadı.");
      }

      await refreshAuth();
      router.push(`/builder/${data.projectId}`);
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
      window.clearTimeout(timeout);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) {
      return;
    }

    if (!authContext) {
      setPendingPrompt(trimmedPrompt);
      setAuthModalMode("register");
      setAuthModalOpen(true);
      return;
    }

    if (!authContext.canCreateProject) {
      setError(
        `Site limitine ulaştınız (${authContext.projectLimit}). Ücretsiz planda en fazla 2 site oluşturabilirsiniz.`,
      );
      return;
    }

    await startProvision(trimmedPrompt);
  }

  async function handleAuthSuccess(context: AuthContext) {
    setAuthContext(context);
    setAuthModalOpen(false);
    await refreshProjects();

    const nextPrompt = pendingPrompt ?? prompt.trim();
    setPendingPrompt(null);

    if (!nextPrompt) {
      return;
    }

    if (!context.canCreateProject) {
      setError(
        `Site limitine ulaştınız (${context.projectLimit}). Ücretsiz planda en fazla 2 site oluşturabilirsiniz.`,
      );
      return;
    }

    await startProvision(nextPrompt);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthContext(null);
    setProjects([]);
    setError(null);
  }

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
        <SiteHeader
          authContext={authContext}
          onLoginClick={() => {
            setAuthModalMode("login");
            setAuthModalOpen(true);
          }}
          onRegisterClick={() => {
            setAuthModalMode("register");
            setAuthModalOpen(true);
          }}
          onLogout={() => void handleLogout()}
        />

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
          <main className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-6 space-y-3">
              <h1
                className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                suppressHydrationWarning
              >
                Ne tür bir site istersiniz?
              </h1>
              <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Sitenizi doğal dille tarif edin. Sistem WordPress kurar, içerik
                ve görselleri hazırlar; siz bu sırada marka kimliğinizi
                tanımlarsınız.
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
                placeholder="Örn: Bir mimarlık firması için profesyonel web sitesi istiyorum..."
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
              {loading ? "Builder açılıyor..." : "Siteyi Oluştur"}
            </button>
          </form>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {authContext ? (
            <ProjectsList
              projects={projects}
              loading={projectsLoading}
              onProjectDeleted={() => void refreshAuth()}
            />
          ) : null}
          </main>
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        pendingPrompt={pendingPrompt ?? undefined}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingPrompt(null);
        }}
        onSuccess={(context) => void handleAuthSuccess(context)}
      />
    </>
  );
}
