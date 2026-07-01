"use client";

import { FormEvent, useEffect, useState } from "react";

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

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  if (!open) {
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
        throw new Error(data.error ?? "İşlem tamamlanamadı.");
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
          : "İşlem tamamlanamadı.",
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
        aria-labelledby="auth-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {mode === "register" ? "Hesap oluşturun" : "Giriş yapın"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {pendingPrompt
                ? "Site oluşturmaya devam etmek için hesabınızı tamamlayın."
                : "Projelerinizi kaydetmek ve yönetmek için giriş yapın."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Kapat
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              mode === "register"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            Kayıt ol
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            Giriş yap
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "register" ? (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Ad soyad
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                placeholder="Adınız Soyadınız"
              />
            </label>
          ) : null}

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              E-posta
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="ornek@firma.com"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Şifre
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="En az 8 karakter"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading
              ? "İşleniyor..."
              : mode === "register"
                ? "Hesap oluştur ve devam et"
                : "Giriş yap ve devam et"}
          </button>
        </form>

        <p className="mt-4 text-xs text-zinc-500">
          Ücretsiz planda en fazla 2 site oluşturabilirsiniz.
        </p>
      </div>
    </div>
  );
}
