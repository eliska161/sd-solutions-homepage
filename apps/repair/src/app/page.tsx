import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Public landing: new service order. Staff use /login → /dashboard. */
export default function HomePage() {
  redirect("/s/ny");
}
