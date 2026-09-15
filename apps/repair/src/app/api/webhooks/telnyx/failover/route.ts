import { GET as health, POST as handle } from "@/server/telnyx-http";

export const runtime = "nodejs";

export function GET() {
  return health();
}

export function POST(req: Request) {
  return handle(req, "failover");
}
