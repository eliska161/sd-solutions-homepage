"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PRIMARY_TABS,
  primaryTabActive,
  secondaryTabsForPath,
} from "@/lib/nav";

function isSecondaryActive(pathname: string, search: string, href: string) {
  const [path, query] = href.split("?");

  if (pathname !== path) {
    if (path === "/repairs" && !query && pathname.startsWith("/repairs/")) {
      return href === "/repairs";
    }
    if (
      path &&
      !query &&
      pathname.startsWith(`${path}/`) &&
      (path === "/inventory" || path === "/refurbishment")
    ) {
      return false;
    }
    return false;
  }

  if (!query) {
    if (href.includes("new=1")) return search.includes("new=1");
    if (path === "/repairs") return !search.includes("status=");
    if (path === "/customers" || path === "/devices") {
      return !search.includes("new=1");
    }
    return true;
  }

  return search.includes(query);
}

export function AppTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const secondary = secondaryTabsForPath(pathname);

  return (
    <div className="border-b border-border bg-surface">
      <nav
        className="flex gap-1 overflow-x-auto px-4 lg:px-6"
        aria-label="Hovedmeny"
      >
        {PRIMARY_TABS.map((tab) => {
          const active = primaryTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "shrink-0 border-b-2 px-3 py-3 text-[13px] transition-colors",
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {secondary ? (
        <nav
          className="flex gap-1 overflow-x-auto border-t border-border px-4 lg:px-6"
          aria-label="Undermeny"
        >
          {secondary.map((tab) => {
            const active = isSecondaryActive(pathname, search, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "shrink-0 rounded-md px-2.5 py-2 text-[12px] transition-colors",
                  active
                    ? "bg-white/[0.06] text-foreground"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
