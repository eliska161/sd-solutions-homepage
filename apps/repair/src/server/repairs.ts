"use server";

import { unlink } from "fs/promises";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  activityEvents,
  attachments,
  customers,
  inventoryTransactions,
  parts,
  repairNotes,
  repairParts,
  repairServices,
  repairTicketStatusHistory,
  repairTickets,
  services,
  users,
  warrantyClaims,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { createPublicAccessToken } from "@/lib/public-token";
import { nextPublicId } from "@/lib/sequences";
import { requireSession } from "@/lib/session";
import { resolveUploadAbsolutePath } from "@/lib/uploads";
import { notifyDeviceReceived, notifyReadyForPickup, notifyRepairCompleted, notifyStaffUpdate, notifyWaitingForCustomer } from "@/server/customer-mail";

const repairStatusSchema = z.enum([
  "NEW",
  "DIAGNOSTICS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_PART",
  "APPROVED",
  "IN_REPAIR",
  "TESTING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
]);

const createRepairSchema = z.object({
  customerId: z.string().uuid(),
  deviceId: z.string().uuid(),
  customerProblem: z.string().min(1, "Problembeskrivelse er påkrevd"),
  physicalCondition: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

const noteSchema = z.object({
  ticketId: z.string().uuid(),
  content: z.string().min(1),
  visibility: z.enum(["INTERNAL", "CUSTOMER"]).default("INTERNAL"),
});

export type RepairListFilters = {
  status?: z.infer<typeof repairStatusSchema>;
  customerId?: string;
  assigneeId?: string;
  query?: string;
  pendingReceive?: boolean;
};

export async function listRepairs(filters: RepairListFilters = {}) {
  await requireSession();
  const db = getDb();

  const conditions = [];
  if (filters.status) conditions.push(eq(repairTickets.status, filters.status));
  if (filters.customerId)
    conditions.push(eq(repairTickets.customerId, filters.customerId));
  if (filters.assigneeId)
    conditions.push(eq(repairTickets.assigneeId, filters.assigneeId));
  if (filters.pendingReceive) {
    conditions.push(sql`${repairTickets.receivedAt} is null`);
  }

  return db
    .select({
      id: repairTickets.id,
      ticketNumber: repairTickets.ticketNumber,
      customerId: repairTickets.customerId,
      deviceId: repairTickets.deviceId,
      customerProblem: repairTickets.customerProblem,
      status: repairTickets.status,
      assigneeId: repairTickets.assigneeId,
      assigneeName: users.name,
      estimatedCompletionDate: repairTickets.estimatedCompletionDate,
      customerPriceOre: repairTickets.customerPriceOre,
      paymentStatus: repairTickets.paymentStatus,
      source: repairTickets.source,
      inboundMethod: repairTickets.inboundMethod,
      outboundMethod: repairTickets.outboundMethod,
      receivedAt: repairTickets.receivedAt,
      createdAt: repairTickets.createdAt,
      updatedAt: repairTickets.updatedAt,
      completedAt: repairTickets.completedAt,
    })
    .from(repairTickets)
    .leftJoin(users, eq(users.id, repairTickets.assigneeId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(repairTickets.createdAt));
}

export async function getRepair(ticketId: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  return row ?? null;
}

export async function getRepairAssigneeName(assigneeId: string | null) {
  if (!assigneeId) return null;
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1);
  return row?.name ?? null;
}

export async function createRepair(input: z.infer<typeof createRepairSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = createRepairSchema.parse(input);
  const db = getDb();

  const ticketNumber = await nextPublicId("REP");
  const assigneeId = data.assigneeId || session.user.id;

  const [row] = await db
    .insert(repairTickets)
    .values({
      ticketNumber,
      customerId: data.customerId,
      deviceId: data.deviceId,
      customerProblem: data.customerProblem,
      physicalCondition: data.physicalCondition || null,
      assigneeId,
      publicAccessToken: createPublicAccessToken(),
      status: "NEW",
      source: "STAFF",
      receivedAt: new Date(),
    })
    .returning();

  await db.insert(repairTicketStatusHistory).values({
    ticketId: row.id,
    fromStatus: null,
    toStatus: "NEW",
    changedById: session.user.id,
    note: "Ticket opprettet",
  });

  await db
    .update(customers)
    .set({ lastActivityAt: new Date() })
    .where(eq(customers.id, data.customerId));

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "repair_ticket",
    entityId: row.id,
    action: "create",
    after: row,
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: row.id,
    type: "repair.created",
    message: `Reparasjon ${ticketNumber} opprettet`,
    actorId: session.user.id,
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: row.id,
    type: "repair.received",
    message: "Enhet mottatt",
    actorId: session.user.id,
  });

  if (assigneeId) {
    const [tech] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, assigneeId))
      .limit(1);
    await addActivity({
      entityType: "repair_ticket",
      entityId: row.id,
      type: "repair.assignee",
      message: `Tekniker ${tech?.name ?? "ukjent"} tildelt`,
      actorId: session.user.id,
    });
  }

  revalidatePath("/repairs");
  revalidatePath("/dashboard");
  notifyDeviceReceived(row.id);
  return row;
}

