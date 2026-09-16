import { randomBytes } from "crypto";

/** Unpredictable public access token for customer status pages. */
export function createPublicAccessToken(): string {
  return randomBytes(32).toString("hex");
}

const SHORT_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short code for SMS links. Avoids 0/O/1/I. */
export function createPublicShortCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) {
    out += SHORT_ALPHABET[b % SHORT_ALPHABET.length];
  }
  return out;
}

export function isPublicLongToken(token: string) {
  return /^[a-f0-9]{64}$/i.test(token);
}

export function isPublicShortCode(token: string) {
  return /^[a-zA-Z0-9]{6,12}$/.test(token) && !isPublicLongToken(token);
}
