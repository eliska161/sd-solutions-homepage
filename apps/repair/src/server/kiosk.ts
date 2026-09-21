import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import {
  customers,
  devices,
  parts,
  repairNotes,
  repairParts,
  repairTickets,
  repairTicketStatusHistory,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { REPAIR_STATUS_LABELS } from "@/lib/labels";
import { WORKSHOP } from "@/lib/workshop";
import { isSendablePhone, toE164Phone } from "@/lib/phone";
import { allocatePublicShortCode } from "@/lib/public-link";
import { createPublicAccessToken } from "@/lib/public-token";
import { nextRepairTicketNumber } from "@/lib/sequences";
import { notifyDeviceReceived, notifyServiceOrderCreated } from "@/server/customer-mail";

const CLOSED = ["CANCELLED", "COMPLETED", "RETURNED"] as const;

export type KioskRepair = {
  id: string;
  device: string;
  status: string;
  phone?: string;
  issue?: string;
  parts?: string[];
  kind: "dropoff" | "pickup" | "other";
};

type TicketLookupRow = {
  ticketId: string;
  ticketNumber: string;
  model: string;
  storage: string | null;
  color: string | null;
  customerProblem: string;
  status: string;
  receivedAt: Date | null;
  phone: string;
};

const ticketSelect = {
  ticketId: repairTickets.id,
  ticketNumber: repairTickets.ticketNumber,
  model: devices.model,
  storage: devices.storage,
  color: devices.color,
  customerProblem: repairTickets.customerProblem,
  status: repairTickets.status,
  receivedAt: repairTickets.receivedAt,
  phone: customers.phone,
};

function deviceLine(row: { model: string; storage: string | null; color: string | null }) {
  return [row.model, row.storage, row.color]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

function partGrade(partType: string, brand: string | null) {
  const type = partType.toUpperCase();
  const b = (brand || "").toLowerCase();
  if (type === "OEM" || b.includes("service pack")) return "Original service pack";
  if (
    type === "ORIGINAL_PULL" ||
    b.includes("oem-pull") ||
    b.includes("oem pull") ||
    /\bpull\b/.test(b)
  ) {
    return "OEM Pull";
  }
  if (
    type === "SOFT_OLED" ||
    type === "HARD_OLED" ||
    type === "LCD" ||
    type === "INCELL" ||
    b.includes("aftermarket") ||
    b.includes("kompatibel")
  ) {
    return "Aftermarket";
  }
  return "";
}

function partLine(name: string, partType: string, brand: string | null) {
  const grade = partGrade(partType, brand);
  return grade ? `${name} (${grade})` : name;
}

function lastEight(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("47") && digits.length > 8) return digits.slice(-8);
  return digits.slice(-8);
}

function phoneWhere(raw: string) {
  const eight = lastEight(raw);
  const e164 = toE164Phone(raw) ?? toE164Phone(`+47${eight}`);
  return or(
    e164 ? eq(customers.phone, e164) : sql`false`,
    eq(customers.phone, eight),
    eq(customers.phone, `+47${eight}`),
    sql`right(regexp_replace(coalesce(${customers.phone}, ''), '[^0-9]', '', 'g'), 8) = ${eight}`,
    sql`regexp_replace(coalesce(${customers.phone}, ''), '[^0-9]', '', 'g') like ${"%" + eight}`,
  );
}

function mapRow(row: TicketLookupRow, partsOnTicket: string[]): KioskRepair {
  const pickup = row.status === "READY_FOR_PICKUP";
  const closed = CLOSED.includes(row.status as (typeof CLOSED)[number]);
  const dropoff = !pickup && !closed;
  return {
    id: row.ticketNumber,
    device: deviceLine(row),
    issue: row.customerProblem,
    parts: partsOnTicket,
    status: dropoff
      ? "Klar for innlevering"
      : pickup
        ? "Klar for henting"
        : REPAIR_STATUS_LABELS[row.status as keyof typeof REPAIR_STATUS_LABELS] ?? row.status,
    phone: lastEight(row.phone),
    kind: dropoff ? "dropoff" : pickup ? "pickup" : "other",
  };
}

async function withParts(rows: TicketLookupRow[]): Promise<KioskRepair[]> {
  const ids = rows.map((row) => row.ticketId);
  const partMap = new Map<string, string[]>();
  if (ids.length) {
    const db = getDb();
    const listed = await db
      .select({
        ticketId: repairParts.ticketId,
        name: parts.name,
        partType: parts.partType,
        brand: parts.brand,
      })
      .from(repairParts)
      .innerJoin(parts, eq(parts.id, repairParts.partId))
      .where(inArray(repairParts.ticketId, ids));
    for (const row of listed) {
      if (!row.ticketId) continue;
      const lines = partMap.get(row.ticketId) ?? [];
      lines.push(partLine(row.name, row.partType, row.brand));
      partMap.set(row.ticketId, lines);
    }
  }
  return rows.map((row) => mapRow(row, partMap.get(row.ticketId) ?? []));
}

function assertKioskSecret(request: Request) {
  const expected = process.env.KIOSK_API_SECRET?.trim();
  if (!expected) return;
  const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (got !== expected) {
    throw new Error("unauthorized");
  }
}

export function readKioskAuth(request: Request) {
  try {
    assertKioskSecret(request);
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 401 as const, error: "Ugyldig kiosk-nøkkel" };
  }
}