export async function markRepairReceived(ticketId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (!ticket) throw new Error("Ticket ikke funnet");
  if (ticket.receivedAt) return ticket;

  const [row] = await db
    .update(repairTickets)
    .set({ receivedAt: new Date(), updatedAt: new Date() })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "repair_ticket",
    entityId: ticketId,
    action: "receive",
    before: { receivedAt: ticket.receivedAt },
    after: { receivedAt: row.receivedAt },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "repair.received",
    message: "Enhet mottatt",
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/repairs");
  revalidatePath("/dashboard");
  notifyDeviceReceived(ticketId);
  return row;
}

export async function updateRepairAssignee(
  ticketId: string,
  assigneeId: string | null,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();
  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  let technicianName: string | null = null;
  if (assigneeId) {
    const [tech] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, assigneeId))
      .limit(1);
    if (!tech) throw new Error("Tekniker ikke funnet");
    technicianName = tech.name;
  }

  const [row] = await db
    .update(repairTickets)
    .set({
      assigneeId: assigneeId || null,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "repair.assignee",
    message: technicianName
      ? `Tekniker ${technicianName} tildelt`
      : "Tekniker fjernet",
    actorId: session.user.id,
    meta: { assigneeId },
  });

  revalidatePath("/repairs");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  return row;
}

export async function updateEstimatedCompletionDate(
  ticketId: string,
  dateIso: string | null,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();
  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  const nextDate = dateIso ? new Date(`${dateIso}T12:00:00`) : null;
  if (dateIso && Number.isNaN(nextDate?.getTime())) {
    throw new Error("Ugyldig dato");
  }

  const [row] = await db
    .update(repairTickets)
    .set({
      estimatedCompletionDate: nextDate,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  const label = nextDate
    ? nextDate.toLocaleDateString("nb-NO", { dateStyle: "short" })
    : null;

  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "repair.eta",
    message: label
      ? `Estimert ferdigdato satt til ${label}`
      : "Estimert ferdigdato fjernet",
    actorId: session.user.id,
    meta: {
      from: before.estimatedCompletionDate,
      to: nextDate,
    },
  });

  revalidatePath("/repairs");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  return row;
}

