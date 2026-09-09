import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveUploadAbsolutePath } from "@/lib/uploads";
import { getPublicAttachmentForToken } from "@/server/public-status";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await context.params;
  const attachment = await getPublicAttachmentForToken(token, id);
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  const abs = resolveUploadAbsolutePath(attachment.storagePath);
  if (!abs) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(abs);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
