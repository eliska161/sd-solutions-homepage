"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { services } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const serviceInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  customerPriceOre: z.number().int().min(0),
  estimatedPartsCostOre: z.number().int().min(0).optional().nullable(),
  estimatedLaborMinutes: z.number().int().min(0).optional().nullable(),
  warrantyDays: z.number().int().min(0).optional().nullable(),
  active: z.boolean().default(true),
});

export async function listServices(includeInactive = false) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(services)
    .where(includeInactive ? undefined : eq(services.active, true))
    .orderBy(desc(services.createdAt));
}

const DEFAULT_SERVICES = [
  {
    code: "DIAG",
    name: "Diagnostikk",
    description: "Feilsøking / diagnostikk",
    customerPriceOre: 0,
  },
  {
    code: "SCREEN-GENERIC",
    name: "Skjermbytte",
    description: "Bytte av skjerm (pris justeres per modell)",
    customerPriceOre: 249900,
  },
  {
    code: "BATTERY-GENERIC",
    name: "Batteribytte",
    description: "Bytte av batteri",
    customerPriceOre: 129900,
  },
  {
    code: "PORT-GENERIC",
    name: "Ladeport",
    description: "Reparasjon / bytte av ladeport",
    customerPriceOre: 149900,
  },
  {
    code: "GLASS-BACK",
    name: "Bakglass",
    description: "Bytte bakglass",
    customerPriceOre: 199900,
  },
] as const;

/** Upsert a small default service catalog when the list is empty. */
export async function ensureDefaultServices() {
  await requireSession();
  const db = getDb();
  const existing = await db.select({ id: services.id }).from(services).limit(1);
  if (existing.length > 0) {
    return listServices(true);
  }

  for (const s of DEFAULT_SERVICES) {
    await db
      .insert(services)
      .values({
        code: s.code,
        name: s.name,
        description: s.description,
        customerPriceOre: s.customerPriceOre,
        warrantyDays: 90,
        active: true,
      })
      .onConflictDoNothing({ target: services.code });
  }

  revalidatePath("/services");
  revalidatePath("/repairs");
  return listServices(true);
}

export async function createService(input: z.infer<typeof serviceInputSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = serviceInputSchema.parse(input);
  const db = getDb();

  const [row] = await db
    .insert(services)
    .values({
      code: data.code,
      name: data.name,
      description: data.description || null,
      customerPriceOre: data.customerPriceOre,
      estimatedPartsCostOre: data.estimatedPartsCostOre ?? null,
      estimatedLaborMinutes: data.estimatedLaborMinutes ?? null,
      warrantyDays: data.warrantyDays ?? 90,
      active: data.active,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "service",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/settings");
  revalidatePath("/services");
  revalidatePath("/quotes");
  revalidatePath("/repairs");
  return row;
}

export async function updateService(
  id: string,
  input: Partial<z.infer<typeof serviceInputSchema>>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = serviceInputSchema.partial().parse(input);
  const db = getDb();

  const [before] = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  if (!before) throw new Error("Tjeneste ikke funnet");

  const [row] = await db
    .update(services)
    .set({
      ...data,
      description:
        data.description === undefined ? undefined : data.description || null,
    })
    .where(eq(services.id, id))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "service",
    entityId: id,
    action: "update",
    before,
    after: row,
  });

  revalidatePath("/settings");
  revalidatePath("/services");
  return row;
}

export async function deactivateService(id: string) {
  return updateService(id, { active: false });
}
