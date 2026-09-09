"use client";

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
    <header className="flex h-14 items-center gap-4 border-b border-border px-4 lg:px-6">
      <form onSubmit={onSearch} className="min-w-0 flex-1 max-w-md">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk kunder, tickets, enheter, deler…"
          aria-label="Globalt søk"
        />
      </form>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-[13px] text-foreground">{userEmail}</p>
          <p className="text-[11px] text-muted">
            {userName} · {userRole}
          </p>
        </div>
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
