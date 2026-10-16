import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatNokFromOre, oreToKr } from "@/lib/money";
import { canWrite } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { loadTicketCharge } from "@/lib/ticket-totals";
import { getCustomer } from "@/server/customers";
import { getDevice } from "@/server/devices";
import { getRepair } from "@/server/repairs";
import { TapToPayFlow } from "./TapToPayFlow";

export default async function TapToPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !canWrite(session.user.role)) {
    redirect(`/repairs/${id}`);
  }
  const ticket = await getRepair(id);
  if (!ticket) notFound();
  const [customer, device, charge] = await Promise.all([
    getCustomer(ticket.customerId),
    getDevice(ticket.deviceId),
    loadTicketCharge(id),
  ]);
  const deviceLabel = [device?.brand, device?.model, device?.storage, device?.color]
    .filter(Boolean)
    .join(" ");
  const lines = [
    ...charge.lines.map((line) => ({
      name: line.name,
      amountLabel: formatNokFromOre(line.amountOre),
    })),
  ];
  if (charge.discountOre > 0) {
    lines.push({
      name: charge.discountLabel || "Rabatt",
      amountLabel: `−${formatNokFromOre(charge.discountOre)}`,
    });
  }
  if (charge.postageOre > 0) {
    lines.push({
      name: "Returporto",
      amountLabel: formatNokFromOre(charge.postageOre),
    });
  }
  if (!lines.length) {
    lines.push({
      name: "Reparasjon",
      amountLabel: formatNokFromOre(charge.totalOre),
    });
  }

  return (
    <div>
      <PageHeader
        title="Tap to Pay"
        description={`${ticket.ticketNumber} · betaling i butikk`}
        actions={
          <Link href={`/repairs/${id}`} className="text-sm text-muted underline">
            Tilbake til saken
          </Link>
        }
      />
      <TapToPayFlow
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        customerName={customer?.name || "Kunde"}
        deviceLabel={deviceLabel}
        lines={lines}
        totalLabel={formatNokFromOre(charge.totalOre)}
        amountCopy={String(oreToKr(charge.totalOre)).replace(".", ",")}
        alreadyPaid={ticket.paymentStatus === "PAID"}
        closed={
          ticket.paymentStatus === "REFUNDED" || ticket.paymentStatus === "PARTIAL"
        }
      />
    </div>
  );
}
