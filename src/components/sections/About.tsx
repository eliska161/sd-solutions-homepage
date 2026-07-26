import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

export function About() {
  return (
    <Section id="om-oss">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            Om SD Solutions
          </h2>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 space-y-6 text-[15px] leading-[1.8] text-muted sm:text-base sm:leading-[1.8]">
            <p>
              SD Solutions er det offentlige merkevarenavnet til Skaug-Danielsen
              Solutions.
            </p>
            <p>
              Vi utvikler moderne programvare, webapplikasjoner og digitale
              plattformer med sterk fokus på kvalitet, pålitelighet og
              langsiktig vedlikeholdbarhet.
            </p>
            <p>
              Målet vårt er å skape programvare folk faktisk liker å bruke,
              samtidig som den løser reelle driftsutfordringer.
            </p>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