export async function lookupKioskDropoffs(phoneRaw: string): Promise<KioskRepair[]> {
  if (lastEight(phoneRaw).length !== 8) return [];
  const db = getDb();
  const rows = await db
    .select(ticketSelect)
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(
      and(
        phoneWhere(phoneRaw),
        sql`${repairTickets.status} not in ('CANCELLED', 'COMPLETED', 'RETURNED')`,
      ),
    )
    .orderBy(desc(repairTickets.updatedAt))
    .limit(20);
  return withParts(rows);
}

export async function kioskBoard() {
  const db = getDb();
  const dropoffRows = await db
    .select(ticketSelect)
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(sql`${repairTickets.status} not in ('CANCELLED', 'COMPLETED', 'RETURNED')`)
    .orderBy(desc(repairTickets.updatedAt))
    .limit(12);

  const pickupRows = await db
    .select(ticketSelect)
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(eq(repairTickets.status, "READY_FOR_PICKUP"))
    .orderBy(desc(repairTickets.updatedAt))
    .limit(12);

  return {
    dropoffs: await withParts(dropoffRows),
    pickups: await withParts(pickupRows),
  };
}

export async function createKioskLockerOrder(input: {
  phone: string;
  device: string;
  issue: string;
}): Promise<{ ok: true; repair: KioskRepair } | { ok: false; error: string }> {
  const phone = toE164Phone(input.phone);
  if (!phone || !isSendablePhone(phone)) {
    return { ok: false, error: "Ugyldig telefonnummer." };
  }
  const model = input.device.trim();
  const issue = input.issue.trim();
  if (model.length < 2 || issue.length < 2) {
    return { ok: false, error: "Velg modell og feil." };
  }

  const db = getDb();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .where(and(phoneWhere(input.phone), gte(repairTickets.createdAt, hourAgo)));
  if ((recent[0]?.n ?? 0) >= 4) {
    return { ok: false, error: "For mange ordrer på dette nummeret. Vent litt." };
  }

  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(phoneWhere(input.phone))
    .limit(1);

  let customerId = existing?.id;
  if (!customerId) {
    const [created] = await db
      .insert(customers)
      .values({
        name: "Locker-kunde",
        phone,
        email: "ukjent@sd-solutions.invalid",
        streetAddress: WORKSHOP.streetAddress,
        postalCode: WORKSHOP.postalCode,
        city: WORKSHOP.city,
        country: "Norge",
        address: `${WORKSHOP.streetAddress}, ${WORKSHOP.postalCode} ${WORKSHOP.city}`,
        notes: "Opprettet via locker-kiosk",
        lastActivityAt: new Date(),
      })
      .returning({ id: customers.id });
    customerId = created.id;
  } else {
    await db
      .update(customers)
      .set({ lastActivityAt: new Date(), phone })
      .where(eq(customers.id, customerId));
  }

  const [device] = await db
    .insert(devices)
    .values({
      brand: "Apple",
      model,
      ownershipType: "CUSTOMER",
      customerId,
    })
    .returning({ id: devices.id });

  const ticketNumber = await nextRepairTicketNumber();
  const publicAccessToken = createPublicAccessToken();
  const publicShortCode = await allocatePublicShortCode();

  const [ticket] = await db
    .insert(repairTickets)
    .values({
      ticketNumber,
      customerId,
      deviceId: device.id,
      customerProblem: issue,
      status: "NEW",
      publicAccessToken,
      publicShortCode,
      source: "CUSTOMER_PORTAL",
      inboundMethod: "IN_PERSON",
      outboundMethod: "IN_PERSON",
      receivedAt: null,
    })
    .returning({ id: repairTickets.id });

  await db.insert(repairTicketStatusHistory).values({
    ticketId: ticket.id,
    fromStatus: null,
    toStatus: "NEW",
    changedById: null,
    note: "Serviceordre opprettet i locker",
  });
  await db.insert(repairNotes).values({
    ticketId: ticket.id,
    content: `Opprettet i locker. Feil: ${issue}. Vilkår signeres når saken tas inn i verkstedet.`,
    visibility: "INTERNAL",
  });
  await writeAuditLog({
    actorId: null,
    entityType: "repair_ticket",
    entityId: ticket.id,
    action: "create_kiosk",
    after: { ticketNumber, source: "LOCKER" },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticket.id,
    type: "repair.created",
    message: `Locker-serviceordre ${ticketNumber} opprettet`,
    actorId: null,
  });
  await notifyServiceOrderCreated(ticket.id);

  return {
    ok: true,
    repair: {
      id: ticketNumber,
      device: model,
      issue,
      parts: [],
      status: "Klar for innlevering",
      phone: lastEight(input.phone),
      kind: "dropoff",
    },
  };
}

export async function receiveKioskTicket(ticketNumber: string) {
  const db = getDb();
  const [ticket] = await db
    .select({
      id: repairTickets.id,
      receivedAt: repairTickets.receivedAt,
    })
    .from(repairTickets)
    .where(eq(repairTickets.ticketNumber, ticketNumber.trim()))
    .limit(1);
  if (!ticket) return { ok: false as const, error: "Saken ble ikke funnet" };
  if (ticket.receivedAt) return { ok: true as const, already: true };

  await db
    .update(repairTickets)
    .set({ receivedAt: new Date(), updatedAt: new Date() })
    .where(eq(repairTickets.id, ticket.id));

  await writeAuditLog({
    actorId: null,
    entityType: "repair_ticket",
    entityId: ticket.id,
    action: "receive_kiosk",
    after: { receivedAt: true },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticket.id,
    type: "repair.received",
    message: "Enhet mottatt i locker",
    actorId: null,
  });
  await notifyDeviceReceived(ticket.id);
  return { ok: true as const, already: false };
}
