import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Takk — SD Solutions",
  description: "Serviceordren er opprettet.",
  robots: { index: false, follow: false },
};

export default async function ServiceOrderThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const nextHref =
    token && /^[a-f0-9]{64}$/i.test(token)
      ? `/s/${token}/innlevering`
      : "/s/ny";

  return (
    <article className="mx-auto max-w-xl py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Takk
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Serviceordren er registrert. Du får bekreftelse på e-post eller SMS.
        Neste steg er innlevering.
      </p>
      <p className="mt-8">
        <Link
          href={nextHref}
          className="inline-flex h-10 items-center justify-center rounded-md bg-chrome px-4 text-sm font-medium text-white"
        >
          Fortsett til innlevering
        </Link>
      </p>
    </article>
  );
}
