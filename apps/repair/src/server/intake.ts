"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repairIntakeInspections } from "@/db/schema";
import {
  INTAKE_CHECKLIST,
  INTAKE_PHYSICAL_ZONES,
} from "@/lib/intake-catalog";
import { addActivity } from "@/lib/activity";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getRepair } from "@/server/repairs";

const checkResultSchema = z.enum([
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
]);

const upsertIntakeSchema = z.object({
  ticketId: z.string().uuid(),
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

export async function getIntakeInspection(ticketId: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(repairIntakeInspections)
    .where(eq(repairIntakeInspections.ticketId, ticketId))
    .orderBy(desc(repairIntakeInspections.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function upsertIntakeInspection(
  input: z.infer<typeof upsertIntakeSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = upsertIntakeSchema.parse(input);

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const zoneKeys = new Set(INTAKE_PHYSICAL_ZONES.map((z) => z.key));
  const checkKeys = new Set(INTAKE_CHECKLIST.map((c) => c.key));

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
    if (checkKeys.has(key as (typeof INTAKE_CHECKLIST)[number]["key"])) {
      checklist[key] = {
        result: value.result,
        ...(value.note ? { note: value.note } : {}),
      };
    }
  }

  const db = getDb();
  const existing = await getIntakeInspection(data.ticketId);
  const now = new Date();
  const completedAt = data.markCompleted
    ? now
    : (existing?.completedAt ?? null);

  let row;
  if (existing) {
    [row] = await db
      .update(repairIntakeInspections)
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
      .where(eq(repairIntakeInspections.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(repairIntakeInspections)
      .values({
        ticketId: data.ticketId,
        inspectedById: session.user.id,
        damageNotes: data.damageNotes || null,
        physicalZones,
        checklist,
        completedAt,
      })
      .returning();

    await addActivity({
      entityType: "repair_ticket",
      entityId: data.ticketId,
      type: "repair.intake_started",
      message: "Mottakskontroll startet",
      actorId: session.user.id,
    });
  }

  if (data.markCompleted && !existing?.completedAt) {
    await addActivity({
      entityType: "repair_ticket",
      entityId: data.ticketId,
      type: "repair.intake_completed",
      message: "Mottakskontroll utført",
      actorId: session.user.id,
    });
  } else if (existing) {
    await addActivity({
      entityType: "repair_ticket",
      entityId: data.ticketId,
      type: "repair.intake_updated",
      message: "Mottakskontroll oppdatert",
      actorId: session.user.id,
    });
  }

  revalidatePath(`/repairs/${data.ticketId}`);
  return row;
}
