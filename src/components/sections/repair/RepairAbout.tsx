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
          <p className="mt-8 text-[15px] leading-[1.8] text-muted sm:text-base sm:leading-[1.8]">
            {company.repairDescription}
          </p>
        </FadeIn>
      </div>
    </Section>
  );
}
