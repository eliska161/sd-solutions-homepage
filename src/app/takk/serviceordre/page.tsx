import type { Metadata } from "next";
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
    <>
      <h1 className="mt-8 text-3xl font-medium tracking-[-0.03em] text-foreground">
        Ordren er registrert
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Du får bekreftelse på e-post eller SMS. Neste steg er å avtale
        innlevering.
      </p>
      <a
        href={nextHref}
        className="mt-10 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black"
      >
        Fortsett til innlevering
      </a>
    </>
  );
}
