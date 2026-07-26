import { ContactForm } from "@/components/contact/ContactForm";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

export function CTA() {
  return (
    <Section id="kontakt" className="pb-32 md:pb-40">
      <FadeIn>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl md:text-5xl md:leading-[1.1]">
            La oss bygge noe bra.
          </h2>
          <p className="mx-auto mt-6 max-w-sm text-[15px] leading-[1.75] text-muted">
            Interessert i programvaren vår, eller ser du etter en skreddersydd
            løsning? Velg type henvendelse, så tilpasser vi skjemaet.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="mx-auto mt-14 max-w-xl">
          <ContactForm />
        </div>
      </FadeIn>
    </Section>
  );
}
