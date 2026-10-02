import { NextResponse } from "next/server";
import { workshopPhoneHours } from "@/lib/workshop";

export const dynamic = "force-dynamic";

/**
 * Twilio Studio HTTP Request (GET).
 * 200 when the workshop is open for phone, 503 when closed.
 * URL: https://repair.sd-solutions.org/api/public/hours
 */
export async function GET() {
  const body = workshopPhoneHours();
  return NextResponse.json(body, {
    status: body.open ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
