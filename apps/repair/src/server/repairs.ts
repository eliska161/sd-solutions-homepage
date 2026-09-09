"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  customers,
  parts,
  repairNotes,
  repairParts,
  repairServices,
  repairTicketStatusHistory,
  repairTickets,
  services,
  users,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { createPublicAccessToken } from "@/lib/public-token";
import { nextPublicId } from "@/lib/sequences";
import { requireSession } from "@/lib/session";

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
  note?: string,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const nextStatus = repairStatusSchema.parse(status);
  const db = getDb();

  const before = await getRepair(ticketId);
  if (!before) throw new Error("Reparasjon ikke funnet");

  const [row] = await db
    .update(repairTickets)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
      completedAt:
        nextStatus === "COMPLETED" ? new Date() : before.completedAt,
    })
    .where(eq(repairTickets.id, ticketId))
    .returning();

  await db.insert(repairTicketStatusHistory).values({
    ticketId,
    fromStatus: before.status,
    toStatus: nextStatus,
    changedById: session.user.id,
    note: note || null,
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

  const existingServices = await db
    .select()
    .from(repairServices)
    .where(eq(repairServices.ticketId, data.ticketId));
  const servicesTotal = existingServices.reduce((s, r) => s + r.priceOre, 0);

  await db
    .update(repairTickets)
    .set({
      customerPriceOre: servicesTotal,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, data.ticketId));

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
