import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { company } from "@/lib/company";
import type { GoogleReviewSummary } from "@/lib/google-reviews";
import { SERVICE_ORDER_URL } from "@/lib/repair-portal";
import {
  GoogleMark,
  GoogleRatingLabel,
  GoogleStars,
} from "@/components/sections/repair/GoogleRating";

export function RepairHero({ reviews }: { reviews: GoogleReviewSummary }) {
  const featured = reviews.reviews[0] ?? null;
  const rating = reviews.rating ?? (featured ? featured.rating : null);

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28 lg:pt-48 lg:pb-32">
      <div className="relative mx-auto grid max-w-5xl items-start gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:px-8 lg:gap-16">
        <div>
          <FadeIn>
            <p className="text-[13px] font-medium tracking-[0.04em] text-foreground/70">
              {company.repairName}
            </p>
          </FadeIn>

          <FadeIn delay={0.06}>
            <h1 className="mt-5 max-w-[14ch] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl md:text-6xl lg:text-[4rem]">
              iPhone-reparasjon
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <a
              href="#anmeldelser"
              className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-[13px] text-foreground/90 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <GoogleMark className="h-4 w-4" />
              {rating != null ? (
                <>
                  <GoogleStars rating={rating} size="sm" />
                  <GoogleRatingLabel data={reviews} />
                </>
              ) : (
                <span>Google-anmeldelser</span>
              )}
            </a>
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

        <FadeIn delay={0.14} className="lg:pt-10">
          <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <GoogleMark className="h-5 w-5" />
              Google
            </div>
            {rating != null ? (
              <p className="mt-4 text-4xl font-medium tracking-[-0.04em] text-foreground">
                {rating.toFixed(1).replace(".", ",")}
              </p>
            ) : (
              <p className="mt-4 text-2xl font-medium tracking-[-0.03em] text-foreground">
                Anmeldelser
              </p>
            )}
            {rating != null ? (
              <div className="mt-2">
                <GoogleStars rating={rating} size="lg" />
              </div>
            ) : null}
            {reviews.count > 0 ? (
              <p className="mt-2 text-[13px] text-muted">
                {reviews.count}{" "}
                {reviews.count === 1 ? "anmeldelse" : "anmeldelser"}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-muted">
                Åpne Google for å lese og skrive.
              </p>
            )}
            {featured ? (
              <blockquote className="mt-5 border-t border-border pt-5">
                <p className="text-[14px] leading-[1.65] text-foreground/90">
                  {featured.text.length > 220
                    ? `${featured.text.slice(0, 220).trim()}…`
                    : featured.text}
                </p>
                <footer className="mt-3 text-[12px] text-muted">
                  {featured.author}
                </footer>
              </blockquote>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={reviews.mapsUrl}
                className="text-[13px] text-foreground/80 underline decoration-white/20 underline-offset-4 hover:text-foreground"
                rel="noopener noreferrer"
                target="_blank"
              >
                Les på Google
              </a>
              <a
                href={reviews.writeUrl}
                className="text-[13px] text-foreground/80 underline decoration-white/20 underline-offset-4 hover:text-foreground"
                rel="noopener noreferrer"
                target="_blank"
              >
                Skriv en anmeldelse
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
