"use server";

import { and, asc, eq } from "drizzle-orm";
import {
  attachments,
  customers,
  devices,
  parts,
  repairNotes,
  repairParts,
  repairServices,
  repairTickets,
  services,
  users,
} from "@/db/schema";
import {
  buildCustomerProgress,
  customerStatusLabel,
} from "@/lib/customer-progress";
import { getDb } from "@/lib/db";
import { formatDropoffAppointment } from "@/lib/dropoff";
import { formatNokFromOre } from "@/lib/money";
import { publicTicketLinkFilter } from "@/lib/public-link";

/**
 * Public, unauthenticated customer status payload.
 * Only returns explicitly customer-safe fields.
 */
export async function getPublicRepairByToken(token: string) {
  const filter = publicTicketLinkFilter(token);
  if (!filter) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: repairTickets.id,
      ticketNumber: repairTickets.ticketNumber,
      status: repairTickets.status,
      customerProblem: repairTickets.customerProblem,
      internalProblem: repairTickets.internalProblem,
      customerPriceOre: repairTickets.customerPriceOre,
      discountOre: repairTickets.discountOre,
      discountLabel: repairTickets.discountLabel,
      estimatedCompletionDate: repairTickets.estimatedCompletionDate,
      createdAt: repairTickets.createdAt,
      receivedAt: repairTickets.receivedAt,
      inboundMethod: repairTickets.inboundMethod,
      outboundMethod: repairTickets.outboundMethod,
      dropoffOn: repairTickets.dropoffOn,
      dropoffSlot: repairTickets.dropoffSlot,
      inboundPostageOre: repairTickets.inboundPostageOre,
      outboundPostageOre: repairTickets.outboundPostageOre,
      returnTrackingNumber: repairTickets.returnTrackingNumber,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      deviceVariant: devices.variant,
      technicianName: users.name,
    })
    .from(repairTickets)
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .leftJoin(users, eq(users.id, repairTickets.assigneeId))
    .where(filter)
    .limit(1);

  if (!row) return null;

  const [updates, photos, ticketParts, ticketServices] = await Promise.all([
    db
      .select({
        id: repairNotes.id,
        content: repairNotes.content,
        createdAt: repairNotes.createdAt,
        authorName: repairNotes.authorName,
        authorKind: repairNotes.authorKind,
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
    db
      .select({
        id: repairParts.id,
        quantity: repairParts.quantity,
        status: repairParts.status,
        partName: parts.name,
      })
      .from(repairParts)
      .leftJoin(parts, eq(parts.id, repairParts.partId))
      .where(eq(repairParts.ticketId, row.id))
      .orderBy(asc(repairParts.createdAt)),
    db
      .select({
        id: repairServices.id,
        serviceName: services.name,
      })
      .from(repairServices)
      .leftJoin(services, eq(services.id, repairServices.serviceId))
      .where(eq(repairServices.ticketId, row.id))
      .orderBy(asc(repairServices.createdAt)),
  ]);

  const deviceLabel = [row.deviceBrand, row.deviceModel, row.deviceVariant]
    .filter(Boolean)
    .join(" ");

  return {
    ticketNumber: row.ticketNumber,
    deviceLabel,
    status: row.status,
    statusLabel:
      !row.receivedAt && row.status === "NEW"
        ? "Venter innlevering"
        : customerStatusLabel(row.status),
    progress: buildCustomerProgress(row.status, {
      received: Boolean(row.receivedAt),
      outboundPost: row.outboundMethod === "POST",
    }),
    technicianName: row.technicianName || "Tekniker ikke tildelt",
    estimatedCompletionDate: row.estimatedCompletionDate,
    /** Intake list — internal only; not shown raw to customers. */
    intakeProblem: row.customerProblem,
    /** Technician-written text after diagnostics (customer-facing). */
    diagnosisText: row.internalProblem?.trim() || null,
    /** Service total after discount — never part cost prices. */
    customerPriceLabel:
      row.customerPriceOre != null
        ? formatNokFromOre(row.customerPriceOre)
        : null,
    discount:
      (row.discountOre ?? 0) > 0
        ? {
            label: row.discountLabel?.trim() || "Rabatt",
            amountLabel: formatNokFromOre(row.discountOre),
          }
        : null,
    services: ticketServices
      .map((s) => ({
        id: s.id,
        name: s.serviceName?.trim() || "Tjeneste",
      }))
      .filter((s) => s.name),
    /** Parts in the job — names/qty only, no unit costs. */
    parts: ticketParts
      .filter((p) => p.status !== "CANCELLED")
      .map((p) => ({
        id: p.id,
        name: p.partName?.trim() || "Del",
        quantity: p.quantity,
        status:
          p.status === "ORDERED"
            ? ("ordered" as const)
            : p.status === "RECEIVED"
              ? ("received" as const)
              : ("used" as const),
      })),
    updates: updates.map((u) => ({
      id: u.id,
      content: u.content,
      createdAt: u.createdAt,
      authorName: u.authorName?.trim() || (u.authorKind === "CUSTOMER" ? "Kunde" : "Verksted"),
      authorKind: u.authorKind === "CUSTOMER" ? ("customer" as const) : ("staff" as const),
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
    received: Boolean(row.receivedAt),
    inboundMethod: row.inboundMethod,
    outboundMethod: row.outboundMethod,
    dropoffLabel:
      row.inboundMethod === "IN_PERSON" && row.dropoffOn && row.dropoffSlot
        ? formatDropoffAppointment(row.dropoffOn, row.dropoffSlot)
        : null,
    inboundPostageLabel:
      row.inboundPostageOre > 0
        ? formatNokFromOre(row.inboundPostageOre)
        : null,
    outboundPostageLabel:
      row.outboundPostageOre > 0
        ? formatNokFromOre(row.outboundPostageOre)
        : null,
    returnTrackingNumber: row.returnTrackingNumber?.trim() || null,
  };
}

/** Resolve a customer-visible attachment for streaming (token-gated). */
export async function getPublicAttachmentForToken(
  token: string,
  attachmentId: string,
) {
  const filter = publicTicketLinkFilter(token);
  if (!filter) return null;
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) return null;

  const db = getDb();
  const [ticket] = await db
    .select({ id: repairTickets.id })
    .from(repairTickets)
    .where(filter)
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

export async function addPublicRepairUpdate(token: string, content: string) {
  const filter = publicTicketLinkFilter(token);
  if (!filter) {
    return { ok: false as const, error: "Ugyldig lenke" };
  }
  const text = content.trim();
  if (text.length < 2) {
    return { ok: false as const, error: "Skriv en melding først" };
  }
  if (text.length > 2000) {
    return { ok: false as const, error: "Meldingen er for lang" };
  }

  const db = getDb();
  const [ticket] = await db
    .select({
      id: repairTickets.id,
      customerId: repairTickets.customerId,
    })
    .from(repairTickets)
    .where(filter)
    .limit(1);
  if (!ticket) return { ok: false as const, error: "Saken ble ikke funnet" };

  const [customer] = await db
    .select({ name: customers.name })
    .from(customers)
    .where(eq(customers.id, ticket.customerId))
    .limit(1);

  await db.insert(repairNotes).values({
    ticketId: ticket.id,
    authorId: null,
    authorName: customer?.name?.trim() || "Kunde",
    authorKind: "CUSTOMER",
    content: text,
    visibility: "CUSTOMER",
  });

  return { ok: true as const };
}
