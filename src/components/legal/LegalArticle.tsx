import type { Metadata } from "next";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { repairPortalUrl } from "@/lib/repair-portal";
import type { LegalDocument } from "@/lib/legal";

export function legalMetadata(doc: LegalDocument): Metadata {
  return {
    title: `${doc.title} — SD Solutions`,
    description: doc.intro,
  };
}

export function LegalArticle({ doc }: { doc: LegalDocument }) {
  const pdfHref = repairPortalUrl(`/api/public/legal/${doc.slug}`);
  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-2xl px-6 lg:px-8">
        <p className="text-[12px] uppercase tracking-[0.08em] text-muted">
          {doc.kicker} · versjon {doc.version}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {doc.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{doc.intro}</p>
        <p className="mt-4">
          <a
            href={pdfHref}
            className="text-[13px] text-accent underline underline-offset-2"
          >
            Last ned PDF
          </a>
        </p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
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
