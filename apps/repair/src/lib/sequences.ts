import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { idSequences, repairTickets } from "@/db/schema";
import { currentYear, formatPublicId } from "@/lib/ids";

export type SequenceKind = "REP" | "FLIP" | "PO";

const REPAIR_TICKET_DIGITS = 5;
const REPAIR_TICKET_SPAN = 10 ** REPAIR_TICKET_DIGITS;

export function formatRepairTicketNumber(n: number) {
  return `REP${String(n).padStart(REPAIR_TICKET_DIGITS, "0")}`;
}

/** REP + five random digits, unique among existing tickets. */
export async function nextRepairTicketNumber(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 24; attempt++) {
    const ticketNumber = formatRepairTicketNumber(randomInt(0, REPAIR_TICKET_SPAN));
    const [hit] = await db
      .select({ id: repairTickets.id })
      .from(repairTickets)
      .where(eq(repairTickets.ticketNumber, ticketNumber))
      .limit(1);
    if (!hit) return ticketNumber;
  }
  throw new Error("Klarte ikke å lage unikt saksnummer");
}

const RESERVED_PINS = new Set(["000000", "999999"]);

/** Unique 6-digit locker PIN. Reuses an existing pin on the ticket. */
export async function ensurePickupPin(ticketId: string): Promise<string> {
  const db = getDb();
  const [existing] = await db
    .select({ pickupPin: repairTickets.pickupPin })
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (existing?.pickupPin && /^\d{6}$/.test(existing.pickupPin)) {
    return existing.pickupPin;
  }

  for (let attempt = 0; attempt < 32; attempt++) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (RESERVED_PINS.has(pin)) continue;
    const [hit] = await db
      .select({ id: repairTickets.id })
      .from(repairTickets)
      .where(eq(repairTickets.pickupPin, pin))
      .limit(1);
    if (hit) continue;
    await db
      .update(repairTickets)
      .set({ pickupPin: pin, updatedAt: new Date() })
      .where(eq(repairTickets.id, ticketId));
    return pin;
  }
  throw new Error("Klarte ikke å lage hentepin");
}

/**
 * Atomically allocate the next public ID for FLIP/PO within the current UTC year.
 * Format: KIND-YEAR-000001
 */
export async function nextPublicId(kind: SequenceKind): Promise<string> {
  const db = getDb();
  const year = currentYear();

  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(idSequences)
      .where(and(eq(idSequences.kind, kind), eq(idSequences.year, year)))
      .for("update");

    let nextValue: number;

    if (existing.length === 0) {
      nextValue = 1;
      await tx.insert(idSequences).values({
        kind,
        year,
        lastValue: nextValue,
      });
    } else {
      nextValue = existing[0].lastValue + 1;
      await tx
        .update(idSequences)
        .set({ lastValue: nextValue })
        .where(and(eq(idSequences.kind, kind), eq(idSequences.year, year)));
    }

    return formatPublicId(kind, year, nextValue);
  });
}

/** Ensure sequence row exists (used by seed). */
export async function ensureSequence(kind: SequenceKind, year = currentYear()) {
  const db = getDb();
  await db
    .insert(idSequences)
    .values({ kind, year, lastValue: 0 })
    .onConflictDoNothing();
}

export async function peekSequence(kind: SequenceKind, year = currentYear()) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(idSequences)
    .where(and(eq(idSequences.kind, kind), eq(idSequences.year, year)))
    .limit(1);
  return row?.lastValue ?? 0;
}
