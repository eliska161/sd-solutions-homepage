"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { attachments } from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getUploadsRoot } from "@/lib/uploads";

const categorySchema = z.enum([
  "BEFORE",
  "DURING",
  "AFTER",
  "DAMAGE",
  "SERIAL_NUMBER",
  "OTHER",
  "INTAKE_FRONT",
  "INTAKE_BACK",
  "INTAKE_LEFT",
  "INTAKE_RIGHT",
  "INTAKE_TOP",
  "INTAKE_BOTTOM",
]);

const visibilitySchema = z.enum(["INTERNAL", "CUSTOMER"]);

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function listAttachments(entityType: string, entityId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.entityType, entityType),
        eq(attachments.entityId, entityId),
      ),
    )
    .orderBy(desc(attachments.createdAt));
}

export async function uploadAttachment(input: {
  entityType: string;
  entityId: string;
  category: z.infer<typeof categorySchema>;
  formData: FormData;
  visibility?: z.infer<typeof visibilitySchema>;
  description?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);

  const category = categorySchema.parse(input.category);
  const visibility = visibilitySchema.parse(input.visibility ?? "INTERNAL");
  const description = input.description?.trim() || null;
  const file = input.formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Fil mangler");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Filen er for stor (maks 8 MB)");
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error("Ugyldig filtype");
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : file.type === "application/pdf"
            ? "pdf"
            : "jpg";

  const dir = path.join(
    getUploadsRoot(),
    input.entityType,
    input.entityId,
  );
  await mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const abs = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buffer);

  const storagePath = `/uploads/${input.entityType}/${input.entityId}/${safeName}`;
  const db = getDb();
  const [row] = await db
    .insert(attachments)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      category,
      description,
      visibility,
      fileName: file.name || safeName,
      mimeType: file.type,
      size: file.size,
      storagePath,
      createdById: session.user.id,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: input.entityType,
    entityId: input.entityId,
    action: "attachment.uploaded",
    after: { attachmentId: row.id, category, visibility, storagePath },
  });

  if (input.entityType === "repair_ticket") {
    await addActivity({
      entityType: "repair_ticket",
      entityId: input.entityId,
      type: "repair.photo_uploaded",
      message:
        visibility === "CUSTOMER"
          ? `Bilde lastet opp (kunde-synlig): ${category}`
          : `Bilde lastet opp: ${category}`,
      actorId: session.user.id,
      meta: { attachmentId: row.id, category, visibility },
    });
    revalidatePath(`/repairs/${input.entityId}`);
  }
  if (input.entityType === "refurbishment") {
    revalidatePath(`/refurbishment/${input.entityId}`);
  }

  return row;
}

export async function setAttachmentVisibility(input: {
  attachmentId: string;
  visibility: z.infer<typeof visibilitySchema>;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      attachmentId: z.string().uuid(),
      visibility: visibilitySchema,
    })
    .parse(input);

  const db = getDb();
  const [before] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, data.attachmentId))
    .limit(1);
  if (!before) throw new Error("Vedlegg ikke funnet");

  const [row] = await db
    .update(attachments)
    .set({ visibility: data.visibility })
    .where(eq(attachments.id, data.attachmentId))
    .returning();

  if (before.entityType === "repair_ticket") {
    await addActivity({
      entityType: "repair_ticket",
      entityId: before.entityId,
      type: "repair.photo_visibility",
      message:
        data.visibility === "CUSTOMER"
          ? "Bilde gjort synlig for kunde"
          : "Bilde skjult for kunde",
      actorId: session.user.id,
      meta: { attachmentId: row.id, visibility: data.visibility },
    });
    revalidatePath(`/repairs/${before.entityId}`);
  }

  return row;
}
