import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

const services = [
  "Skjermbytte",
  "Batteribytte",
  "Ladeport",
  "Kamera og lyd",
  "Diagnostikk",
];

export function RepairServices() {
  return (
    <Section id="tjenester" className="py-20 md:py-28 lg:py-32">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Tjenester
        </h2>
      </FadeIn>

      <FadeIn delay={0.08}>
        <ul className="mt-12 space-y-4 sm:mt-14">
          {services.map((service) => (
            <li
              key={service}
              className="flex items-center gap-3 text-[15px] text-foreground sm:text-base"
            >
              <span className="h-px w-3 shrink-0 bg-white/25" />
              {service}
            </li>
          ))}
        </ul>
      </FadeIn>
    </Section>
  );
}
