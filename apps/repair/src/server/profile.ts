"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { users } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().min(2, "Navn må ha minst 2 tegn"),
  email: z.string().email("Ugyldig e-post"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nåværende passord er påkrevd"),
    newPassword: z.string().min(8, "Nytt passord må ha minst 8 tegn"),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passordene er ikke like",
    path: ["confirmPassword"],
  });

export async function updateMyProfile(input: {
  name: string;
  email: string;
}) {
  const session = await requireSession();
  const data = profileSchema.parse(input);
  const db = getDb();
  const email = data.email.trim().toLowerCase();

  if (email !== session.user.email.toLowerCase()) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (taken && taken.id !== session.user.id) {
      throw new Error("E-postadressen er allerede i bruk");
    }
  }

  await db
    .update(users)
    .set({
      name: data.name.trim(),
      email,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  await requireSession();
  const data = passwordSchema.parse(input);
  const auth = getAuth();

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      headers: await headers(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Kunne ikke endre passord";
    if (/password|invalid|incorrect|credential/i.test(message)) {
      throw new Error("Nåværende passord er feil");
    }
    throw new Error(message);
  }

  revalidatePath("/profile");
  return { ok: true as const };
}
