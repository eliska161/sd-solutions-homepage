import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

export function CTA() {
  return (
    <Section id="contact" className="pb-28 md:pb-36">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-16 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(62,142,111,0.1),transparent_65%)]" />

          <div className="relative mx-auto max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Let&apos;s build something great.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-muted sm:text-base">
              Interested in our software or looking for a custom solution?
            </p>
            <div className="mt-10">
              <Button href="mailto:kontakt@sdsolutions.no" size="lg">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}
