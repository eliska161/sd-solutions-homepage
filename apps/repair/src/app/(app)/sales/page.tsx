import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { formatDate } from "@/lib/labels";
import { formatRoiBps } from "@/lib/money";
import { listFlips } from "@/server/flips";

export default async function SalesPage() {
  const sold = await listFlips("SOLD");

  return (
    <div>
      <PageHeader
        title="Salg"
        description="Solgte flips og inntekter."
      />

      {sold.length === 0 ? (
        <EmptyState
          title="Ingen salg ennå"
          action={
            <Link href="/refurbishment">
              <Button type="button" variant="secondary">
                Til flipping
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Dato", "Flip", "Modell", "Salg", "Profit", "ROI"]}
        >
          {sold.map((f) => (
            <tr key={f.id}>
              <Td className="text-muted">{formatDate(f.soldAt)}</Td>
              <Td>
                <Link href={`/refurbishment/${f.id}`} className="hover:text-accent">
                  {f.flipNumber}
                </Link>
              </Td>
              <Td>{f.model}</Td>
              <Td>
                <MoneyText ore={f.actualSaleOre} />
              </Td>
              <Td>
                <MoneyText ore={f.actualProfitOre} />
              </Td>
              <Td className="text-muted">
                {f.actualRoiBps != null ? formatRoiBps(f.actualRoiBps) : "—"}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
