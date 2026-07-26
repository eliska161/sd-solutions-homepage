"use client";

import { Shield, Target, Code2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

const pillars = [
  {
    title: "Reliable",
    description:
      "We build software designed for long-term reliability and stability.",
    icon: Shield,
  },
  {
    title: "Purpose Built",
    description:
      "Every product is developed to solve real operational problems instead of adding unnecessary complexity.",
    icon: Target,
  },
  {
    title: "Modern Engineering",
    description:
      "Built with modern technologies and clean architecture for long-term maintainability.",
    icon: Code2,
  },
];

export function WhyUs() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Section className="border-y border-border bg-surface/40">
      <FadeIn>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Why SD Solutions
        </h2>
      </FadeIn>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <FadeIn key={pillar.title} delay={index * 0.08}>
              <motion.div
                className="h-full rounded-2xl border border-border bg-background/50 p-7 transition-colors duration-300 hover:border-white/12"
                whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {pillar.description}
                </p>
              </motion.div>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
