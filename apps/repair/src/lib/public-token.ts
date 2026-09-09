import { randomBytes } from "crypto";

/** Unpredictable public access token for customer status pages. */
export function createPublicAccessToken(): string {
  return randomBytes(32).toString("hex");
}
