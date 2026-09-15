import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import { company } from "@/lib/company";

export function RepairAbout() {
  return (
    <Section id="om" className="border-y border-border py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            {company.repairName}
          </h2>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-8 space-y-5 text-[15px] leading-[1.8] text-muted sm:text-base sm:leading-[1.8]">
            <p>
              SD Solutions Repair tar inn telefoner til reparasjon og
              refurbishing, med hovedvekt på iPhone.
            </p>
            <p>
              Vi bytter skjerm og batteri, fikser ladeport, kamera og lyd, og
              kjører diagnostikk når feilen ikke er åpenbar. Du følger saken på
              en statusside etter at ordren er opprettet.
            </p>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
