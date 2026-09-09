import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { formatDate } from "@/lib/labels";
import { formatRoiBps } from "@/lib/money";
import { listFlips } from "@/server/flips";

export default async function SoldFlipsPage() {
  const flips = await listFlips("SOLD");

  return (
    <div>
      <PageHeader title="Solgt" description="Fullførte flips." />
      {flips.length === 0 ? (
        <EmptyState
          title="Ingen solgte flips"
          action={
            <Link href="/refurbishment">
              <Button type="button" variant="secondary">
                Til oversikt
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Flip", "Modell", "Salg", "Profit", "ROI", "Dato"]}>
          {flips.map((f) => (
            <tr key={f.id}>
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
              <Td className="text-muted">{formatDate(f.soldAt)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
