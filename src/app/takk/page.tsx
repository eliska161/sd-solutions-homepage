import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { SERVICE_ORDER_URL } from "@/lib/repair-portal";

export const metadata: Metadata = {
  title: "Takk — SD Solutions",
  description: "Vi har mottatt henvendelsen din.",
  robots: { index: false, follow: false },
};

export default function TakkPage() {
  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-xl px-6 text-center lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Takk
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          Vi har registrert henvendelsen din. Du får svar på e-post eller
          telefon.
        </p>
        <p className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black"
          >
            Til startsiden
          </Link>
          <a
            href={SERVICE_ORDER_URL}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground"
          >
            Opprett serviceordre
          </a>
        </p>
      </article>
    </MarketingShell>
  );
}
