"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import type { GoogleReview, GoogleReviewSummary } from "@/lib/google-reviews";
import {
  GoogleMark,
  GoogleStars,
  formatGoogleRating,
} from "@/components/sections/repair/GoogleRating";

function formatPublishedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const when = formatPublishedAt(review.publishedAt);
  return (
    <article className="flex h-full w-[min(100%,22rem)] shrink-0 snap-start flex-col rounded-2xl border border-border bg-surface/80 p-5 sm:w-[24rem] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-foreground">{review.author}</p>
          {when ? <p className="mt-1 text-[12px] text-muted">{when}</p> : null}
        </div>
        <GoogleStars rating={review.rating} size="sm" />
      </div>
      <p className="mt-4 flex-1 whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground/90">
        {review.text}
      </p>
      <p className="mt-5 text-[12px] text-muted">Hentet fra Google</p>
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
          <div>
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <GoogleMark className="h-4 w-4" />
              Google
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
              Anmeldelser
            </h2>
            {data.rating != null ? (
              <p className="mt-3 text-[15px] text-muted">
                {formatGoogleRating(data.rating)} av 5
                {data.count > 0
                  ? ` · ${data.count} ${data.count === 1 ? "anmeldelse" : "anmeldelser"}`
                  : ""}
              </p>
            ) : (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                Fulle kundeomtaler fra Google-profilen. Trykk innom Google for å
                lese alt som ligger der.
              </p>
            )}
          </div>
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

      <FadeIn delay={0.08}>
        {reviews.length > 0 ? (
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
        ) : (
          <div className="mt-10 rounded-2xl border border-border bg-surface/80 p-6 sm:p-8">
            <p className="max-w-xl text-[15px] leading-relaxed text-muted">
              Anmeldelser fra Google vises her når de er offentlige på
              profilen. Åpne Google for å lese og skrive.
            </p>
          </div>
        )}
        <p className="mt-6">
          <a
            href={data.mapsUrl}
            className="text-[14px] text-foreground/80 underline decoration-white/20 underline-offset-4 transition-colors hover:text-foreground"
            rel="noopener noreferrer"
            target="_blank"
          >
            Alle anmeldelser på Google
          </a>
          <span className="text-muted"> · </span>
          <a
            href={data.writeUrl}
            className="text-[14px] text-foreground/80 underline decoration-white/20 underline-offset-4 transition-colors hover:text-foreground"
            rel="noopener noreferrer"
            target="_blank"
          >
            Skriv en anmeldelse
          </a>
        </p>
      </FadeIn>
    </Section>
  );
}
