import { eq } from "drizzle-orm";
import { repairTickets } from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  createPublicShortCode,
  isPublicLongToken,
  isPublicShortCode,
} from "@/lib/public-token";

export function publicTicketLinkFilter(token: string) {
  const value = token.trim();
  if (isPublicLongToken(value)) {
    return eq(repairTickets.publicAccessToken, value);
  }
  if (isPublicShortCode(value)) {
    return eq(repairTickets.publicShortCode, value);
  }
  return null;
}

export async function allocatePublicShortCode() {
  const db = getDb();
  for (let i = 0; i < 12; i++) {
    const code = createPublicShortCode();
    const [hit] = await db
      .select({ id: repairTickets.id })
      .from(repairTickets)
      .where(eq(repairTickets.publicShortCode, code))
      .limit(1);
    if (!hit) return code;
  }
  throw new Error("Kunne ikke lage kort statuskode");
}
