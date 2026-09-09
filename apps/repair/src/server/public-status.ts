"use server";

import { and, asc, eq } from "drizzle-orm";
import {
  attachments,
  devices,
  repairNotes,
  repairTickets,
  users,
} from "@/db/schema";
import {
  buildCustomerProgress,
  customerStatusLabel,
} from "@/lib/customer-progress";
import { getDb } from "@/lib/db";
import { formatNokFromOre } from "@/lib/money";

function isHexToken(token: string) {
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Public, unauthenticated customer status payload.
 * Only returns explicitly customer-safe fields.
 */
export async function getPublicRepairByToken(token: string) {
  if (!token || !isHexToken(token)) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: repairTickets.id,
      ticketNumber: repairTickets.ticketNumber,
      status: repairTickets.status,
      customerProblem: repairTickets.customerProblem,
      internalProblem: repairTickets.internalProblem,
      customerPriceOre: repairTickets.customerPriceOre,
      estimatedCompletionDate: repairTickets.estimatedCompletionDate,
      createdAt: repairTickets.createdAt,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      deviceVariant: devices.variant,
      technicianName: users.name,
    })
    .from(repairTickets)
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .leftJoin(users, eq(users.id, repairTickets.assigneeId))
    .where(eq(repairTickets.publicAccessToken, token))
    .limit(1);

  if (!row) return null;

  const [updates, photos] = await Promise.all([
    db
      .select({
        id: repairNotes.id,
        content: repairNotes.content,
        createdAt: repairNotes.createdAt,
      })
      .from(repairNotes)
      .where(
        and(
          eq(repairNotes.ticketId, row.id),
          eq(repairNotes.visibility, "CUSTOMER"),
        ),
      )
      .orderBy(asc(repairNotes.createdAt)),
    db
      .select({
        id: attachments.id,
        description: attachments.description,
        category: attachments.category,
        mimeType: attachments.mimeType,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.entityType, "repair_ticket"),
          eq(attachments.entityId, row.id),
          eq(attachments.visibility, "CUSTOMER"),
        ),
      )
      .orderBy(asc(attachments.createdAt)),
  ]);

  const deviceLabel = [row.deviceBrand, row.deviceModel, row.deviceVariant]
    .filter(Boolean)
    .join(" ");

  return {
    ticketNumber: row.ticketNumber,
    deviceLabel,
    status: row.status,
    statusLabel: customerStatusLabel(row.status),
    progress: buildCustomerProgress(row.status),
    technicianName: row.technicianName || "Tekniker ikke tildelt",
    estimatedCompletionDate: row.estimatedCompletionDate,
    /** Intake list — internal only; not shown raw to customers. */
    intakeProblem: row.customerProblem,
    /** Technician-written text after diagnostics (customer-facing). */
    diagnosisText: row.internalProblem?.trim() || null,
    customerPriceLabel:
      row.customerPriceOre != null
        ? formatNokFromOre(row.customerPriceOre)
        : null,
    updates: updates.map((u) => ({
      id: u.id,
      content: u.content,
      createdAt: u.createdAt,
    })),
    photos: photos.map((p) => ({
      id: p.id,
      description: p.description,
      category: p.category,
      mimeType: p.mimeType,
      createdAt: p.createdAt,
      url: `/api/public/status/${token}/media/${p.id}`,
    })),
    createdAt: row.createdAt,
  };
}

/** Resolve a customer-visible attachment for streaming (token-gated). */
export async function getPublicAttachmentForToken(
  token: string,
  attachmentId: string,
) {
  if (!token || !isHexToken(token)) return null;
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) return null;

  const db = getDb();
  const [ticket] = await db
    .select({ id: repairTickets.id })
    .from(repairTickets)
    .where(eq(repairTickets.publicAccessToken, token))
    .limit(1);
  if (!ticket) return null;

  const [file] = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.entityType, "repair_ticket"),
        eq(attachments.entityId, ticket.id),
        eq(attachments.visibility, "CUSTOMER"),
      ),
    )
    .limit(1);

  return file ?? null;
}
