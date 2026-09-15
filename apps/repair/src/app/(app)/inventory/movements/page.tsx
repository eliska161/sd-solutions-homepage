import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { formatDate, INVENTORY_ACTION_LABELS } from "@/lib/labels";
import { listInventoryMovements } from "@/server/inventory";

export default async function MovementsPage() {
  const movements = await listInventoryMovements(150);

  return (
    <div>
      <PageHeader
        title="Lagerbevegelser"
        description="Mottak til lager, forbruk på jobb, og justeringer. Mottatt-til-jobb endrer ikke antall på lager."
        actions={
          <Link href="/inventory/parts?receive=1">
            <Button type="button">Motta lager</Button>
          </Link>
        }
      />

      {movements.length === 0 ? (
        <EmptyState
          title="Ingen bevegelser"
          description="Bevegelser opprettes når du mottar eller bruker deler."
          action={
            <Link href="/inventory/parts?receive=1">
              <Button type="button">Motta lager</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Tid", "Del", "Handling", "Delta", "På lager etter", "Kost"]}
        >
          {movements.map((m) => (
            <tr key={m.id}>
              <Td className="text-muted">{formatDate(m.createdAt)}</Td>
              <Td>
                <span className="font-mono text-[12px] text-muted">
                  {m.partSku}
                </span>{" "}
                {m.partName}
              </Td>
              <Td>
                {INVENTORY_ACTION_LABELS[
                  m.action as keyof typeof INVENTORY_ACTION_LABELS
                ] ?? m.action}
                {m.note ? (
                  <span className="block text-[11px] text-muted">{m.note}</span>
                ) : null}
              </Td>
              <Td
                className={
                  m.quantityDelta < 0 ? "text-danger" : "text-success"
                }
              >
                {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
              </Td>
              <Td>{m.resultingQuantity}</Td>
              <Td>
                <MoneyText ore={m.unitCostOre} />
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
