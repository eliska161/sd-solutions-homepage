import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { workshopReceiptPayloads } from "@/server/thermal-receipt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await context.params;
  try {
    const payload = await workshopReceiptPayloads(id);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Reparasjon ikke funnet" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...payload });
  } catch (err) {
    console.error("[repair thermal receipt]", id, err);
    return NextResponse.json({ ok: false, error: "Kunne ikke lage kvittering" }, { status: 500 });
  }
}
