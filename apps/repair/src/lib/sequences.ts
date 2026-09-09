import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { idSequences } from "@/db/schema";
import { currentYear, formatPublicId } from "@/lib/ids";

export type SequenceKind = "REP" | "FLIP" | "PO";

/**
 * Atomically allocate the next public ID for REP/FLIP/PO within the current UTC year.
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
