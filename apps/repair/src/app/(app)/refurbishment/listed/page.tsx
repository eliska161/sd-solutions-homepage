import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlipStatusBadge } from "@/components/ui/StatusBadge";
import { MoneyText } from "@/components/ui/MoneyText";
import { listFlips } from "@/server/flips";

export default async function ListedFlipsPage() {
  const flips = await listFlips("LISTED");

  return (
    <div>
      <PageHeader title="Listet" description="Aktive annonser." />
      {flips.length === 0 ? (
        <EmptyState
          title="Ingen listede flips"
          action={
            <Link href="/refurbishment/ready">
              <Button type="button" variant="secondary">
                Klar for salg
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Flip", "Modell", "Status", "Est. salg"]}>
          {flips.map((f) => (
            <tr key={f.id}>
              <Td>
                <Link href={`/refurbishment/${f.id}`} className="hover:text-accent">
                  {f.flipNumber}
                </Link>
              </Td>
              <Td>{f.model}</Td>
              <Td>
                <FlipStatusBadge status={f.status} />
              </Td>
              <Td>
                <MoneyText ore={f.estimatedSaleOre} />
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
