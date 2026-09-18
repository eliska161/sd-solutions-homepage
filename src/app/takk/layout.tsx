import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";

export default function TakkLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-atmosphere relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="relative w-full max-w-md text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        {children}
      </div>
    </div>
  );
}
