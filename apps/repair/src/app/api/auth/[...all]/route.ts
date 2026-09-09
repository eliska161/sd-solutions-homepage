import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";

async function handler(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  return getAuth().handler(request);
}

export const GET = handler;
export const POST = handler;
