import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
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
  const inventoryValueOre = active.reduce(
    (sum, p) => sum + p.quantityOnHand * p.costPriceOre,
    0,
  );
  const orderedQty = ordered.reduce((s, o) => s + o.quantity, 0);

  return (
    <div>
      <PageHeader
        title="Lager"
        description="Oversikt over deler, bestillinger og lavt lager."
        actions={
          <Link href="/inventory/parts?new=1">
            <Button type="button">Ny del</Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Aktive SKU</p>
            <p className="mt-2 text-3xl font-medium">{active.length}</p>
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

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/inventory/parts">
          <Button type="button" variant="secondary" size="sm">
            Deler
          </Button>
        </Link>
        <Link href="/inventory/movements">
          <Button type="button" variant="secondary" size="sm">
            Bevegelser
          </Button>
        </Link>
        <Link href="/suppliers">
          <Button type="button" variant="secondary" size="sm">
            Leverandører
          </Button>
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Bestilt — ventes på lager</h2>
        {ordered.length === 0 ? (
          <EmptyState
            title="Ingen ventende bestillinger"
            description="Når du bestiller deler på en reparasjon, dukker de opp her til mottak."
          />
        ) : (
          <div className="space-y-2">
            {ordered.map((o) => (
              <div
                key={o.repairPartId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3"
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
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-warning">
                    Bestilt — ventes
                  </p>
                </div>
                <form action={receiveOrderedAction}>
                  <input
                    type="hidden"
                    name="repairPartId"
                    value={o.repairPartId}
                  />
                  <Button type="submit" size="sm">
                    Motta
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
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm">{p.name}</p>
                <p className="text-[12px] text-muted">{p.sku}</p>
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
