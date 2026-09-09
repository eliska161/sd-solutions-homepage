"use server";

import { and, eq } from "drizzle-orm";
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
import { getRepair } from "@/server/repairs";

const resultEnum = z.enum([
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
  "UNKNOWN",
]);

export async function getOrCreateDiagnostics(ticketId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const ticket = await getRepair(ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const existing = await db
    .select()
    .from(diagnostics)
    .where(eq(diagnostics.ticketId, ticketId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [row] = await db
    .insert(diagnostics)
    .values({
      ticketId,
      technicianId: session.user.id,
    })
    .returning();

  await db.insert(diagnosticResults).values(
    DIAGNOSTIC_CHECKS.map((check) => ({
      diagnosticsId: row.id,
      checkKey: check.key,
      result: "NOT_TESTED" as const,
    })),
  );

  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

export async function upsertDiagnosticResult(input: {
  ticketId: string;
  checkKey: string;
  result: z.infer<typeof resultEnum>;
  note?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);

  if (!isDiagnosticCheckKey(input.checkKey)) {
    throw new Error("Ugyldig diagnostikk-sjekk");
  }
  const result = resultEnum.parse(input.result);
  const db = getDb();

  const diag = await getOrCreateDiagnostics(input.ticketId);

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

  revalidatePath(`/repairs/${input.ticketId}`);
  return row;
}

export async function getDiagnosticsForTicket(ticketId: string) {
  await requireSession();
  const db = getDb();

  const [diag] = await db
    .select()
    .from(diagnostics)
    .where(eq(diagnostics.ticketId, ticketId))
    .limit(1);

  if (!diag) return null;

  const results = await db
    .select()
    .from(diagnosticResults)
    .where(eq(diagnosticResults.diagnosticsId, diag.id));

  return { diagnostics: diag, results };
}
