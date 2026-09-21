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
import { matchIphoneModel } from "@/lib/apple-models";
import { getDb } from "@/lib/db";
import { lookupImeiCatalog, normalizeImei } from "@/lib/imei-lookup";
import { REPAIR_STATUS_LABELS } from "@/lib/labels";
import { WORKSHOP } from "@/lib/workshop";
import { isSendablePhone, toE164Phone } from "@/lib/phone";
import { allocatePublicShortCode } from "@/lib/public-link";
import { createPublicAccessToken } from "@/lib/public-token";
import { nextRepairTicketNumber } from "@/lib/sequences";
import { publicStatusUrl } from "@/lib/mail";
import { parsePngDataUrl, renderSignedTermsPdf } from "@/lib/pdf/customer-document";
import { REPAIR_TERMS_VERSION } from "@/lib/repair-terms";
import { storeCustomerPdf } from "@/lib/store-customer-pdf";
import { notifyDeviceReceived, notifyServiceOrderCreated } from "@/server/customer-mail";

const CLOSED = ["CANCELLED", "COMPLETED", "RETURNED"] as const;

export type KioskRepair = {
  id: string;
  device: string;
  model?: string;
  storage?: string;
  color?: string;
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
  let name = (row.model || "").replace(/\s+/g, " ").trim();
  for (const extra of [row.storage, row.color]) {
    const bit = extra?.replace(/\s+/g, " ").trim();
    if (bit && !name.toLowerCase().includes(bit.toLowerCase())) {
      name = `${name} ${bit}`;
    }
  }
  return name;
}

