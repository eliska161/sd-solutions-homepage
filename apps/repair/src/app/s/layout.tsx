import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SD Solutions",
  description: "Status og serviceordre.",
};

export default function CustomerStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-chrome text-white">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4 lg:px-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] font-semibold tracking-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sd-solutions-mark.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            SD Solutions
          </Link>
          <Link
            href="/login"
            className="text-[12px] text-white/65 hover:text-white"
          >
            Ansatt
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-4 lg:px-5">{children}</div>
      <footer className="mx-auto max-w-4xl px-4 pb-8 text-[12px] text-muted lg:px-5">
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/s/personvern" className="underline">
            Personvern
          </Link>
          <Link href="/s/vilkar" className="underline">
            Vilkår
          </Link>
          <Link href="/s/garanti" className="underline">
            Garanti
          </Link>
          <Link href="/s/innlevering-vilkar" className="underline">
            Inn- og utlevering
          </Link>
          <Link href="/s/mottak" className="underline">
            Mottak
          </Link>
        </nav>
      </footer>
    </div>
  );
}
