import { NextResponse } from "next/server";
import {
  BATTERY_CALIBRATE_PDF_FILENAME,
  renderBatteryCalibratePdf,
} from "@/lib/battery-calibrate";
import { requireSession } from "@/lib/session";
import { ticketIsBatteryJob } from "@/server/battery-calibrate";
import { getRepair } from "@/server/repairs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await context.params;

  try {
    const ticket = await getRepair(id);
    if (!ticket) {
      return new NextResponse("Reparasjon ikke funnet", { status: 404 });
    }
    if (!(await ticketIsBatteryJob(id))) {
      return new NextResponse("Ikke en batterijobb", { status: 404 });
    }

    const pdf = await renderBatteryCalibratePdf();
    if (!pdf) {
      return new NextResponse("Kalibreringskort mangler", { status: 500 });
    }

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${BATTERY_CALIBRATE_PDF_FILENAME}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[repair battery calibrate pdf]", id, err);
    return new NextResponse("Kunne ikke lage kalibreringskort", { status: 500 });
  }
}
