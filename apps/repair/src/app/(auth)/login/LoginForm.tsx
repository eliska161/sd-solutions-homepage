"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm overflow-hidden rounded border border-border bg-white shadow">
        <div className="bg-[#1b1e24] px-5 py-3 text-white">
          <p className="text-[11px] uppercase tracking-wide text-white/60">
            SD Solutions
          </p>
          <h1 className="mt-1 text-lg font-semibold">Logg inn</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          <label className="block text-sm">
            <span className="text-muted">E-post</span>
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Passord</span>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </label>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Logger inn…" : "Logg inn"}
          </Button>
        </form>
      </div>
    </div>
  );
}
