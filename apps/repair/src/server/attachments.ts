"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { attachments } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const categorySchema = z.enum([
  "BEFORE",
  "DURING",
  "AFTER",
  "DAMAGE",
  "SERIAL_NUMBER",
  "OTHER",
]);

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
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);

  const category = categorySchema.parse(input.category);
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
    process.cwd(),
    "public",
    "uploads",
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
    after: { attachmentId: row.id, category, storagePath },
  });

  if (input.entityType === "repair_ticket") {
    revalidatePath(`/repairs/${input.entityId}`);
  }
  if (input.entityType === "refurbishment") {
    revalidatePath(`/refurbishment/${input.entityId}`);
  }

  return row;
}
