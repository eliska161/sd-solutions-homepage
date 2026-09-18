import type { ReactNode } from "react";
import { Check } from "lucide-react";

export default function TakkLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-atmosphere relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <Check
            className="h-7 w-7 text-emerald-400"
            strokeWidth={2.5}
            aria-hidden
          />
        </div>
        {children}
      </div>
    </div>
  );
}
