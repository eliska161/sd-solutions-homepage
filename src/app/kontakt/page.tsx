import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { virksomhet } from "@/lib/legal";
import { repairPortalUrl } from "@/lib/repair-portal";

export const metadata: Metadata = {
  title: "Kontakt — SD Solutions",
  description: virksomhet.intro,
};

export default function KontaktPage() {
  const pdfHref = repairPortalUrl(`/api/public/legal/${virksomhet.slug}`);
  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-2xl px-6 lg:px-8">
        <p className="text-[12px] text-muted">Versjon {virksomhet.version}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {virksomhet.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          {virksomhet.intro}
        </p>
        <p className="mt-4 flex flex-wrap gap-4 text-[13px]">
          <a href={pdfHref} className="text-accent underline underline-offset-2">
            Last ned PDF
          </a>
          <Link
            href="/programvare#kontakt"
            className="text-accent underline underline-offset-2"
          >
            Send melding
          </Link>
        </p>
        <div className="mt-10 space-y-8">
          {virksomhet.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold text-foreground">
                {section.title}
              </h2>
              {section.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 48)}
                  className="mt-2 text-[15px] leading-relaxed text-muted"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  );
}
