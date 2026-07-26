import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { SoftwareIllustration } from "@/components/hero/SoftwareIllustration";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-44 md:pb-32 lg:pt-48 lg:pb-40">
      <div className="pointer-events-none absolute inset-0 bg-subtle-pattern" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-20 px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <FadeIn>
            <h1 className="max-w-[11ch] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl md:text-6xl lg:text-[4rem]">
              Software built for real-world operations.
            </h1>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="mt-8 max-w-[34ch] space-y-5 text-[15px] leading-[1.7] text-muted sm:text-base sm:leading-[1.75]">
              <p>
                SD Solutions develops modern software, web applications and
                digital platforms that solve real operational challenges.
              </p>
              <p>
                We build reliable software designed for long-term use, intuitive
                workflows and high performance.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.14}>
            <div className="mt-12 flex flex-wrap gap-3">
              <Button href="#products" size="lg">
                Explore Products
              </Button>
              <Button href="#contact" variant="secondary" size="lg">
                Contact
              </Button>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.12} y={16} className="lg:justify-self-end">
          <SoftwareIllustration />
        </FadeIn>
      </div>
    </section>
  );
}
