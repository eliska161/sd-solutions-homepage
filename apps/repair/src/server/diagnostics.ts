"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { diagnosticResults, diagnostics } from "@/db/schema";
import {
  DIAGNOSTIC_CHECKS,
  isDiagnosticCheckKey,
} from "@/lib/diagnostics-catalog";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getFlip } from "@/server/flips";
import { getRepair } from "@/server/repairs";

const resultEnum = z.enum([
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
  "UNKNOWN",
]);

async function seedDiagnosticResults(diagnosticsId: string) {
  const db = getDb();
  await db.insert(diagnosticResults).values(
    DIAGNOSTIC_CHECKS.map((check) => ({
      diagnosticsId,
      checkKey: check.key,
      result: "NOT_TESTED" as const,
    })),
  );
}

export async function getOrCreateDiagnostics(ticketId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const ticket = await getRepair(ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const existing = await db
    .select()
    .from(diagnostics)
    .where(and(eq(diagnostics.ticketId, ticketId), isNull(diagnostics.refurbishmentId)))
    .limit(1);

  if (existing[0]) return existing[0];

  const [row] = await db
    .insert(diagnostics)
    .values({
      ticketId,
      technicianId: session.user.id,
    })
    .returning();

  await seedDiagnosticResults(row.id);

  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

export async function getOrCreateFlipDiagnostics(refurbishmentId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const detail = await getFlip(refurbishmentId);
  if (!detail) throw new Error("Flip ikke funnet");

  const existing = await db
    .select()
    .from(diagnostics)
    .where(
      and(
        eq(diagnostics.refurbishmentId, refurbishmentId),
        isNotNull(diagnostics.refurbishmentId),
      ),
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const [row] = await db
    .insert(diagnostics)
    .values({
      refurbishmentId,
      technicianId: session.user.id,
    })
    .returning();

  await seedDiagnosticResults(row.id);

  revalidatePath(`/refurbishment/${refurbishmentId}`);
  return row;
}

export async function upsertDiagnosticResult(input: {
  ticketId?: string;
  refurbishmentId?: string;
  checkKey: string;
  result: z.infer<typeof resultEnum>;
  note?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);

  if (!isDiagnosticCheckKey(input.checkKey)) {
    throw new Error("Ugyldig diagnostikk-sjekk");
  }
  if (!input.ticketId && !input.refurbishmentId) {
    throw new Error("Mangler ticket eller flip");
  }
  const result = resultEnum.parse(input.result);
  const db = getDb();

  const diag = input.refurbishmentId
    ? await getOrCreateFlipDiagnostics(input.refurbishmentId)
    : await getOrCreateDiagnostics(input.ticketId!);

  const [existing] = await db
    .select()
    .from(diagnosticResults)
    .where(
      and(
        eq(diagnosticResults.diagnosticsId, diag.id),
        eq(diagnosticResults.checkKey, input.checkKey),
      ),
    )
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(diagnosticResults)
      .set({
        result,
        note: input.note ?? existing.note,
      })
      .where(eq(diagnosticResults.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(diagnosticResults)
      .values({
        diagnosticsId: diag.id,
        checkKey: input.checkKey,
        result,
        note: input.note || null,
      })
      .returning();
  }

  if (input.refurbishmentId) {
    revalidatePath(`/refurbishment/${input.refurbishmentId}`);
  } else if (input.ticketId) {
    revalidatePath(`/repairs/${input.ticketId}`);
  }
  return row;
}

export async function getDiagnosticsForTicket(ticketId: string) {
  await requireSession();
  const db = getDb();

  const [diag] = await db
    .select()
    .from(diagnostics)
    .where(and(eq(diagnostics.ticketId, ticketId), isNull(diagnostics.refurbishmentId)))
    .limit(1);

  if (!diag) return null;

  const results = await db
    .select()
    .from(diagnosticResults)
    .where(eq(diagnosticResults.diagnosticsId, diag.id));

  return { diagnostics: diag, results };
}

export async function getDiagnosticsForFlip(refurbishmentId: string) {
  await requireSession();
  const db = getDb();

  const [diag] = await db
    .select()
    .from(diagnostics)
    .where(eq(diagnostics.refurbishmentId, refurbishmentId))
    .limit(1);

  if (!diag) return null;

  const results = await db
    .select()
    .from(diagnosticResults)
    .where(eq(diagnosticResults.diagnosticsId, diag.id));

  return { diagnostics: diag, results };
}
