import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

export function About() {
  return (
    <Section id="about">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            About SD Solutions
          </h2>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 space-y-6 text-[15px] leading-[1.8] text-muted sm:text-base sm:leading-[1.8]">
            <p>
              SD Solutions is the public brand of Skaug-Danielsen Solutions.
            </p>
            <p>
              We develop modern software, web applications and digital platforms
              with a strong focus on quality, reliability and long-term
              maintainability.
            </p>
            <p>
              Our goal is to create software that people genuinely enjoy using
              while solving real operational challenges.
            </p>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
