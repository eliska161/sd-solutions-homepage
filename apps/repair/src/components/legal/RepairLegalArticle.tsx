import Link from "next/link";
import type { LegalDocument } from "@/lib/legal";

export function RepairLegalArticle({
  doc,
  pdfHref,
}: {
  doc: LegalDocument;
  pdfHref: string;
}) {
  return (
    <article className="max-w-2xl text-sm leading-6">
      <p className="text-[12px] text-muted">Versjon {doc.version}</p>
      <h1 className="mt-1 text-xl font-semibold text-foreground">{doc.title}</h1>
      <p className="mt-3 text-muted">{doc.intro}</p>
      <p className="mt-3">
        <a href={pdfHref} className="text-accent underline">
          Last ned PDF
        </a>
      </p>
      <div className="mt-6 space-y-5">
        {doc.sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-semibold text-foreground">{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 48)} className="mt-1.5 text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-8 text-[12px] text-muted">
        <Link href="/s/ny" className="underline">
          Tilbake til serviceordre
        </Link>
      </p>
    </article>
  );
}
