"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import type { GoogleReview, GoogleReviewSummary } from "@/lib/google-reviews";
import { GoogleStars } from "@/components/sections/repair/GoogleRating";

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <article className="flex h-full w-[min(100%,22rem)] shrink-0 snap-start flex-col rounded-2xl border border-border bg-surface/80 p-5 sm:w-[24rem] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium text-foreground">{review.author}</p>
        <GoogleStars rating={review.rating} size="sm" />
      </div>
      <p className="mt-4 flex-1 whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground/90">
        {review.text}
      </p>
    </article>
  );
}

export function RepairReviews({ data }: { data: GoogleReviewSummary }) {
  const scroller = useRef<HTMLDivElement>(null);
  const reviews = data.reviews;

  function scrollByCard(dir: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 400);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  return (
    <Section id="anmeldelser" className="border-y border-border py-20 md:py-28 lg:py-32">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            Anmeldelser
          </h2>
          {reviews.length > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
                aria-label="Forrige anmeldelse"
                onClick={() => scrollByCard(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
                aria-label="Neste anmeldelse"
                onClick={() => scrollByCard(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </FadeIn>

      {reviews.length > 0 ? (
        <FadeIn delay={0.08}>
          <div
            ref={scroller}
            className="mt-10 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin]"
          >
            {reviews.map((review, index) => (
              <ReviewCard
                key={`${review.author}-${review.publishedAt ?? index}`}
                review={review}
              />
            ))}
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.08}>
          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted">
            Anmeldelser ligger på Google. Vi henter dem ikke hit uten betalt
            Places API.
          </p>
        </FadeIn>
      )}

      <FadeIn delay={0.12}>
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          <a
            href={data.mapsUrl}
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Les på Google
          </a>
          <a
            href={data.writeUrl}
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Skriv en anmeldelse
          </a>
        </p>
      </FadeIn>
    </Section>
  );
}
