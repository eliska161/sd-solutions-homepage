import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { formatDate } from "@/lib/labels";
import { listInventoryMovements } from "@/server/inventory";

export default async function MovementsPage() {
  const movements = await listInventoryMovements(150);

  return (
    <div>
      <PageHeader
        title="Lagerbevegelser"
        description="Mottak, forbruk og justeringer."
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
          headers={["Tid", "Del", "Handling", "Delta", "Resulterende", "Kost"]}
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
              <Td>{m.action}</Td>
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
