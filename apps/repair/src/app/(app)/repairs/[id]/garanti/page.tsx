import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/labels";
import { formatNokFromOre, oreToKr } from "@/lib/money";
import { canWrite } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { loadTicketCharge } from "@/lib/ticket-totals";
import { getCustomer } from "@/server/customers";
import { getDevice } from "@/server/devices";
import { getRepair } from "@/server/repairs";
import { getWarrantyForTicket } from "@/server/warranty";
import { WarrantyFlow } from "./WarrantyFlow";

export default async function WarrantyCasePage({
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
  const [customer, device, charge, warranty] = await Promise.all([
    getCustomer(ticket.customerId),
    getDevice(ticket.deviceId),
    loadTicketCharge(id),
    getWarrantyForTicket(id),
  ]);
  const deviceLabel = [device?.brand, device?.model, device?.storage, device?.color]
    .filter(Boolean)
    .join(" ");
  const now = Date.now();
  const expired = warranty ? warranty.endsAt.getTime() < now : false;
  const warrantyLabel = warranty
    ? `${warranty.days} dager, ${formatDate(warranty.startsAt)} – ${formatDate(warranty.endsAt)}`
    : ticket.warrantyDays
      ? `${ticket.warrantyDays} dager på utført arbeid (opprettes når du lagrer)`
      : "90 dager på utført arbeid (opprettes når du lagrer)";

  return (
    <div>
      <PageHeader
        title="Garantisak"
        description={`${ticket.ticketNumber} · reklamasjon og refusjon`}
        actions={
          <Link href={`/repairs/${id}`} className="text-sm text-muted underline">
            Tilbake til saken
          </Link>
        }
      />
      <WarrantyFlow
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        customerName={customer?.name || "Kunde"}
        deviceLabel={deviceLabel}
        totalLabel={formatNokFromOre(charge.totalOre)}
        defaultRefundKr={String(oreToKr(charge.totalOre)).replace(".", ",")}
        warrantyLabel={warrantyLabel}
        warrantyExpired={expired}
      />
    </div>
  );
}