function partGrade(partType: string, brand: string | null) {
  const type = partType.toUpperCase();
  const b = (brand || "").toLowerCase();
  if (type === "OEM" || b.includes("service pack")) return "Apple Service Pack";
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

function compactId(raw: string) {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function classifyQuery(raw: string): "empty" | "phone" | "imei" | "serial" {
  const compact = compactId(raw);
  const digits = raw.replace(/\D/g, "");
  if (!compact && !digits) return "empty";
  if (/^\d{8}$/.test(compact)) return "phone";
  if (digits.length === 10 && digits.startsWith("47")) return "phone";
  if (digits.length === 11 && digits.startsWith("47")) return "phone";
  if (digits.length === 14 || digits.length === 15) return "imei";
  if (compact.length >= 8) return "serial";
  return "empty";
}

function imeiWhere(raw: string) {
  const digits = normalizeImei(raw);
  return or(
    eq(devices.imei, digits),
    eq(devices.imei, raw.trim()),
    sql`regexp_replace(coalesce(${devices.imei}, ''), '[^0-9]', '', 'g') = ${digits}`,
  );
}

function serialWhere(raw: string) {
  const compact = compactId(raw);
  return or(
    sql`upper(regexp_replace(coalesce(${devices.serialNumber}, ''), '[^A-Za-z0-9]', '', 'g')) = ${compact}`,
    sql`upper(${repairTickets.ticketNumber}) = ${compact}`,
  );
}

function identifierWhere(raw: string) {
  const kind = classifyQuery(raw);
  if (kind === "phone") return phoneWhere(raw);
  if (kind === "imei") return imeiWhere(raw);
  if (kind === "serial") return serialWhere(raw);
  return sql`false`;
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
    model: row.model,
    storage: row.storage ?? undefined,
    color: row.color ?? undefined,
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

export async function lookupKioskDropoffs(queryRaw: string): Promise<KioskRepair[]> {
  if (classifyQuery(queryRaw) === "empty") return [];
  const db = getDb();
  const rows = await db
    .select(ticketSelect)
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(
      and(
        identifierWhere(queryRaw),
        sql`${repairTickets.status} not in ('CANCELLED', 'COMPLETED', 'RETURNED')`,
      ),
    )
    .orderBy(desc(repairTickets.updatedAt))
    .limit(20);
  return withParts(rows);
}

export async function lookupKioskPickup(pinRaw: string): Promise<KioskRepair | null> {
  const pin = pinRaw.replace(/\D/g, "");
  if (pin.length !== 6 || pin === "999999") return null;
  const db = getDb();
  const rows = await db
    .select(ticketSelect)
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(and(eq(repairTickets.pickupPin, pin), eq(repairTickets.status, "READY_FOR_PICKUP")))
    .orderBy(desc(repairTickets.updatedAt))
    .limit(1);
  const mapped = await withParts(rows);
  return mapped[0] ?? null;
}

export type KioskDeviceLookup = {
  model: string | null;
  imei: string | null;
  serialNumber: string | null;
  note: string;
};

export async function lookupKioskDevice(queryRaw: string): Promise<KioskDeviceLookup> {
  const empty: KioskDeviceLookup = {
    model: null,
    imei: null,
    serialNumber: null,
    note: "Skriv IMEI eller serienummer.",
  };
  const q = queryRaw.trim();
  if (classifyQuery(q) === "empty") return empty;

  const digits = normalizeImei(q);
  const compact = compactId(q);
  const db = getDb();
  const [existing] = await db
    .select({
      model: devices.model,
      storage: devices.storage,
      color: devices.color,
      imei: devices.imei,
      serialNumber: devices.serialNumber,
    })
    .from(devices)
    .where(
      or(
        digits.length >= 14 ? imeiWhere(q) : sql`false`,
        compact.length >= 8
          ? sql`upper(regexp_replace(coalesce(${devices.serialNumber}, ''), '[^A-Za-z0-9]', '', 'g')) = ${compact}`
          : sql`false`,
      ),
    )
    .limit(1);

  if (existing?.model) {
    return {
      model: deviceLine(existing),
      imei: existing.imei,
      serialNumber: existing.serialNumber,
      note: `Fant ${deviceLine(existing)} i registeret.`,
    };
  }

  const catalog = digits.length >= 8 ? lookupImeiCatalog(digits) : null;
  if (catalog?.model) {
    const matched = matchIphoneModel(catalog.model);
    const model = matched?.name ?? catalog.model;
    return {
      model,
      imei: catalog.imei.length >= 14 ? catalog.imei : digits.length >= 14 ? digits : null,
      serialNumber: digits.length >= 14 ? null : compact,
      note: `Fant ${model}.`,
    };
  }

  return {
    model: null,
    imei: digits.length >= 14 ? digits : null,
    serialNumber: digits.length >= 14 ? null : compact,
    note: "Fant ikke modell. Fyll inn manuelt.",
  };
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
  comment?: string;
  imei?: string;
  serialNumber?: string;
  termsAccepted?: boolean;
  termsVersion?: string;
  signaturePng?: string;
  termsSignerName?: string;
}): Promise<{ ok: true; repair: KioskRepair } | { ok: false; error: string }> {
  const phone = toE164Phone(input.phone);
  if (!phone || !isSendablePhone(phone)) {
    return { ok: false, error: "Ugyldig telefonnummer." };
  }
  const model = input.device.trim();
  const issue = input.issue.trim();
  const comment = (input.comment ?? "").trim();
  if (model.length < 2 || issue.length < 2) {
    return { ok: false, error: "Velg modell og feil." };
  }
  const imeiDigits = input.imei ? normalizeImei(input.imei) : "";
  const imei = imeiDigits.length >= 14 ? imeiDigits : null;
  const serialNumber = input.serialNumber?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || null;
  if (!imei && !serialNumber) {
    return { ok: false, error: "Oppgi IMEI eller serienummer." };
  }
  const problem = comment ? `${issue}. ${comment}` : issue;
  if (input.termsAccepted !== true) {
    return { ok: false, error: "Du må godta vilkårene." };
  }
  if (input.termsVersion && input.termsVersion !== REPAIR_TERMS_VERSION) {
    return { ok: false, error: "Vilkårene er oppdatert. Les og signer på nytt." };
  }
  const signaturePng = parsePngDataUrl(input.signaturePng || "");
  if (!signaturePng) {
    return { ok: false, error: "Signer på skjermen før ordren opprettes." };
  }
  const signerName = (input.termsSignerName || "Kunde").trim() || "Kunde";
  const signedAt = new Date();

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

  const [knownDevice] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(
      or(
        imei ? imeiWhere(imei) : sql`false`,
        serialNumber
          ? sql`upper(regexp_replace(coalesce(${devices.serialNumber}, ''), '[^A-Za-z0-9]', '', 'g')) = ${serialNumber}`
          : sql`false`,
      ),
    )
    .limit(1);

  let deviceId = knownDevice?.id;
  if (!deviceId) {
    const [createdDevice] = await db
      .insert(devices)
      .values({
        brand: "Apple",
        model,
        imei,
        serialNumber,
        ownershipType: "CUSTOMER",
        customerId,
      })
      .returning({ id: devices.id });
    deviceId = createdDevice.id;
  } else {
    await db
      .update(devices)
      .set({
        model,
        imei: imei || undefined,
        serialNumber: serialNumber || undefined,
        customerId,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId));
  }

  const ticketNumber = await nextRepairTicketNumber();
  const publicAccessToken = createPublicAccessToken();
  const publicShortCode = await allocatePublicShortCode();

  const [ticket] = await db
    .insert(repairTickets)
    .values({
      ticketNumber,
      customerId,
      deviceId,
      customerProblem: problem,
      status: "NEW",
      publicAccessToken,
      publicShortCode,
      source: "CUSTOMER_PORTAL",
      inboundMethod: "IN_PERSON",
      outboundMethod: "IN_PERSON",
      receivedAt: null,
      termsVersion: REPAIR_TERMS_VERSION,
      termsSignedAt: signedAt,
      termsSignerName: signerName,
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
    content: `Opprettet i locker og signert. Feil: ${issue}.${comment ? ` Kommentar: ${comment}` : ""} ${imei ? `IMEI: ${imei}.` : ""} ${serialNumber ? `SN: ${serialNumber}.` : ""}`,
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

  try {
    const pdf = await renderSignedTermsPdf({
      order: {
        ticketNumber,
        customerName: signerName,
        customerEmail: "",
        customerPhone: phone,
        customerAddress: `${WORKSHOP.streetAddress}, ${WORKSHOP.postalCode} ${WORKSHOP.city}`,
        deviceLabel: model,
        serialNumber,
        imei,
        problem,
        inboundLabel: "Leveres i locker",
        outboundLabel: "Hentes i butikk",
        statusUrl: publicStatusUrl(publicShortCode),
      },
      signature: {
        signerName,
        signedAt,
        png: signaturePng,
      },
    });
    await storeCustomerPdf({
      ticketId: ticket.id,
      category: "TERMS",
      fileName: `ordrebekreftelse-${ticketNumber}.pdf`,
      description: "Ordrebekreftelse og signerte vilkår (locker)",
      buffer: pdf,
    });
  } catch (err) {
    console.error("==> Locker signert PDF feilet", err);
  }

  return {
    ok: true,
    repair: {
      id: ticketNumber,
      device: model,
      model,
      issue: problem,
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

export async function completeKioskTicket(ticketNumber: string) {
  const db = getDb();
  const [ticket] = await db
    .select({
      id: repairTickets.id,
      status: repairTickets.status,
      completedAt: repairTickets.completedAt,
      publicAccessToken: repairTickets.publicAccessToken,
      publicShortCode: repairTickets.publicShortCode,
    })
    .from(repairTickets)
    .where(eq(repairTickets.ticketNumber, ticketNumber.trim()))
    .limit(1);
  if (!ticket) return { ok: false as const, error: "Saken ble ikke funnet" };
  if (ticket.status === "COMPLETED" || ticket.completedAt) {
    return { ok: true as const, already: true };
  }
  if (ticket.status !== "READY_FOR_PICKUP") {
    return { ok: false as const, error: "Saken er ikke klar for henting" };
  }

  const completedAt = new Date();
  await db
    .update(repairTickets)
    .set({
      status: "COMPLETED",
      completedAt,
      updatedAt: completedAt,
    })
    .where(eq(repairTickets.id, ticket.id));

  await db.insert(repairTicketStatusHistory).values({
    ticketId: ticket.id,
    fromStatus: ticket.status,
    toStatus: "COMPLETED",
    changedById: null,
    note: "Hentet i locker",
  });
  await writeAuditLog({
    actorId: null,
    entityType: "repair_ticket",
    entityId: ticket.id,
    action: "complete_kiosk",
    after: { status: "COMPLETED", completedAt: true },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticket.id,
    type: "repair.status",
    message: "Status: READY_FOR_PICKUP → COMPLETED",
    actorId: null,
    meta: { from: "READY_FOR_PICKUP", to: "COMPLETED", source: "kiosk" },
  });
  return { ok: true as const, already: false };
}
