"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AuthMode = "register" | "login";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  plan: "free" | "premium";
  role: "admin" | "user";
};

export type AuthContext = {
  user: AuthUser;
  projectCount: number;
  projectLimit: number;
  unlimited?: boolean;
  canCreateProject: boolean;
};

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthMode;
  pendingPrompt?: string;
  onClose: () => void;
  onSuccess: (context: AuthContext) => void;
}

export default function AuthModal({
  open,
  initialMode = "register",
  pendingPrompt,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  if (!open || !mounted) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mode === "register" ? name : undefined,
          email,
          password,
        }),
      });

      const data = (await response.json()) as AuthContext & {
        error?: string;
        user?: AuthUser;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      onSuccess({
        user: data.user,
        projectCount: data.projectCount ?? 0,
        projectLimit: data.projectLimit ?? 2,
        unlimited: data.unlimited ?? false,
        canCreateProject: data.canCreateProject ?? true,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1b4b]/30 px-4 backdrop-blur-md">
      <div
        className="glass-strong w-full max-w-md overflow-hidden rounded-[28px] p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-modal-title"
              className="text-xl font-semibold tracking-tight text-[#1d1d1f]"
            >
              {isRegister ? "Create your account" : "Sign in"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              {pendingPrompt
                ? "Complete your account to continue building your site."
                : "Sign in to save and manage your projects."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/50 text-zinc-500 transition hover:bg-white/80 hover:text-zinc-800"
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

        <div
          className="glass relative mt-5 flex items-center gap-1 rounded-full p-1"
          role="tablist"
          aria-label="Authentication mode"
        >
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_4px_14px_-4px_rgba(30,27,75,0.35)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={
              isRegister
                ? { left: "0.25rem", right: "50%" }
                : { left: "50%", right: "0.25rem" }
            }
          />
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isRegister ? "text-[#1d1d1f]" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !isRegister ? "text-[#1d1d1f]" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isRegister ? (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-zinc-700">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/12"
                placeholder="Your Name"
              />
            </label>
          ) : null}

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/12"
              placeholder="you@company.com"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.05)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/12"
              placeholder="At least 8 characters"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Processing..."
              : isRegister
                ? "Create account and continue"
                : "Sign in and continue"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-500">
          You can create up to 2 sites on the free plan.
        </p>
      </div>
    </div>,
    document.body,
  );
}
