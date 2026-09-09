"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { settings } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { canAdmin } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return (row?.value as T) ?? null;
}

export async function setSetting(key: string, value: unknown) {
  const session = await requireSession();
  if (!canAdmin(session.user.role)) {
    throw new Error("Kun admin kan endre innstillinger");
  }
  const parsedKey = z.string().min(1).parse(key);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, parsedKey))
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, parsedKey))
      .returning();
  } else {
    [row] = await db
      .insert(settings)
      .values({ key: parsedKey, value })
      .returning();
  }

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "setting",
    entityId: parsedKey,
    action: existing ? "update" : "create",
    before: existing ?? null,
    after: row,
  });

  revalidatePath("/settings");
  return row;
}
