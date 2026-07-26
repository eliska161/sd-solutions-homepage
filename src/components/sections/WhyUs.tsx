"use client";

import { Shield, Target, Code2 } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

const pillars = [
  {
    title: "Pålitelig",
    description:
      "Vi bygger programvare designet for langsiktig pålitelighet og stabilitet.",
    icon: Shield,
  },
  {
    title: "Formålsbygget",
    description:
      "Hvert produkt er utviklet for å løse reelle driftsproblemer i stedet for å legge til unødvendig kompleksitet.",
    icon: Target,
  },
  {
    title: "Moderne utvikling",
    description:
      "Bygget med moderne teknologier og ren arkitektur for langsiktig vedlikeholdbarhet.",
    icon: Code2,
  },
];

export function WhyUs() {
  return (
    <Section className="border-y border-border">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Hvorfor SD Solutions
        </h2>
      </FadeIn>

      <div className="mt-16 grid gap-12 md:mt-20 md:grid-cols-3 md:gap-10">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <FadeIn key={pillar.title} delay={index * 0.08}>
              <div>
                <Icon
                  className="h-4 w-4 text-foreground/50"
                  strokeWidth={1.5}
                />
                <h3 className="mt-6 text-lg font-medium tracking-[-0.02em] text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-3 max-w-xs text-[15px] leading-[1.75] text-muted">
                  {pillar.description}
                </p>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
