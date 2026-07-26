import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { SoftwareIllustration } from "@/components/hero/SoftwareIllustration";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 lg:pt-40 lg:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-grid" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div>
          <FadeIn>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Software built for real-world operations.
            </h1>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="mt-6 max-w-lg space-y-4 text-base leading-relaxed text-muted sm:text-[17px]">
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
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="#products" size="lg">
                Explore Products
              </Button>
              <Button href="#contact" variant="secondary" size="lg">
                Contact
              </Button>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.12} y={20} className="lg:pl-4">
          <SoftwareIllustration />
        </FadeIn>
      </div>
    </section>
  );
}
