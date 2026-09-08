import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { company } from "@/lib/company";

export function RepairHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28 lg:pt-48 lg:pb-32">
      <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
        <FadeIn>
          <p className="text-[13px] font-medium tracking-[0.04em] text-foreground/70">
            {company.repairName}
          </p>
        </FadeIn>

        <FadeIn delay={0.06}>
          <h1 className="mt-5 max-w-[14ch] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl md:text-6xl lg:text-[4rem]">
            iPhone-reparasjon
          </h1>
        </FadeIn>

        <FadeIn delay={0.12}>
          <p className="mt-8 max-w-[34ch] text-[15px] leading-[1.7] text-muted sm:text-base">
            Skjerm, batteri og andre vanlige feil. Pris før vi starter.
          </p>
        </FadeIn>

        <FadeIn delay={0.18}>
          <div className="mt-12">
            <Button href="#bestill" size="lg">
              Bestill reparasjon
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
