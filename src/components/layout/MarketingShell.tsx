import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Topography } from "@/components/hero/Topography";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-atmosphere relative min-h-screen">
      <Topography />
      <Navbar />
      <main className="relative pt-28 pb-20 md:pt-32">{children}</main>
      <div className="relative">
        <Footer />
      </div>
    </div>
  );
}
