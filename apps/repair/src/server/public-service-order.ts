"use server";

import { and, eq, gte, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import {
  customers,
  devices,
  repairNotes,
  repairTicketStatusHistory,
  repairTickets,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { formatDropoffAppointment, isDropoffSlotOpen } from "@/lib/dropoff";
import { getDb } from "@/lib/db";
import { normalizeImei } from "@/lib/imei-lookup";
import { CUSTOMER_POSTAGE_ORE } from "@/lib/money";
import { createPublicAccessToken } from "@/lib/public-token";
import { nextPublicId } from "@/lib/sequences";
import { notifyServiceOrderCreated } from "@/server/customer-mail";

const deliverySchema = z.enum(["IN_PERSON", "POST"]);

const publicOrderSchema = z
  .object({
    honeypot: z.string().optional(),
    name: z.string().trim().min(2, "Navn er påkrevd"),
    phone: z.string().trim().min(5, "Telefonnummer er påkrevd"),
    email: z.string().trim().email("Ugyldig e-post"),
    streetAddress: z.string().trim().min(2, "Gateadresse er påkrevd"),
    postalCode: z.string().trim().min(2, "Postnummer er påkrevd"),
    city: z.string().trim().min(2, "Sted er påkrevd"),
    brand: z.string().trim().min(1).default("Apple"),
    model: z.string().trim().min(2, "Modell er påkrevd"),
    storage: z.string().trim().optional().nullable(),
    color: z.string().trim().optional().nullable(),
    serialNumber: z.string().trim().optional().nullable(),
    imei: z.string().trim().optional().nullable(),
    customerProblem: z
      .string()
      .trim()
      .min(8, "Beskriv feilen med minst noen setninger"),
    inboundMethod: deliverySchema,
    outboundMethod: deliverySchema,
  })
  .superRefine((val, ctx) => {
    const serial = val.serialNumber?.trim();
    const imei = val.imei?.trim();
    if (!serial && !imei) {
      ctx.addIssue({
        code: "custom",
        path: ["imei"],
        message: "Oppgi serienummer eller IMEI — ett av dem er nok",
      });
    }
  });

export type PublicServiceOrderResult =
  | {
      ok: true;
      ticketNumber: string;
      token: string;
      inboundPostageOre: number;
      outboundPostageOre: number;
    }
  | { ok: false; error: string };

function composeAddress(input: {
  streetAddress: string;
  postalCode: string;
  city: string;
}) {
  return [
    input.streetAddress,
    `${input.postalCode} ${input.city}`.trim(),
    "Norge",
  ]
    .filter(Boolean)
    .join(", ");
}

function cleanImei(raw: string | null | undefined) {
  if (!raw?.trim()) return null;
  const digits = normalizeImei(raw);
  if (digits && digits.length !== 15) {
    throw new Error("IMEI må være 15 siffer");
  }
  return digits || raw.trim();
}

export async function createPublicServiceOrder(
  input: unknown,
): Promise<PublicServiceOrderResult> {
  const parsed = publicOrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Ugyldig skjema" };
  }
  const data = parsed.data;
  if (data.honeypot) {
    return { ok: false, error: "Kunne ikke opprette ordre." };
  }

  let imei: string | null = null;
  try {
    imei = cleanImei(data.imei);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ugyldig IMEI",
    };
  }

  const inboundPostageOre =
    data.inboundMethod === "POST" ? CUSTOMER_POSTAGE_ORE : 0;
  const outboundPostageOre =
    data.outboundMethod === "POST" ? CUSTOMER_POSTAGE_ORE : 0;
  const postageOre = inboundPostageOre + outboundPostageOre;

  const db = getDb();
  const email = data.email.toLowerCase();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recent = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .where(
      and(
        ilike(customers.email, email),
        gte(repairTickets.createdAt, hourAgo),
        eq(repairTickets.source, "CUSTOMER_PORTAL"),
      ),
    );
  if ((recent[0]?.n ?? 0) >= 3) {
    return {
      ok: false,
      error: "For mange ordrer på kort tid. Vent litt og prøv igjen.",
    };
  }

  const [existingCustomer] = await db
    .select()
    .from(customers)
    .where(ilike(customers.email, email))
    .limit(1);

  let customerId = existingCustomer?.id;
  if (!customerId) {
    const [created] = await db
      .insert(customers)
      .values({
        name: data.name,
        phone: data.phone,
        email,
        streetAddress: data.streetAddress,
        postalCode: data.postalCode,
        city: data.city,
        country: "Norge",
        address: composeAddress(data),
        notes: "Opprettet via kundeserviceordre på nettsiden",
        lastActivityAt: new Date(),
      })
      .returning({ id: customers.id });
    customerId = created.id;
  } else {
    await db
      .update(customers)
      .set({
        name: data.name,
        phone: data.phone,
        streetAddress: data.streetAddress,
        postalCode: data.postalCode,
        city: data.city,
        country: "Norge",
        address: composeAddress(data),
        lastActivityAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  }

  const [device] = await db
    .insert(devices)
    .values({
      brand: data.brand || "Apple",
      model: data.model,
      storage: data.storage || null,
      color: data.color || null,
      serialNumber: data.serialNumber || null,
      imei,
      ownershipType: "CUSTOMER",
      customerId,
    })
    .returning({ id: devices.id });

  const ticketNumber = await nextPublicId("REP");
  const publicAccessToken = createPublicAccessToken();

  const [ticket] = await db
    .insert(repairTickets)
    .values({
      ticketNumber,
      customerId,
      deviceId: device.id,
      customerProblem: data.customerProblem,
      status: "NEW",
      publicAccessToken,
      source: "CUSTOMER_PORTAL",
      inboundMethod: data.inboundMethod,
      outboundMethod: data.outboundMethod,
      inboundPostageOre,
      outboundPostageOre,
      otherCostsOre: postageOre,
      receivedAt: null,
    })
    .returning();

  await db.insert(repairTicketStatusHistory).values({
    ticketId: ticket.id,
    fromStatus: null,
    toStatus: "NEW",
    changedById: null,
    note: "Serviceordre opprettet av kunde",
  });

  await db.insert(repairNotes).values({
    ticketId: ticket.id,
    content:
      data.inboundMethod === "POST"
        ? "Kunden sender enheten med post. Marker som mottatt når pakken kommer inn."
        : "Kunden leverer enheten fysisk. Marker som mottatt når den er tatt inn i skranken.",
    visibility: "INTERNAL",
  });

  await writeAuditLog({
    actorId: null,
    entityType: "repair_ticket",
    entityId: ticket.id,
    action: "create_public",
    after: { ticketNumber, source: "CUSTOMER_PORTAL" },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticket.id,
    type: "repair.created",
    message: `Kundeserviceordre ${ticketNumber} opprettet`,
    actorId: null,
  });

  notifyServiceOrderCreated(ticket.id);

  return {
    ok: true,
    ticketNumber,
    token: publicAccessToken,
    inboundPostageOre,
    outboundPostageOre,
  };
}

function isHexToken(token: string) {
  return /^[a-f0-9]{64}$/i.test(token);
}

export async function getPublicDropoffContext(token: string) {
  if (!token || !isHexToken(token)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      ticketNumber: repairTickets.ticketNumber,
      inboundMethod: repairTickets.inboundMethod,
      receivedAt: repairTickets.receivedAt,
      dropoffOn: repairTickets.dropoffOn,
      dropoffSlot: repairTickets.dropoffSlot,
    })
    .from(repairTickets)
    .where(eq(repairTickets.publicAccessToken, token))
    .limit(1);
  if (!row) return null;
  return {
    ticketNumber: row.ticketNumber,
    inboundMethod: row.inboundMethod,
    received: Boolean(row.receivedAt),
    dropoffOn: row.dropoffOn,
    dropoffSlot: row.dropoffSlot,
    dropoffLabel:
      row.dropoffOn && row.dropoffSlot
        ? formatDropoffAppointment(row.dropoffOn, row.dropoffSlot)
        : null,
  };
}

const dropoffSchema = z.object({
  token: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string(),
});

export async function savePublicDropoffAppointment(input: {
  token: string;
  date: string;
  slot: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = dropoffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Velg dato og timeslot" };
  }
  if (!isHexToken(parsed.data.token)) {
    return { ok: false, error: "Ugyldig lenke" };
  }
  if (!isDropoffSlotOpen(parsed.data.date, parsed.data.slot)) {
    return {
      ok: false,
      error: "Timesloten er ikke ledig. Velg en annen dag eller tid.",
    };
  }

  const db = getDb();
  const [ticket] = await db
    .select({
      id: repairTickets.id,
      inboundMethod: repairTickets.inboundMethod,
      receivedAt: repairTickets.receivedAt,
    })
    .from(repairTickets)
    .where(eq(repairTickets.publicAccessToken, parsed.data.token))
    .limit(1);
  if (!ticket) return { ok: false, error: "Saken ble ikke funnet" };
  if (ticket.inboundMethod !== "IN_PERSON") {
    return { ok: false, error: "Denne saken sendes med post" };
  }
  if (ticket.receivedAt) {
    return { ok: false, error: "Enheten er allerede mottatt" };
  }

  await db
    .update(repairTickets)
    .set({
      dropoffOn: parsed.data.date,
      dropoffSlot: parsed.data.slot,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticket.id));

  await db.insert(repairNotes).values({
    ticketId: ticket.id,
    authorId: null,
    authorName: "Kunde",
    authorKind: "CUSTOMER",
    content: `Innlevering avtalt: ${formatDropoffAppointment(parsed.data.date, parsed.data.slot)}`,
    visibility: "INTERNAL",
  });

  return { ok: true };
}
