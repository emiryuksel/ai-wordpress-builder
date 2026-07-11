"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import AuthModal, { type AuthContext } from "@/app/en/components/auth-modal";
import ProjectsList from "@/app/en/components/projects-list";
import SiteHeader from "@/app/en/components/site-header";
import LandingSections from "@/app/en/components/landing-sections";
import SiteFooter from "@/app/en/components/site-footer";

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
  "A construction company website",
  "A law firm website",
  "A modern website for a software company",
];

const TYPEWRITER_HINTS = [
  "I want a professional website for an architecture firm...",
  "A website for a fine dining restaurant in Milan",
  "An online store selling handmade jewelry",
  "A yoga studio site with online booking",
  "A personal blog and portfolio site",
  "A cafe site with a menu and contact page",
];

const PROVISION_TIMEOUT_MS = 2 * 60 * 1000;

const SOLVER_CMS_URL = "https://withsolver.com";

type BuilderEngine = "wordpress" | "solver";

/**
 * Typewriter effect that cycles through hints as if typed on a keyboard.
 * Stops and returns empty when `active` is false (user started typing).
 */
function useTypewriterHint(phrases: string[], active: boolean): string {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active) {
      setText("");
      return;
    }

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = phrases[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        setText(current.slice(0, charIndex));
        if (charIndex === current.length) {
          deleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 45 + Math.random() * 55);
      } else {
        charIndex -= 1;
        setText(current.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, 25);
      }
    };

    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [phrases, active]);

  return text;
}

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [engine, setEngine] = useState<BuilderEngine>("wordpress");
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
        throw new Error(data.error ?? "Could not start the setup.");
      }

      await refreshAuth();
      router.push(`/en/builder/${data.projectId}`);
    } catch (submitError) {
      setLoading(false);

      if (submitError instanceof Error && submitError.name === "AbortError") {
        setError(
          "The request timed out. Gemini or Docker did not respond — please try again.",
        );
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "An unexpected error occurred.",
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

    if (engine === "solver") {
      const target = `${SOLVER_CMS_URL}?prompt=${encodeURIComponent(trimmedPrompt)}`;
      window.location.href = target;
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
        `You've reached your site limit (${authContext.projectLimit}). You can create up to 2 sites on the free plan.`,
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
        `You've reached your site limit (${context.projectLimit}). You can create up to 2 sites on the free plan.`,
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

  const isSolver = engine === "solver";
  const submitLabel = isSolver
    ? "Get started"
    : loading
      ? "Opening builder..."
      : "Create site";

  const hintActive = mounted && !loading && prompt.length === 0;
  const typedHint = useTypewriterHint(TYPEWRITER_HINTS, hintActive);
  const placeholder = hintActive ? typedHint : "";

  return (
    <>
      <div className="app-canvas flex min-h-full flex-1 flex-col">
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

        <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10 sm:py-14">
          {/* Hero heading — full width */}
          <div className="mb-9 w-full max-w-4xl text-center">
            <h1 className="text-[clamp(2rem,5.2vw,4.25rem)] font-bold leading-[1.05] tracking-tight text-[#1d1d1f]">
              Build by Chatting, Publish{" "}
              <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
                and Market Digitally.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
              Our AI builds your website, gets it ready for search engines and
              powers your marketing.
            </p>
          </div>

          <main id="hero" className="w-full max-w-3xl">
            {/* Segmented control — macOS-style sliding pill */}
            <div className="mb-6 flex justify-center">
              <div
                className="glass relative inline-flex items-center gap-1 rounded-full p-1"
                role="tablist"
                aria-label="Site building engine"
              >
                <span
                  aria-hidden
                  className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_4px_14px_-4px_rgba(30,27,75,0.35)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{
                    left: isSolver ? "50%" : "0.25rem",
                    right: isSolver ? "0.25rem" : "50%",
                  }}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isSolver}
                  onClick={() => setEngine("wordpress")}
                  className={`relative z-10 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    !isSolver
                      ? "text-[#1d1d1f]"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      !isSolver ? "bg-[#6c5ce7]" : "bg-zinc-300"
                    }`}
                  />
                  WordPress
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSolver}
                  onClick={() => setEngine("solver")}
                  className={`relative z-10 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    isSolver
                      ? "text-[#1d1d1f]"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isSolver ? "bg-[#6c5ce7]" : "bg-zinc-300"
                    }`}
                  />
                  Solver CMS
                </button>
              </div>
            </div>

            {/* Chat card */}
            <div className="glass-strong mx-auto max-w-3xl overflow-hidden rounded-[32px]">
              <div className="p-7 sm:p-10">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="glass rounded-2xl p-1.5">
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder={hintActive ? `${placeholder}▏` : ""}
                      rows={5}
                      disabled={loading}
                      suppressHydrationWarning
                      className="w-full resize-none rounded-[14px] bg-transparent px-4 py-3 text-base text-[#1d1d1f] outline-none transition placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example}
                        type="button"
                        disabled={loading}
                        onClick={() => setPrompt(example)}
                        className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-zinc-600 backdrop-blur-sm transition hover:bg-white/80 hover:text-[#1d1d1f] disabled:opacity-50"
                      >
                        {example}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-zinc-500">
                      Trusted by more than 150 businesses
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6] disabled:cursor-not-allowed disabled:opacity-50"
                      suppressHydrationWarning
                    >
                      {submitLabel}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </form>

                {error ? (
                  <div className="mt-6 rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>

            {authContext ? (
              <section
                aria-hidden={isSolver}
                className={`transition-all duration-500 ease-out ${
                  isSolver
                    ? "pointer-events-none mt-0 max-h-0 -translate-y-2 overflow-hidden opacity-0"
                    : "mt-10 max-h-[2000px] translate-y-0 overflow-visible opacity-100"
                }`}
              >
                <ProjectsList
                  projects={projects}
                  loading={projectsLoading}
                  onProjectDeleted={() => void refreshAuth()}
                />
              </section>
            ) : null}
          </main>
        </div>

        <LandingSections />
        <SiteFooter />
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
