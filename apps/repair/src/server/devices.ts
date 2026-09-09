"use server";

import { desc, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { devices, repairTickets } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const deviceInputSchema = z.object({
  brand: z.string().min(1).default("Apple"),
  model: z.string().min(1, "Modell er påkrevd"),
  variant: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  imei: z.string().optional().nullable(),
  batteryHealth: z.number().int().min(0).max(100).optional().nullable(),
  condition: z.string().optional().nullable(),
  ownershipType: z.enum(["CUSTOMER", "SD_SOLUTIONS", "UNKNOWN"]).default("CUSTOMER"),
  customerId: z.string().uuid().optional().nullable(),
});

export async function listDevices(query?: string) {
  await requireSession();
  const db = getDb();
  const q = query?.trim();

  return db
    .select()
    .from(devices)
    .where(
      q
        ? or(
            ilike(devices.model, `%${q}%`),
            ilike(devices.imei, `%${q}%`),
            ilike(devices.serialNumber, `%${q}%`),
            ilike(devices.brand, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(desc(devices.createdAt));
}

export async function getDevice(id: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  return row ?? null;
}

/** Lookup existing device by IMEI or serial (exact, trimmed). */
export async function lookupDeviceByImeiOrSerial(query: string) {
  await requireSession();
  const q = query.trim();
  if (q.length < 5) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(devices)
    .where(or(eq(devices.imei, q), eq(devices.serialNumber, q)))
    .limit(1);
  return row ?? null;
}

export async function getDeviceHistory(deviceId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(repairTickets)
    .where(eq(repairTickets.deviceId, deviceId))
    .orderBy(desc(repairTickets.createdAt));
}

export async function createDevice(input: z.infer<typeof deviceInputSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = deviceInputSchema.parse(input);
  const db = getDb();

  const [row] = await db
    .insert(devices)
    .values({
      brand: data.brand,
      model: data.model,
      variant: data.variant || null,
      storage: data.storage || null,
      color: data.color || null,
      serialNumber: data.serialNumber || null,
      imei: data.imei || null,
      batteryHealth: data.batteryHealth ?? null,
      condition: data.condition || null,
      ownershipType: data.ownershipType,
      customerId: data.customerId || null,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "device",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/devices");
  return row;
}

export async function updateDevice(
  id: string,
  input: Partial<z.infer<typeof deviceInputSchema>>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = deviceInputSchema.partial().parse(input);
  const db = getDb();

  const before = await getDevice(id);
  if (!before) throw new Error("Enhet ikke funnet");

  const [row] = await db
    .update(devices)
    .set({
      ...data,
      variant: data.variant === undefined ? undefined : data.variant || null,
      storage: data.storage === undefined ? undefined : data.storage || null,
      color: data.color === undefined ? undefined : data.color || null,
      serialNumber:
        data.serialNumber === undefined ? undefined : data.serialNumber || null,
      imei: data.imei === undefined ? undefined : data.imei || null,
      condition: data.condition === undefined ? undefined : data.condition || null,
      customerId: data.customerId === undefined ? undefined : data.customerId || null,
      updatedAt: new Date(),
    })
    .where(eq(devices.id, id))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "device",
    entityId: id,
    action: "update",
    before,
    after: row,
  });

  revalidatePath("/devices");
  return row;
}
