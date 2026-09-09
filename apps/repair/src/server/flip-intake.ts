"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { flipIntakeInspections } from "@/db/schema";
import {
  FLIP_INTAKE_CHECKLIST,
  INTAKE_PHYSICAL_ZONES,
} from "@/lib/intake-catalog";
import { addActivity } from "@/lib/activity";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getFlip } from "@/server/flips";

const checkResultSchema = z.enum([
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
]);

const upsertFlipIntakeSchema = z.object({
  refurbishmentId: z.string().uuid(),
  damageNotes: z.string().optional().nullable(),
  physicalZones: z.record(z.string(), z.string()).optional(),
  checklist: z
    .record(
      z.string(),
      z.object({
        result: checkResultSchema,
        note: z.string().optional(),
      }),
    )
    .optional(),
  markCompleted: z.boolean().optional(),
});

export async function getFlipIntakeInspection(refurbishmentId: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(flipIntakeInspections)
    .where(eq(flipIntakeInspections.refurbishmentId, refurbishmentId))
    .orderBy(desc(flipIntakeInspections.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function upsertFlipIntakeInspection(
  input: z.infer<typeof upsertFlipIntakeSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = upsertFlipIntakeSchema.parse(input);

  const detail = await getFlip(data.refurbishmentId);
  if (!detail) throw new Error("Flip ikke funnet");

  const zoneKeys = new Set(INTAKE_PHYSICAL_ZONES.map((z) => z.key));
  const checkKeys = new Set(FLIP_INTAKE_CHECKLIST.map((c) => c.key));

  const physicalZones: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.physicalZones ?? {})) {
    if (zoneKeys.has(key as (typeof INTAKE_PHYSICAL_ZONES)[number]["key"])) {
      physicalZones[key] = value;
    }
  }

  const checklist: Record<
    string,
    { result: z.infer<typeof checkResultSchema>; note?: string }
  > = {};
  for (const [key, value] of Object.entries(data.checklist ?? {})) {
    if (checkKeys.has(key as (typeof FLIP_INTAKE_CHECKLIST)[number]["key"])) {
      checklist[key] = {
        result: value.result,
        ...(value.note ? { note: value.note } : {}),
      };
    }
  }

  const db = getDb();
  const existing = await getFlipIntakeInspection(data.refurbishmentId);
  const now = new Date();
  const completedAt = data.markCompleted
    ? now
    : (existing?.completedAt ?? null);

  let row;
  if (existing) {
    [row] = await db
      .update(flipIntakeInspections)
      .set({
        inspectedById: session.user.id,
        damageNotes:
          data.damageNotes === undefined
            ? existing.damageNotes
            : data.damageNotes || null,
        physicalZones:
          data.physicalZones === undefined
            ? existing.physicalZones
            : { ...existing.physicalZones, ...physicalZones },
        checklist:
          data.checklist === undefined
            ? existing.checklist
            : { ...existing.checklist, ...checklist },
        completedAt,
        updatedAt: now,
      })
      .where(eq(flipIntakeInspections.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(flipIntakeInspections)
      .values({
        refurbishmentId: data.refurbishmentId,
        inspectedById: session.user.id,
        damageNotes: data.damageNotes || null,
        physicalZones,
        checklist,
        completedAt,
      })
      .returning();

    await addActivity({
      entityType: "refurbishment",
      entityId: data.refurbishmentId,
      type: "flip.intake_started",
      message: "Mottakskontroll startet",
      actorId: session.user.id,
    });
  }

  if (data.markCompleted && !existing?.completedAt) {
    await addActivity({
      entityType: "refurbishment",
      entityId: data.refurbishmentId,
      type: "flip.intake_completed",
      message: "Mottakskontroll utført",
      actorId: session.user.id,
    });
  } else if (existing) {
    await addActivity({
      entityType: "refurbishment",
      entityId: data.refurbishmentId,
      type: "flip.intake_updated",
      message: "Mottakskontroll oppdatert",
      actorId: session.user.id,
    });
  }

  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return row;
}
