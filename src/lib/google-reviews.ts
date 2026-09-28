export const GOOGLE_REVIEW_URL =
  "https://g.page/r/CZBWlqrmO5WEEBM/review";

export const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place//data=!4m2!3m1!1s0x63c843d32d4be32b:0x84953be6aa965690";

/** Google Maps feature id for SD Solutions, Elverum. */
const GOOGLE_FEATURE_ID = "0x63c843d32d4be32b:0x84953be6aa965690";

export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  publishedAt: string | null;
};

export type GoogleReviewSummary = {
  rating: number | null;
  count: number;
  reviews: GoogleReview[];
  writeUrl: string;
  mapsUrl: string;
};

/**
 * Empty until Outscraper returns real Google reviews.
 * Do not invent names or quotes.
 */
export const GOOGLE_REVIEW_SNAPSHOT: GoogleReviewSummary = {
  rating: null,
  count: 0,
  reviews: [],
  writeUrl: GOOGLE_REVIEW_URL,
  mapsUrl: GOOGLE_MAPS_URL,
};

const REVIEW_CACHE_SECONDS = 600;
const REVIEW_LIMIT = 12;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseOutscraperReview(row: unknown): GoogleReview | null {
  if (!row || typeof row !== "object") return null;
  const review = row as Record<string, unknown>;
  const text =
    typeof review.review_text === "string" ? review.review_text.trim() : "";
  if (text.length < 8) return null;
  const rating = asNumber(review.review_rating);
  if (rating == null) return null;
  const author =
    typeof review.author_title === "string" && review.author_title.trim()
      ? review.author_title.trim()
      : "Google-bruker";
  let publishedAt: string | null = null;
  const ts = asNumber(review.review_timestamp);
  if (ts != null) publishedAt = new Date(ts * 1000).toISOString();
  return { author, rating, text, publishedAt };
}

function isSdSolutionsPlace(place: Record<string, unknown>): boolean {
  const googleId =
    typeof place.google_id === "string" ? place.google_id.trim() : "";
  if (googleId === GOOGLE_FEATURE_ID) return true;

  const name = typeof place.name === "string" ? place.name.toLowerCase() : "";
  const addr =
    typeof place.full_address === "string"
      ? place.full_address.toLowerCase()
      : "";
  return (
    name.includes("sd solutions") ||
    (addr.includes("elverum") && name.includes("sd"))
  );
}

function fromOutscraperPlace(
  place: Record<string, unknown>,
): GoogleReviewSummary | null {
  if (!isSdSolutionsPlace(place)) return null;

  const rating = asNumber(place.rating);
  const count = asNumber(place.reviews) ?? 0;
  const raw = Array.isArray(place.reviews_data) ? place.reviews_data : [];
  const reviews = raw
    .map(parseOutscraperReview)
    .filter((row): row is GoogleReview => Boolean(row));
  if (!rating && reviews.length === 0 && !count) return null;
  return {
    rating,
    count: count || reviews.length,
    reviews,
    writeUrl: GOOGLE_REVIEW_URL,
    mapsUrl: GOOGLE_MAPS_URL,
  };
}

/** Outscraper Google Maps reviews. Falls back to the empty snapshot. */
export async function loadGoogleReviews(): Promise<GoogleReviewSummary> {
  const key = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!key) return GOOGLE_REVIEW_SNAPSHOT;

  const params = new URLSearchParams({
    query: GOOGLE_FEATURE_ID,
    reviewsLimit: String(REVIEW_LIMIT),
    limit: "1",
    sort: "newest",
    ignoreEmpty: "true",
    language: "no",
    region: "NO",
    async: "false",
  });

  try {
    const res = await fetch(
      `https://api.outscraper.com/google-maps-reviews?${params.toString()}`,
      {
        headers: { "X-API-KEY": key },
        next: { revalidate: REVIEW_CACHE_SECONDS },
      },
    );
    if (!res.ok) return GOOGLE_REVIEW_SNAPSHOT;
    const body = (await res.json()) as {
      data?: Record<string, unknown>[];
    };
    const place = body.data?.[0];
    if (!place) return GOOGLE_REVIEW_SNAPSHOT;
    return fromOutscraperPlace(place) ?? GOOGLE_REVIEW_SNAPSHOT;
  } catch {
    return GOOGLE_REVIEW_SNAPSHOT;
  }
}
