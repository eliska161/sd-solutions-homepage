import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { renderTicketReceiptPdf } from "@/server/customer-receipt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await context.params;

  try {
    const rendered = await renderTicketReceiptPdf(id);
    if (!rendered) {
      return new NextResponse("Reparasjon ikke funnet", { status: 404 });
    }

    const filename = `kvittering-${rendered.ticketNumber}.pdf`;
    return new NextResponse(new Uint8Array(rendered.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[repair receipt pdf]", id, err);
    return new NextResponse("Kunne ikke lage kvittering", { status: 500 });
  }
}
