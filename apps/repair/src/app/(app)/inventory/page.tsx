import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { listParts } from "@/server/parts";

export default async function InventoryPage() {
  const parts = await listParts();
  const active = parts.filter((p) => p.active);
  const lowStock = active.filter((p) => p.quantityOnHand <= p.minimumStock);
  const inventoryValueOre = active.reduce(
    (sum, p) => sum + p.quantityOnHand * p.costPriceOre,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Lager"
        description="Oversikt over deler, verdi og lavt lager."
        actions={
          <Link href="/inventory/parts?new=1">
            <Button type="button">Ny del</Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Aktive SKU</p>
            <p className="mt-2 text-3xl font-medium">{active.length}</p>
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
