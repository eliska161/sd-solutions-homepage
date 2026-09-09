"use server";

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { customers, repairTickets } from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const customerInputSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  phone: z.string().optional().nullable(),
  email: z
    .union([z.string().email("Ugyldig e-post"), z.literal(""), z.null()])
    .optional(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function listCustomers(query?: string) {
  await requireSession();
  const db = getDb();
  const q = query?.trim();

  const rows = await db
    .select()
    .from(customers)
    .where(
      and(
        isNull(customers.archivedAt),
        q
          ? or(
              ilike(customers.name, `%${q}%`),
              ilike(customers.email, `%${q}%`),
              ilike(customers.phone, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(customers.createdAt));

  return rows;
}

export async function getCustomer(id: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCustomer(input: z.infer<typeof customerInputSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = customerInputSchema.parse(input);
  const db = getDb();

  const [row] = await db
    .insert(customers)
    .values({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
      lastActivityAt: new Date(),
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "customer",
    entityId: row.id,
    action: "create",
    after: row,
  });
  await addActivity({
    entityType: "customer",
    entityId: row.id,
    type: "customer.created",
    message: `Kunde opprettet: ${row.name}`,
    actorId: session.user.id,
  });

  revalidatePath("/customers");
  return row;
}

export async function updateCustomer(
  id: string,
  input: z.infer<typeof customerInputSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = customerInputSchema.parse(input);
  const db = getDb();

  const before = await getCustomer(id);
  if (!before) throw new Error("Kunde ikke funnet");

  const [row] = await db
    .update(customers)
    .set({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
      lastActivityAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "customer",
    entityId: id,
    action: "update",
    before,
    after: row,
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return row;
}

export async function archiveCustomer(id: string) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const before = await getCustomer(id);
  if (!before) throw new Error("Kunde ikke funnet");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairTickets)
    .where(eq(repairTickets.customerId, id));

  if (count > 0) {
    const [row] = await db
      .update(customers)
      .set({ archivedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    await writeAuditLog({
      actorId: session.user.id,
      entityType: "customer",
      entityId: id,
      action: "archive",
      before,
      after: row,
    });
    revalidatePath("/customers");
    return { archived: true as const, customer: row };
  }

  await db.delete(customers).where(eq(customers.id, id));
  await writeAuditLog({
    actorId: session.user.id,
    entityType: "customer",
    entityId: id,
    action: "delete",
    before,
  });
  revalidatePath("/customers");
  return { archived: false as const, deleted: true as const };
}
