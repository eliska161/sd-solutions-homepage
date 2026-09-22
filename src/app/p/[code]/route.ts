import { NextResponse } from "next/server";
import { repairPortalUrl } from "@/lib/repair-portal";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const token = code.trim();
  if (!/^[a-zA-Z0-9]{6,12}$/.test(token)) {
    return NextResponse.redirect(repairPortalUrl("/s/ny"));
  }
  return NextResponse.redirect(repairPortalUrl(`/s/${token}/betaling`));
}