export async function ensurePublicAccessToken(ticketId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const ticket = await getRepair(ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");
  if (ticket.publicAccessToken) return ticket;

  const db = getDb();
  const [row] = await db
    .update(repairTickets)
    .set({
      publicAccessToken: createPublicAccessToken(),
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();
  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

/** Customer-facing diagnosis text shown on /s/[token] after diagnostics. */
export async function updateCustomerDiagnosis(
  ticketId: string,
  diagnosis: string,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const text = diagnosis.trim();
  if (!text) throw new Error("Skriv en kundevendt problembeskrivelse");

  const db = getDb();
  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  const [row] = await db
    .update(repairTickets)
    .set({
      internalProblem: text,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "repair.diagnosis",
    message: "Kundevendt problembeskrivelse oppdatert etter diagnostikk",
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

export async function updateRepairStatus(
  ticketId: string,
  status: z.infer<typeof repairStatusSchema>,
  options?: { note?: string; returnTrackingNumber?: string },
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const nextStatus = repairStatusSchema.parse(status);
  const db = getDb();

  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  const tracking =
    options?.returnTrackingNumber !== undefined
      ? options.returnTrackingNumber.trim() || null
      : undefined;

  const [row] = await db
    .update(repairTickets)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
      completedAt:
        nextStatus === "COMPLETED" ? new Date() : before.completedAt,
      ...(tracking !== undefined ? { returnTrackingNumber: tracking } : {}),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  await db.insert(repairTicketStatusHistory).values({
    ticketId,
    fromStatus: before.status,
    toStatus: nextStatus,
    changedById: session.user.id,
    note: options?.note || null,
  });

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "repair_ticket",
    entityId: ticketId,
    action: "status_change",
    before,
    after: row,
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "repair.status",
    message: `Status: ${before.status} → ${nextStatus}`,
    actorId: session.user.id,
    meta: { from: before.status, to: nextStatus },
  });

  revalidatePath("/repairs");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  if (row.publicAccessToken) {
    revalidatePath(`/s/${row.publicAccessToken}`);
  }

  if (before.status !== nextStatus) {
    if (nextStatus === "WAITING_FOR_CUSTOMER") {
      notifyWaitingForCustomer(ticketId);
    } else if (nextStatus === "READY_FOR_PICKUP") {
      notifyReadyForPickup(ticketId);
    } else if (nextStatus === "COMPLETED") {
      notifyRepairCompleted(ticketId);
    }
  }

  return row;
}

export async function updateReturnTracking(
  ticketId: string,
  trackingNumber: string,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();
  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  const next = trackingNumber.trim() || null;
  if ((before.returnTrackingNumber?.trim() || null) === next) {
    return before;
  }

  const [row] = await db
    .update(repairTickets)
    .set({
      returnTrackingNumber: next,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "repair_ticket",
    entityId: ticketId,
    action: "return_tracking",
    before: { returnTrackingNumber: before.returnTrackingNumber },
    after: { returnTrackingNumber: row.returnTrackingNumber },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "repair.tracking",
    message: next
      ? `Sporingsnummer retur: ${next}`
      : "Sporingsnummer retur fjernet",
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${ticketId}`);
  if (row.publicAccessToken) {
    revalidatePath(`/s/${row.publicAccessToken}`);
  }

  if (
    next &&
    row.outboundMethod === "POST" &&
    (row.status === "READY_FOR_PICKUP" || row.status === "COMPLETED")
  ) {
    notifyReadyForPickup(ticketId);
  }

  return row;
}

export async function addRepairNote(input: z.infer<typeof noteSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = noteSchema.parse(input);
  const db = getDb();

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const [row] = await db
    .insert(repairNotes)
    .values({
      ticketId: data.ticketId,
      authorId: session.user.id,
      authorName: session.user.name,
      authorKind: "STAFF",
      content: data.content,
      visibility: data.visibility,
    })
    .returning();

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.note",
    message: "Notat lagt til",
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${data.ticketId}`);
  if (data.visibility === "CUSTOMER") {
    notifyStaffUpdate(data.ticketId, data.content);
  }
  return row;
}

export async function listRepairNotes(ticketId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(repairNotes)
    .where(eq(repairNotes.ticketId, ticketId))
    .orderBy(desc(repairNotes.createdAt));
}

export async function listRepairStatusHistory(ticketId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(repairTicketStatusHistory)
    .where(eq(repairTicketStatusHistory.ticketId, ticketId))
    .orderBy(desc(repairTicketStatusHistory.createdAt));
}

export async function listRepairParts(ticketId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select({
      id: repairParts.id,
      ticketId: repairParts.ticketId,
      partId: repairParts.partId,
      quantity: repairParts.quantity,
      unitCostOre: repairParts.unitCostOre,
      status: repairParts.status,
      notes: repairParts.notes,
      createdAt: repairParts.createdAt,
      partName: parts.name,
      partSku: parts.sku,
    })
    .from(repairParts)
    .leftJoin(parts, eq(parts.id, repairParts.partId))
    .where(eq(repairParts.ticketId, ticketId))
    .orderBy(desc(repairParts.createdAt));
}

export async function listRepairServices(ticketId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select({
      id: repairServices.id,
      ticketId: repairServices.ticketId,
      serviceId: repairServices.serviceId,
      priceOre: repairServices.priceOre,
      createdAt: repairServices.createdAt,
      serviceName: services.name,
      serviceCode: services.code,
    })
    .from(repairServices)
    .leftJoin(services, eq(services.id, repairServices.serviceId))
    .where(eq(repairServices.ticketId, ticketId))
    .orderBy(desc(repairServices.createdAt));
}

export async function addServiceToRepair(input: {
  ticketId: string;
  serviceId: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      ticketId: z.string().uuid(),
      serviceId: z.string().uuid(),
    })
    .parse(input);
  const db = getDb();

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, data.serviceId))
    .limit(1);
  if (!service) throw new Error("Tjeneste ikke funnet");

  const [row] = await db
    .insert(repairServices)
    .values({
      ticketId: data.ticketId,
      serviceId: data.serviceId,
      priceOre: service.customerPriceOre,
    })
    .returning();

  await syncCustomerPriceFromServices(data.ticketId);

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.service_added",
    message: `Tjeneste lagt til: ${service.name}`,
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${data.ticketId}`);
  return row;
}

/** Sum services minus discount → customerPriceOre. */
async function syncCustomerPriceFromServices(ticketId: string) {
  const db = getDb();
  const [ticket] = await db
    .select({
      discountOre: repairTickets.discountOre,
    })
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);

  const lines = await db
    .select()
    .from(repairServices)
    .where(eq(repairServices.ticketId, ticketId));

  const servicesTotal = lines.reduce((s, r) => s + r.priceOre, 0);
  const discount = Math.max(0, ticket?.discountOre ?? 0);
  const customerPriceOre =
    lines.length === 0 && discount === 0
      ? null
      : Math.max(0, servicesTotal - discount);

  await db
    .update(repairTickets)
    .set({
      customerPriceOre,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId));
}

export async function setRepairDiscount(input: {
  ticketId: string;
  discountOre: number;
  label?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      ticketId: z.string().uuid(),
      discountOre: z.number().int().positive(),
      label: z.string().max(200).optional().nullable(),
    })
    .parse(input);
  const db = getDb();

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  await db
    .update(repairTickets)
    .set({
      discountOre: data.discountOre,
      discountLabel: data.label?.trim() || "Rabatt",
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, data.ticketId));

  await syncCustomerPriceFromServices(data.ticketId);

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.discount_set",
    message: `Rabatt: ${Math.round(data.discountOre / 100)} kr`,
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${data.ticketId}`);
  return { ok: true };
}

export async function clearRepairDiscount(ticketId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const id = z.string().uuid().parse(ticketId);
  const db = getDb();

  const ticket = await getRepair(id);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  await db
    .update(repairTickets)
    .set({
      discountOre: 0,
      discountLabel: null,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, id));

  await syncCustomerPriceFromServices(id);

  await addActivity({
    entityType: "repair_ticket",
    entityId: id,
    type: "repair.discount_cleared",
    message: "Rabatt fjernet",
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${id}`);
  return { ok: true };
}

export async function removeServiceFromRepair(input: {
  ticketId: string;
  repairServiceId: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      ticketId: z.string().uuid(),
      repairServiceId: z.string().uuid(),
    })
    .parse(input);
  const db = getDb();

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const [existing] = await db
    .select({
      id: repairServices.id,
      serviceName: services.name,
    })
    .from(repairServices)
    .leftJoin(services, eq(services.id, repairServices.serviceId))
    .where(
      and(
        eq(repairServices.id, data.repairServiceId),
        eq(repairServices.ticketId, data.ticketId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Tjeneste ikke funnet på ticket");

  await db
    .delete(repairServices)
    .where(eq(repairServices.id, data.repairServiceId));

  await syncCustomerPriceFromServices(data.ticketId);

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.service_removed",
    message: `Tjeneste fjernet: ${existing.serviceName ?? "ukjent"}`,
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${data.ticketId}`);
  return { ok: true };
}

export async function removeRepairNote(input: {
  ticketId: string;
  noteId: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      ticketId: z.string().uuid(),
      noteId: z.string().uuid(),
    })
    .parse(input);
  const db = getDb();

  const [existing] = await db
    .select({ id: repairNotes.id })
    .from(repairNotes)
    .where(
      and(
        eq(repairNotes.id, data.noteId),
        eq(repairNotes.ticketId, data.ticketId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Notat ikke funnet");

  await db.delete(repairNotes).where(eq(repairNotes.id, data.noteId));

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.note_removed",
    message: "Notat fjernet",
    actorId: session.user.id,
  });

  revalidatePath(`/repairs/${data.ticketId}`);
  return { ok: true };
}

export async function updateRepairPricing(
  ticketId: string,
  input: {
    customerPriceOre?: number | null;
    otherCostsOre?: number;
  },
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();
  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  const [row] = await db
    .update(repairTickets)
    .set({
      customerPriceOre:
        input.customerPriceOre === undefined
          ? before.customerPriceOre
          : input.customerPriceOre,
      otherCostsOre:
        input.otherCostsOre === undefined
          ? before.otherCostsOre
          : input.otherCostsOre,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

export async function deleteRepair(ticketId: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const id = z.string().uuid().parse(ticketId);
  const ticket = await getRepair(id);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const db = getDb();
  const files = await db
    .select({
      id: attachments.id,
      storagePath: attachments.storagePath,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.entityType, "repair_ticket"),
        eq(attachments.entityId, id),
      ),
    );

  if (files.length > 0) {
    await db
      .delete(attachments)
      .where(
        and(
          eq(attachments.entityType, "repair_ticket"),
          eq(attachments.entityId, id),
        ),
      );
    await Promise.all(
      files.map(async (file) => {
        const abs = resolveUploadAbsolutePath(file.storagePath);
        if (abs) await unlink(abs).catch(() => undefined);
      }),
    );
  }

  await db
    .update(inventoryTransactions)
    .set({ repairTicketId: null })
    .where(eq(inventoryTransactions.repairTicketId, id));
  await db
    .update(warrantyClaims)
    .set({ ticketId: null })
    .where(eq(warrantyClaims.ticketId, id));
  await db
    .delete(activityEvents)
    .where(
      and(
        eq(activityEvents.entityType, "repair_ticket"),
        eq(activityEvents.entityId, id),
      ),
    );

  await db.delete(repairTickets).where(eq(repairTickets.id, id));

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "repair_ticket",
    entityId: id,
    action: "delete",
    before: {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    },
  });

  revalidatePath("/repairs");
  revalidatePath(`/customers/${ticket.customerId}`);
  revalidatePath(`/devices/${ticket.deviceId}`);
  redirect("/repairs");
}
