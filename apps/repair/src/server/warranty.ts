"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { warranties, warrantyClaims } from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getRepair } from "@/server/repairs";

const claimStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "APPROVED",
  "REJECTED",
  "RESOLVED",
  "CLOSED",
]);

export async function createWarrantyForRepair(
  ticketId: string,
  opts?: { days?: number; notes?: string },
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const ticket = await getRepair(ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const days = opts?.days ?? ticket.warrantyDays ?? 90;
  const startsAt = ticket.completedAt ?? new Date();
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + days);

  const [row] = await db
    .insert(warranties)
    .values({
      ticketId,
      startsAt,
      endsAt,
      days,
      notes: opts?.notes || null,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "warranty",
    entityId: row.id,
    action: "create",
    after: row,
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "warranty.created",
    message: `Garanti ${days} dager opprettet`,
    actorId: session.user.id,
  });

  revalidatePath("/warranty");
  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

export async function listClaims(status?: z.infer<typeof claimStatusSchema>) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(warrantyClaims)
    .where(status ? eq(warrantyClaims.status, status) : undefined)
    .orderBy(desc(warrantyClaims.createdAt));
}

export async function getWarrantyForTicket(ticketId: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(warranties)
    .where(eq(warranties.ticketId, ticketId))
    .limit(1);
  return row ?? null;
}

export async function createClaim(input: {
  warrantyId: string;
  description: string;
  ticketId?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      warrantyId: z.string().uuid(),
      description: z.string().min(1),
      ticketId: z.string().uuid().optional().nullable(),
    })
    .parse(input);
  const db = getDb();

  const [warranty] = await db
    .select()
    .from(warranties)
    .where(eq(warranties.id, data.warrantyId))
    .limit(1);
  if (!warranty) throw new Error("Garanti ikke funnet");

  const [row] = await db
    .insert(warrantyClaims)
    .values({
      warrantyId: data.warrantyId,
      ticketId: data.ticketId || warranty.ticketId,
      description: data.description,
      status: "OPEN",
      createdById: session.user.id,
    })
    .returning();

  await addActivity({
    entityType: "warranty_claim",
    entityId: row.id,
    type: "warranty.claim_created",
    message: "Garantikrav opprettet",
    actorId: session.user.id,
  });

  revalidatePath("/warranty");
  return row;
}

export async function updateClaimStatus(
  claimId: string,
  status: z.infer<typeof claimStatusSchema>,
  resolution?: string,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const next = claimStatusSchema.parse(status);
  const db = getDb();

  const [before] = await db
    .select()
    .from(warrantyClaims)
    .where(eq(warrantyClaims.id, claimId))
    .limit(1);
  if (!before) throw new Error("Krav ikke funnet");

  const [row] = await db
    .update(warrantyClaims)
    .set({
      status: next,
      resolution: resolution ?? before.resolution,
      updatedAt: new Date(),
    })
    .where(eq(warrantyClaims.id, claimId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "warranty_claim",
    entityId: claimId,
    action: "status_change",
    before,
    after: row,
  });

  revalidatePath("/warranty");
  return row;
}
