import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import { company } from "@/lib/company";

export function RepairAbout() {
  return (
    <Section id="om-reparasjon">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            Om tjenesten
          </h2>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 space-y-6 text-[15px] leading-[1.8] text-muted sm:text-base sm:leading-[1.8]">
            <p>
              {company.brandName} er det offentlige merkevarenavnet til{" "}
              {company.legalName}. Vi er et IT-firma som utvikler programvare —
              og vi tilbyr også iPhone-reparasjon.
            </p>
            <p>
              Reparasjonene utføres med fokus på riktig diagnose, ærlige
              anbefalinger og deler av god kvalitet. Du skal vite hva som gjøres,
              og hva det koster, før vi starter.
            </p>
            <p>
              Organisasjonstype: {company.organizationType}.
            </p>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
