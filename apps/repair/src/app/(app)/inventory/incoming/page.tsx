import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { PartStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/labels";
import {
  cancelOrderedPart,
  listOpenOrderedParts,
  receiveOrderedPart,
} from "@/server/parts";

async function receiveAction(formData: FormData) {
  "use server";
  await receiveOrderedPart({
    repairPartId: String(formData.get("repairPartId") || ""),
  });
  redirect("/inventory/incoming");
}

async function cancelAction(formData: FormData) {
  "use server";
  await cancelOrderedPart({
    repairPartId: String(formData.get("repairPartId") || ""),
  });
  redirect("/inventory/incoming");
}

export default async function IncomingPartsPage() {
  const ordered = await listOpenOrderedParts();

  return (
    <div>
      <PageHeader
        title="Bestilt — venter mottak"
        description="Deler bestilt til en jobb. Motta dem til jobben når pakken kommer — de går ikke inn på fritt lager."
      />

      <Card className="mb-6">
        <CardHeader title="Slik statusene henger sammen" />
        <CardBody className="grid gap-3 text-[13px] sm:grid-cols-3">
          <p>
            <strong>Bestilt</strong> — avtalt/innkjøpt, ikke kommet inn ennå.
          </p>
          <p>
            <strong>Mottatt til jobb</strong> — fysisk her og reservert til
            reparasjonen eller flipen. Ikke fritt lager.
          </p>
          <p>
            <strong>Fra lager</strong> — tatt fra beholdningen som allerede lå
            inne.
          </p>
        </CardBody>
      </Card>

      {ordered.length === 0 ? (
        <EmptyState
          title="Ingen ventende bestillinger"
          description="Når du bestiller deler på en reparasjon eller flip, dukker de opp her til mottak."
          action={
            <Link href="/inventory/parts">
              <Button type="button" variant="secondary">
                Se deler på lager
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {ordered.map((o) => (
            <div
              key={o.repairPartId}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-warning/40 bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {o.quantity} × {o.partName}
                </p>
                <p className="text-[12px] text-muted">
                  {o.partSku}
                  {o.ticketNumber ? (
                    <>
                      {" · "}
                      <Link
                        href={`/repairs/${o.ticketId}`}
                        className="text-accent"
                      >
                        {o.ticketNumber}
                      </Link>
                    </>
                  ) : null}
                  {o.flipNumber ? (
                    <>
                      {" · "}
                      <Link
                        href={`/refurbishment/${o.refurbishmentId}`}
                        className="text-accent"
                      >
                        {o.flipNumber}
                      </Link>
                    </>
                  ) : null}
                  {o.notes ? ` · ${o.notes}` : ""}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Bestilt {formatDate(o.createdAt)} ·{" "}
                  <MoneyText ore={o.quantity * o.unitCostOre} />
                </p>
                <div className="mt-1">
                  <PartStatusBadge status="ORDERED" />
                </div>
              </div>
              <div className="flex gap-2">
                <form action={receiveAction}>
                  <input
                    type="hidden"
                    name="repairPartId"
                    value={o.repairPartId}
                  />
                  <Button type="submit" size="sm">
                    Motta til jobb
                  </Button>
                </form>
                <form action={cancelAction}>
                  <input
                    type="hidden"
                    name="repairPartId"
                    value={o.repairPartId}
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    Kanseller
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
