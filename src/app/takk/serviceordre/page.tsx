import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { repairPortalUrl } from "@/lib/repair-portal";

export const metadata: Metadata = {
  title: "Takk — serviceordre — SD Solutions",
  description: "Serviceordren er opprettet.",
  robots: { index: false, follow: false },
};

export default async function ServiceordreTakkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const nextHref =
    token && /^[a-f0-9]{64}$/i.test(token)
      ? repairPortalUrl(`/s/${token}/innlevering`)
      : repairPortalUrl("/");

  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-xl px-6 text-center lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Takk
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          Serviceordren er registrert. Du får bekreftelse på e-post eller SMS.
          Neste steg er innlevering.
        </p>
        <p className="mt-8">
          <a
            href={nextHref}
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black"
          >
            Fortsett til innlevering
          </a>
        </p>
        <p className="mt-4">
          <Link href="/" className="text-[13px] text-muted underline">
            Til startsiden
          </Link>
        </p>
      </article>
    </MarketingShell>
  );
}
