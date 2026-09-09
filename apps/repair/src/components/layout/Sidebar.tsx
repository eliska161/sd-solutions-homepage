"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <Link href="/dashboard" className="block">
          <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">
            SD Solutions
          </p>
          <p className="mt-1 text-sm font-medium tracking-[-0.02em] text-foreground">
            Repair Ops
          </p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "block rounded-lg px-3 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted hover:bg-white/[0.03] hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
                {"children" in item && item.children && active ? (
                  <ul className="mt-1 mb-2 ml-2 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="block rounded-md px-2 py-1.5 text-[12px] text-muted transition-colors hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
