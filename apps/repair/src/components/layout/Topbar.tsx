"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function Topbar({
  userName,
  userEmail,
  userRole,
}: {
  userName: string;
  userEmail: string;
  userRole: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex h-12 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
      <Link
        href="/dashboard"
        className="shrink-0 text-[13px] font-semibold tracking-tight text-foreground"
      >
        SD Solutions
      </Link>
      <form onSubmit={onSearch} className="min-w-0 flex-1 max-w-md">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk kunder, tickets, enheter…"
          aria-label="Globalt søk"
          className="h-9"
        />
      </form>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/profile"
          className="hidden text-right sm:block hover:opacity-90"
        >
          <p className="text-[12px] text-foreground">{userEmail}</p>
          <p className="text-[11px] text-muted">
            {userName} · {userRole}
          </p>
        </Link>
        <Link href="/profile" className="sm:hidden text-[12px] text-muted">
          Profil
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logger ut…" : "Logg ut"}
        </Button>
      </div>
    </header>
  );
}
