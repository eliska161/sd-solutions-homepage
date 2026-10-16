import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import {
  warrantyThermalPayload,
  workshopReceiptPayloads,
} from "@/server/thermal-receipt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const draftSchema = z.object({
  copy: z.enum(["store", "customer"]),
  outcome: z.enum(["repair", "refund", "reject"]),
  description: z.string().min(1),
  refundOre: z.number().int().min(0).optional(),
  signerName: z.string().optional().nullable(),
});

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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await context.params;
  try {
    const body = draftSchema.parse(await request.json());
    const warranty = await warrantyThermalPayload(id, body);
    if (!warranty) {
      return NextResponse.json({ ok: false, error: "Reparasjon ikke funnet" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, warranty });
  } catch (err) {
    console.error("[repair thermal warranty]", id, err);
    return NextResponse.json({ ok: false, error: "Kunne ikke lage kvittering" }, { status: 500 });
  }
}
