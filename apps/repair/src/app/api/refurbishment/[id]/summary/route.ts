import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { renderJobSummaryPdf } from "@/lib/pdf/summary-document";
import { buildFlipSummaryDocument } from "@/server/job-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await context.params;

  try {
    const doc = await buildFlipSummaryDocument(id);
    if (!doc) {
      return new NextResponse("Flip ikke funnet", { status: 404 });
    }

    const pdf = await renderJobSummaryPdf(doc);
    const filename = `${doc.title.replace(/[^\w\-æøåÆØÅ.]+/gi, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[flip summary pdf]", id, err);
    return new NextResponse("Kunne ikke lage sammendrag", { status: 500 });
  }
}
