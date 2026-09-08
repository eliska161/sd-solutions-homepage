import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import { company, formatBusinessAddress } from "@/lib/company";

export function RepairLocation() {
  return (
    <Section id="sted" className="border-y border-border">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Sted og kontakt
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-muted">
          Aktiv forretningsadresse der reparasjon og utlevering skjer.
        </p>
      </FadeIn>

      <FadeIn delay={0.08}>
        <dl className="mt-14 grid gap-10 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-muted">Forretningsadresse</dt>
            <dd className="mt-3 text-[15px] leading-relaxed text-foreground">
              <span className="block">{company.address.line1}</span>
              <span className="block">
                {company.address.postalCode} {company.address.city}
              </span>
              <span className="block">{company.address.country}</span>
              <span className="sr-only">{formatBusinessAddress()}</span>
            </dd>
          </div>

          <div>
            <dt className="text-[13px] text-muted">E-post</dt>
            <dd className="mt-3">
              <a
                href={`mailto:${company.email}`}
                className="text-[15px] text-foreground transition-colors hover:text-white/80"
              >
                {company.email}
              </a>
            </dd>

            <dt className="mt-8 text-[13px] text-muted">Organisasjon</dt>
            <dd className="mt-3 text-[15px] leading-relaxed text-foreground">
              {company.legalName}
              <span className="mt-1 block text-muted">
                {company.organizationType}
              </span>
            </dd>
          </div>
        </dl>
      </FadeIn>
    </Section>
  );
}
