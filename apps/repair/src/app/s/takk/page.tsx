import { redirect } from "next/navigation";
import { LEGAL_PARTY } from "@/lib/legal";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ServiceOrderThanksRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  redirect(`${LEGAL_PARTY.web}/takk/serviceordre${q}`);
}
