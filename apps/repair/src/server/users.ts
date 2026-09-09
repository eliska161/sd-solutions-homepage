"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { users } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

/** Staff users that can be assigned as technicians on repairs. */
export async function listTechnicians() {
  await requireSession();
  const db = getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.role, ["ADMIN", "TECHNICIAN"]))
    .orderBy(asc(users.name));
}

export async function getUserById(userId: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}
