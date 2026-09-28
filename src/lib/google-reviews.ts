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
 * Real Google reviews, updated by hand.
 * Do not invent names or quotes.
 */
export const GOOGLE_REVIEW_SNAPSHOT: GoogleReviewSummary = {
  rating: 5,
  count: 1,
  reviews: [
    {
      author: "Lilian skaug",
      rating: 5,
      text: "Bra reparasjon. Skjerm og batteri ble skiftet. Alt fungerer nå som det skal. Tusen takk.",
      publishedAt: null,
    },
  ],
  writeUrl: GOOGLE_REVIEW_URL,
  mapsUrl: GOOGLE_MAPS_URL,
};

export async function loadGoogleReviews(): Promise<GoogleReviewSummary> {
  return GOOGLE_REVIEW_SNAPSHOT;
}
