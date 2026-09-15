import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { PartStatusBadge } from "@/components/ui/StatusBadge";
import {
  listOpenOrderedParts,
  listParts,
  receiveOrderedPart,
} from "@/server/parts";

async function receiveOrderedAction(formData: FormData) {
  "use server";
  await receiveOrderedPart({
    repairPartId: String(formData.get("repairPartId") || ""),
  });
  redirect("/inventory");
}

export default async function InventoryPage() {
  const [parts, ordered] = await Promise.all([
    listParts(),
    listOpenOrderedParts(),
  ]);
  const active = parts.filter((p) => p.active);
  const lowStock = active.filter((p) => p.quantityOnHand <= p.minimumStock);
  const onHandQty = active.reduce((sum, p) => sum + p.quantityOnHand, 0);
  const inventoryValueOre = active.reduce(
    (sum, p) => sum + p.quantityOnHand * p.costPriceOre,
    0,
  );
  const orderedQty = ordered.reduce((s, o) => s + o.quantity, 0);

  return (
    <div>
      <PageHeader
        title="Lager"
        description="På lager er fritt tilgjengelig. Bestilt venter mottak til en konkret jobb."
        actions={
          <Link href="/inventory/parts?new=1">
            <Button type="button">Ny del</Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">På lager (stk)</p>
            <p className="mt-2 text-3xl font-medium">{onHandQty}</p>
            <p className="mt-1 text-[12px] text-muted">{active.length} SKU</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Bestilt / ventes</p>
            <p className="mt-2 text-3xl font-medium text-warning">
              {ordered.length}
            </p>
            <p className="mt-1 text-[12px] text-muted">{orderedQty} stk</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Lavt lager</p>
            <p className="mt-2 text-3xl font-medium text-warning">
              {lowStock.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Lagerverdi (kost)</p>
            <p className="mt-2 text-3xl font-medium">
              <MoneyText ore={inventoryValueOre} />
            </p>
          </CardBody>
        </Card>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Bestilt — venter mottak</h2>
          <Link href="/inventory/incoming" className="text-[13px] text-accent">
            Åpne alle
          </Link>
        </div>
        {ordered.length === 0 ? (
          <EmptyState
            title="Ingen ventende bestillinger"
            description="Bestill deler fra en reparasjon eller flip. De vises her til du trykker Motta til jobb."
          />
        ) : (
          <div className="space-y-2">
            {ordered.slice(0, 8).map((o) => (
              <div
                key={o.repairPartId}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-warning/40 bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {o.quantity} × {o.partName}
                  </p>
                  <p className="text-[12px] text-muted">
                    {o.partSku} ·{" "}
                    {o.ticketNumber
                      ? o.ticketNumber
                      : o.flipNumber
                        ? o.flipNumber
                        : "Jobb"}
                    {o.notes ? ` · ${o.notes}` : ""}
                  </p>
                  <div className="mt-1">
                    <PartStatusBadge status="ORDERED" />
                  </div>
                </div>
                <form action={receiveOrderedAction}>
                  <input
                    type="hidden"
                    name="repairPartId"
                    value={o.repairPartId}
                  />
                  <Button type="submit" size="sm">
                    Motta til jobb
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {lowStock.length === 0 ? (
        <EmptyState
          title="Ingen lavtlager-varsler"
          description="Alle aktive deler er over minimumsbeholdning."
          action={
            <Link href="/inventory/parts">
              <Button type="button" variant="secondary">
                Se alle deler
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Lavt lager</h2>
          {lowStock.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm">{p.name}</p>
                <p className="text-[12px] text-muted">
                  {p.sku}
                  {p.quantityIncoming > 0
                    ? ` · ${p.quantityIncoming} bestilt inn`
                    : ""}
                </p>
              </div>
              <p className="text-sm text-warning">
                {p.quantityOnHand} / min {p.minimumStock}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
