"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  Shield,
  ShoppingBag,
  Smartphone,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PRIMARY_TABS, primaryTabActive } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/repairs": Ticket,
  "/customers": Users,
  "/devices": Smartphone,
  "/inventory": Package,
  "/refurbishment": RefreshCw,
  "/sales": ShoppingBag,
  "/warranty": Shield,
  "/reports": BarChart3,
  "/settings": Settings,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-14 shrink-0 flex-col bg-chrome text-white lg:w-52">
      <Link
        href="/dashboard"
        className="flex h-12 items-center gap-2 border-b border-white/10 px-3 text-[13px] font-semibold tracking-tight"
      >
        <span className="hidden lg:inline">SD Solutions</span>
        <span className="lg:hidden">SD</span>
      </Link>
      <nav className="flex flex-1 flex-col py-2" aria-label="Hovedmeny">
        {PRIMARY_TABS.map((tab) => {
          const active = primaryTabActive(pathname, tab.href);
          const Icon = ICONS[tab.href] ?? Ticket;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              className={[
                "flex items-center gap-3 px-3 py-2.5 text-[13px]",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              <span className="hidden truncate lg:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
