"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("admin@sd-solutions.org");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) {
        setError(result.error.message || "Innlogging feilet");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Kunne ikke logge inn. Prøv igjen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-6 py-8">
        <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">
          SD Solutions Repair
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-foreground">
          Logg inn
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Intern tilgang for verkstedet. Bruk e-post og passord.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">E-post</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-white/30"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Passord</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-white/30"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-60"
          >
            {pending ? "Logger inn…" : "Logg inn"}
          </button>
        </form>
      </div>
    </div>
  );
}
