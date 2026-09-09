"use server";

import { ilike, or, sql } from "drizzle-orm";
import {
  customers,
  devices,
  parts,
  refurbishments,
  repairTickets,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function globalSearch(query: string) {
  await requireSession();
  const q = query.trim();
  if (q.length < 2) {
    return {
      customers: [],
      tickets: [],
      devices: [],
      parts: [],
      flips: [],
    };
  }

  const pattern = `%${q}%`;
  const db = getDb();

  const [customerRows, ticketRows, deviceRows, partRows, flipRows] =
    await Promise.all([
      db
        .select()
        .from(customers)
        .where(
          or(
            ilike(customers.name, pattern),
            ilike(customers.email, pattern),
            ilike(customers.phone, pattern),
          ),
        )
        .limit(10),
      db
        .select()
        .from(repairTickets)
        .where(
          or(
            ilike(repairTickets.ticketNumber, pattern),
            ilike(repairTickets.customerProblem, pattern),
          ),
        )
        .limit(10),
      db
        .select()
        .from(devices)
        .where(
          or(
            ilike(devices.model, pattern),
            ilike(devices.imei, pattern),
            ilike(devices.serialNumber, pattern),
          ),
        )
        .limit(10),
      db
        .select()
        .from(parts)
        .where(or(ilike(parts.sku, pattern), ilike(parts.name, pattern)))
        .limit(10),
      db
        .select()
        .from(refurbishments)
        .where(
          or(
            ilike(refurbishments.flipNumber, pattern),
            ilike(refurbishments.model, pattern),
            ilike(refurbishments.imei, pattern),
            sql`${refurbishments.notes} ilike ${pattern}`,
          ),
        )
        .limit(10),
    ]);

  return {
    customers: customerRows,
    tickets: ticketRows,
    devices: deviceRows,
    parts: partRows,
    flips: flipRows,
  };
}
