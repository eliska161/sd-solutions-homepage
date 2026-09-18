export const GOOGLE_REVIEW_URL =
  "https://g.page/r/CZBWlqrmO5WEEBM/review";

export const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place//data=!4m2!3m1!1s0x63c843d32d4be32b:0x84953be6aa965690";

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
 * Last-known public reviews. Updated when Places API is configured, or by
 * editing this list. Do not invent names or quotes that are not from Google.
 */
export const GOOGLE_REVIEW_SNAPSHOT: GoogleReviewSummary = {
  rating: null,
  count: 0,
  reviews: [],
  writeUrl: GOOGLE_REVIEW_URL,
  mapsUrl: GOOGLE_MAPS_URL,
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parsePlacesReview(row: unknown): GoogleReview | null {
  if (!row || typeof row !== "object") return null;
  const review = row as Record<string, unknown>;
  const textObj = review.text;
  let text = "";
  if (typeof textObj === "string") text = textObj;
  else if (textObj && typeof textObj === "object" && "text" in textObj) {
    const inner = (textObj as { text?: unknown }).text;
    if (typeof inner === "string") text = inner;
  } else if (typeof review.text === "string") {
    text = review.text;
  }
  text = text.trim();
  if (text.length < 8) return null;

  const authorObj = review.authorAttribution;
  let author = "Google-bruker";
  if (authorObj && typeof authorObj === "object") {
    const name = (authorObj as { displayName?: unknown }).displayName;
    if (typeof name === "string" && name.trim()) author = name.trim();
  } else if (typeof review.author_name === "string" && review.author_name.trim()) {
    author = review.author_name.trim();
  }

  const rating =
    asNumber(review.rating) ??
    asNumber((review as { starRating?: unknown }).starRating) ??
    5;

  let publishedAt: string | null = null;
  if (typeof review.publishTime === "string") publishedAt = review.publishTime;
  else if (typeof review.time === "number") {
    publishedAt = new Date(review.time * 1000).toISOString();
  }

  return { author, rating, text, publishedAt };
}

function placeName(place: Record<string, unknown>) {
  const name = place.displayName;
  if (name && typeof name === "object" && "text" in name) {
    return String((name as { text?: unknown }).text ?? "");
  }
  return typeof place.name === "string" ? place.name : "";
}

function placeAddress(place: Record<string, unknown>) {
  return typeof place.formattedAddress === "string"
    ? place.formattedAddress
    : "";
}

function pickPlace(places: Record<string, unknown>[]) {
  const scored = places.map((place) => {
    const name = placeName(place).toLowerCase();
    const addr = placeAddress(place).toLowerCase();
    let score = 0;
    if (name.includes("sd solutions")) score += 5;
    if (addr.includes("elverum")) score += 5;
    if (addr.includes("slått") || addr.includes("slatt")) score += 3;
    return { place, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 5) return null;
  return best.place;
}

function fromPlace(place: Record<string, unknown>): GoogleReviewSummary | null {
  const rating = asNumber(place.rating);
  const count =
    asNumber(place.userRatingCount) ??
    asNumber(place.user_ratings_total) ??
    0;
  const rawReviews = Array.isArray(place.reviews) ? place.reviews : [];
  const reviews = rawReviews
    .map(parsePlacesReview)
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

/** Places API (New) text search + reviews. Falls back to the snapshot. */
export async function loadGoogleReviews(): Promise<GoogleReviewSummary> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return GOOGLE_REVIEW_SNAPSHOT;

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.reviews",
        },
        body: JSON.stringify({
          textQuery: "SD Solutions Slåttmyrvegen 49 Elverum",
          languageCode: "no",
          regionCode: "NO",
          maxResultCount: 3,
        }),
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return GOOGLE_REVIEW_SNAPSHOT;
    const data = (await res.json()) as { places?: Record<string, unknown>[] };
    const places = data.places ?? [];
    const match = pickPlace(places);
    if (!match) return GOOGLE_REVIEW_SNAPSHOT;
    const placeId =
      typeof match.id === "string"
        ? match.id.replace(/^places\//, "")
        : "";
    if (placeId) {
      const details = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "id,displayName,formattedAddress,rating,userRatingCount,reviews",
          },
          next: { revalidate: 86400 },
        },
      );
      if (details.ok) {
        const body = (await details.json()) as Record<string, unknown>;
        return fromPlace(body) ?? fromPlace(match) ?? GOOGLE_REVIEW_SNAPSHOT;
      }
    }
    return fromPlace(match) ?? GOOGLE_REVIEW_SNAPSHOT;
  } catch {
    return GOOGLE_REVIEW_SNAPSHOT;
  }
}
