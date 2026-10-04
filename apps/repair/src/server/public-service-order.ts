"use server";

import { and, eq, gte, ilike, or, sql } from "drizzle-orm";
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
import { matchIphoneModel } from "@/lib/apple-models";
import { matchRepairModel } from "@/lib/repair-prices";
import { getDb } from "@/lib/db";
import { lookupImeiCatalog, normalizeImei } from "@/lib/imei-lookup";
import { krToOre, CUSTOMER_POSTAGE_ORE } from "@/lib/money";
import {
  describePublicJob,
  quotePublicPart,
} from "@/lib/part-grades";
import { publicStatusUrl } from "@/lib/mail";
import { parsePngDataUrl, renderSignedTermsPdf } from "@/lib/pdf/customer-document";
import { countryNameFromPhone, isSendablePhone, toE164Phone } from "@/lib/phone";
import { allocatePublicShortCode, publicTicketLinkFilter } from "@/lib/public-link";
import { createPublicAccessToken } from "@/lib/public-token";
import { REPAIR_TERMS_VERSION } from "@/lib/repair-terms";
import { nextRepairTicketNumber } from "@/lib/sequences";
import { storeCustomerPdf } from "@/lib/store-customer-pdf";
import { notifyServiceOrderCreated } from "@/server/customer-mail";
import { isCustomerVatCharged } from "@/server/settings";
import { estimatedCompletionAt, formatOsloDateLabel, nextDayOffer } from "@/lib/next-day";

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
    customerProblem: z.string().trim().optional().default(""),
    jobType: z.enum(["screen", "battery", "other"]),
    partGrade: z.enum(["copy", "oem_pull", "original"]).optional().nullable(),
    batteryHealth: z.enum(["99_100"]).optional().nullable(),
    inboundMethod: deliverySchema,
    outboundMethod: deliverySchema,
    termsVersion: z.string().min(1),
    termsAccepted: z
      .boolean()
      .refine((value) => value === true, "Du må godta betingelsene"),
    termsSignerName: z.string().trim().min(2, "Skriv navnet ditt"),
    signaturePng: z.string().min(80, "Signer i feltet"),
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
    if (val.jobType === "other" && (val.customerProblem || "").trim().length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["customerProblem"],
        message: "Beskriv feilen med minst noen setninger",
      });
    }
    if (val.jobType !== "other" && !val.partGrade) {
      ctx.addIssue({
        code: "custom",
        path: ["partGrade"],
        message: "Velg deltype",
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
  countryName: string;
}) {
  return [
    input.streetAddress,
    `${input.postalCode} ${input.city}`.trim(),
    input.countryName,
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

export type PublicDeviceLookup = {
  model: string | null;
  colorOptions: string[];
  storageOptions: string[];
  imei: string | null;
  serialNumber: string | null;
  note: string;
};

function compactSerial(raw: string) {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function emptyLookup(note = ""): PublicDeviceLookup {
  return {
    model: null,
    colorOptions: [],
    storageOptions: [],
    imei: null,
    serialNumber: null,
    note,
  };
}

function uniqueOptions(preferred: string | null | undefined, rest: string[]) {
  const first = preferred?.trim();
  const extras = rest.filter((value) => value && value !== first);
  return first ? [first, ...extras] : extras;
}

function fromCatalog(catalog: NonNullable<ReturnType<typeof lookupImeiCatalog>>) {
  if (!catalog.brand || !catalog.model) return null;
  const matched = matchIphoneModel(catalog.model);
  const model =
    matched?.name ??
    (/^iphone\b/i.test(catalog.model) ? catalog.model : null);
  const colorOptions =
    catalog.colorOptions.length > 0
      ? catalog.colorOptions
      : (matched?.colors ?? []);
  const storageOptions =
    catalog.storageOptions.length > 0
      ? catalog.storageOptions
      : (matched?.storages ?? []);
  const note = model
    ? `Fant ${model}. Velg farge og lagring hvis det mangler.`
    : `Oppslag fant ${catalog.brand} ${catalog.model}. Velg iPhone-modell under.`;
  return {
    model,
    colorOptions,
    storageOptions,
    imei: catalog.imei.length >= 14 ? catalog.imei : null,
    serialNumber: null as string | null,
    note,
  };
}

async function lookupStoredHardware(opts: {
  imeiDigits: string;
  serialCompact: string;
}) {
  const clauses = [];
  if (opts.imeiDigits.length >= 14) {
    clauses.push(
      sql`regexp_replace(coalesce(${devices.imei}, ''), '[^0-9]', '', 'g') = ${opts.imeiDigits}`,
    );
  }
  if (opts.serialCompact.length >= 8) {
    clauses.push(
      sql`upper(regexp_replace(coalesce(${devices.serialNumber}, ''), '[^A-Za-z0-9]', '', 'g')) = ${opts.serialCompact}`,
    );
  }
  if (clauses.length === 0) return null;

  const db = getDb();
  const [row] = await db
    .select({
      model: devices.model,
      color: devices.color,
      storage: devices.storage,
      imei: devices.imei,
      serialNumber: devices.serialNumber,
    })
    .from(devices)
    .where(or(...clauses))
    .limit(1);
  return row ?? null;
}

/**
 * Public service-order lookup: TAC for IMEI, known serial/IMEI in our device
 * register for hardware fields only (no customer names).
 */
export async function lookupPublicDevice(input: {
  imei?: string;
  serialNumber?: string;
}): Promise<PublicDeviceLookup> {
  const imeiRaw = input.imei?.trim() ?? "";
  const serialRaw = input.serialNumber?.trim() ?? "";
  const imeiDigits = normalizeImei(imeiRaw);
  const serialCompact = compactSerial(serialRaw);

  if (imeiDigits.length < 8 && serialCompact.length < 8) {
    return emptyLookup("Skriv IMEI eller serienummer først.");
  }

  if (imeiDigits.length >= 8) {
    const catalog = lookupImeiCatalog(imeiDigits);
    const mapped = catalog ? fromCatalog(catalog) : null;
    if (mapped) {
      return {
        ...mapped,
        serialNumber: serialCompact.length >= 8 ? serialRaw.trim() : null,
      };
    }
  }

  const stored = await lookupStoredHardware({
    imeiDigits,
    serialCompact,
  });
  if (stored?.model) {
    const matched = matchIphoneModel(stored.model);
    const model = matched?.name ?? stored.model;
    const viaSerial =
      serialCompact.length >= 8 &&
      compactSerial(stored.serialNumber || "") === serialCompact;
    return {
      model,
      colorOptions: uniqueOptions(stored.color, matched?.colors ?? []),
      storageOptions: uniqueOptions(stored.storage, matched?.storages ?? []),
      imei: stored.imei,
      serialNumber: stored.serialNumber,
      note: viaSerial
        ? `Fant ${model} fra serienummer.`
        : `Fant ${model} fra IMEI i registeret.`,
    };
  }

  if (imeiDigits.length >= 8) {
    return {
      ...emptyLookup(
        "Fant ikke modell fra IMEI. Sjekk at det er 15 siffer, eller velg modell under.",
      ),
      imei: imeiDigits.length >= 14 ? imeiDigits : null,
    };
  }

  return emptyLookup(
    "Fant ikke modell fra serienummeret. Velg modell under, eller fyll inn IMEI (15 siffer).",
  );
}

export async function lookupPublicImeiOrSerial(
  query: string,
): Promise<PublicDeviceLookup> {
  const q = query.trim();
  const digits = normalizeImei(q);
  if (digits.length === 14 || digits.length === 15) {
    return lookupPublicDevice({ imei: q });
  }
  return lookupPublicDevice({
    imei: digits.length >= 8 ? q : undefined,
    serialNumber: q,
  });
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
  if (data.termsVersion !== REPAIR_TERMS_VERSION || !data.termsAccepted) {
    return {
      ok: false,
      error: "Betingelsene er oppdatert. Les og signer på nytt.",
    };
  }
  const signaturePng = parsePngDataUrl(data.signaturePng);
  if (!signaturePng) {
    return { ok: false, error: "Signaturen er ugyldig. Signer på nytt." };
  }

  const phone = toE164Phone(data.phone);
  if (!phone || !isSendablePhone(phone)) {
    return {
      ok: false,
      error: "Ugyldig telefonnummer.",
    };
  }
  const countryName = countryNameFromPhone(phone);

  let imei: string | null = null;
  try {
    imei = cleanImei(data.imei);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ugyldig IMEI",
    };
  }

  const inboundPostageOre = 0;
  const outboundPostageOre =
    data.outboundMethod === "POST" ? CUSTOMER_POSTAGE_ORE : 0;
  const knownIphone = Boolean(
    matchIphoneModel(data.model) || matchRepairModel(data.model),
  );
  const nextDayJob =
    knownIphone &&
    (data.jobType === "screen" || data.jobType === "battery");
  const quote =
    nextDayJob && data.partGrade
      ? quotePublicPart({
          deviceLabel: data.model,
          jobType: data.jobType,
          partGrade: data.partGrade,
        })
      : null;
  const batteryHealth =
    data.jobType === "battery" && data.partGrade === "oem_pull"
      ? "99_100"
      : null;
  const customerProblem = describePublicJob({
    jobType: data.jobType,
    partGrade: data.partGrade,
    batteryHealth,
    comment: data.customerProblem,
  });
  const eta =
    nextDayJob && data.inboundMethod === "IN_PERSON"
      ? estimatedCompletionAt()
      : null;
  const etaOffer = eta ? nextDayOffer() : null;

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
        phone,
        email,
        streetAddress: data.streetAddress,
        postalCode: data.postalCode,
        city: data.city,
        country: countryName,
        address: composeAddress({
          ...data,
          countryName,
        }),
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
        phone,
        streetAddress: data.streetAddress,
        postalCode: data.postalCode,
        city: data.city,
        country: countryName,
        address: composeAddress({
          ...data,
          countryName,
        }),
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

  const ticketNumber = await nextRepairTicketNumber();
  const publicAccessToken = createPublicAccessToken();
  const publicShortCode = await allocatePublicShortCode();

  const [ticket] = await db
    .insert(repairTickets)
    .values({
      ticketNumber,
      customerId,
      deviceId: device.id,
      customerProblem,
      status: "NEW",
      publicAccessToken,
      publicShortCode,
      source: "CUSTOMER_PORTAL",
      inboundMethod: data.inboundMethod,
      outboundMethod: data.outboundMethod,
      inboundPostageOre,
      outboundPostageOre,
      otherCostsOre: outboundPostageOre,
      customerPriceOre: quote ? krToOre(quote.priceKr) : null,
      estimatedPartsCostOre: quote?.partsCostOre ?? null,
      receivedAt: null,
      estimatedCompletionDate: eta,
      termsVersion: data.termsVersion,
      termsSignedAt: new Date(),
      termsSignerName: data.termsSignerName,
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
        : etaOffer
          ? `Kunden leverer enheten fysisk. Skjerm/batteri ferdig ${formatOsloDateLabel(etaOffer.readyOn)} hvis deltype er valgt og enheten leveres innen kl. 12 den dagen. Helg telles ikke. Valg: ${quote?.label ?? "—"}. Estimert ${quote?.priceLabel ?? "—"}.`
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

  const signedAt = ticket.termsSignedAt ?? new Date();
  const deviceLabel = [data.brand, data.model, data.storage, data.color]
    .filter(Boolean)
    .join(" ");
  try {
    const pdf = await renderSignedTermsPdf({
      chargeVat: await isCustomerVatCharged(),
      order: {
        ticketNumber,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: phone,
        customerAddress: composeAddress({
          streetAddress: data.streetAddress,
          postalCode: data.postalCode,
          city: data.city,
          countryName,
        }),
        deviceLabel,
        serialNumber: data.serialNumber?.trim() || null,
        imei,
        problem: customerProblem,
        inboundLabel:
          data.inboundMethod === "POST" ? "Send selv" : "Leveres i butikk",
        outboundLabel:
          data.outboundMethod === "POST" ? "Sendes tilbake" : "Hentes i butikk",
        statusUrl: publicStatusUrl(publicShortCode),
      },
      signature: {
        signerName: data.termsSignerName,
        signedAt,
        png: signaturePng,
      },
    });
    await storeCustomerPdf({
      ticketId: ticket.id,
      category: "TERMS",
      fileName: `ordrebekreftelse-${ticketNumber}.pdf`,
      description: "Ordrebekreftelse og signerte vilkår",
      buffer: pdf,
    });
  } catch (err) {
    console.error("==> Signert betingelses-PDF feilet", err);
  }

  await notifyServiceOrderCreated(ticket.id);

  return {
    ok: true,
    ticketNumber,
    token: publicAccessToken,
    inboundPostageOre,
    outboundPostageOre,
  };
}

export async function getPublicDropoffContext(token: string) {
  const filter = publicTicketLinkFilter(token);
  if (!filter) return null;
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
    .where(filter)
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
  const filter = publicTicketLinkFilter(parsed.data.token);
  if (!filter) {
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
    .where(filter)
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
