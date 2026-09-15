"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { secondaryTabsForPath } from "@/lib/nav";

function isSecondaryActive(pathname: string, search: string, href: string) {
  const [path, query] = href.split("?");
  if (pathname !== path) {
    if (path === "/repairs" && !query && pathname.startsWith("/repairs/")) {
      return href === "/repairs";
    }
    return false;
  }
  if (!query) {
    if (href.includes("new=1")) return search.includes("new=1");
    if (path === "/repairs") {
      return !search.includes("status=") && !search.includes("pending=");
    }
    if (path === "/customers" || path === "/devices") {
      return !search.includes("new=1");
    }
    return true;
  }
  return search.includes(query);
}

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const secondary = secondaryTabsForPath(pathname);
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";

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
    <header className="bg-[#23262e] text-white">
      <div className="flex h-12 items-center gap-3 px-3 lg:px-4">
        <form onSubmit={onSearch} className="min-w-0 flex-1 max-w-md">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søk kunder, tickets, enheter…"
            aria-label="Globalt søk"
            className="h-8 rounded border-white/15 bg-white/10 text-white placeholder:text-white/50"
          />
        </form>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/profile" className="hidden text-right sm:block">
            <p className="text-[12px] text-white">{userName}</p>
            <p className="text-[11px] text-white/60">
              {userEmail} · {userRole}
            </p>
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
      </div>
      {secondary ? (
        <nav
          className="flex gap-1 overflow-x-auto border-t border-white/10 bg-[#1b1e24] px-2"
          aria-label="Undermeny"
        >
          {secondary.map((tab) => {
            const active = isSecondaryActive(pathname, search, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "shrink-0 px-3 py-2 text-[12px]",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
