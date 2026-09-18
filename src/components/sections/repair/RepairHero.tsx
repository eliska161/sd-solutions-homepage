import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import type { GoogleReviewSummary } from "@/lib/google-reviews";
import { SERVICE_ORDER_URL } from "@/lib/repair-portal";
import { GoogleStars } from "@/components/sections/repair/GoogleRating";

export function RepairHero({ reviews }: { reviews: GoogleReviewSummary }) {
  const rating = reviews.rating;

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28 lg:pt-48 lg:pb-32">
      <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
        {rating != null ? (
          <FadeIn>
            <p
              className="flex items-center"
              aria-label={`${rating.toFixed(1).replace(".", ",")} av 5`}
            >
              <GoogleStars rating={rating} size="md" />
            </p>
          </FadeIn>
        ) : null}

        <FadeIn delay={rating != null ? 0.06 : 0}>
          <h1
            className={`max-w-[14ch] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl md:text-6xl lg:text-[4rem] ${
              rating != null ? "mt-5" : ""
            }`}
          >
            iPhone-reparasjon
          </h1>
        </FadeIn>

        <FadeIn delay={0.12}>
          <p className="mt-8 max-w-[40ch] text-[15px] leading-[1.7] text-muted sm:text-base">
            Vi reparerer iPhone: skjerm, batteri, ladeport, kamera, lyd og
            diagnostikk. Opprett en serviceordre, så tar vi saken inn i
            verkstedet.
          </p>
        </FadeIn>

        <FadeIn delay={0.18}>
          <div className="mt-12">
            <Button href={SERVICE_ORDER_URL} size="lg">
              Opprett serviceordre
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
