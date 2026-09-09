import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlipStatusBadge } from "@/components/ui/StatusBadge";
import { MoneyText } from "@/components/ui/MoneyText";
import { listFlips } from "@/server/flips";

export default async function ReadyFlipsPage() {
  const flips = await listFlips("READY_TO_LIST");

  return (
    <div>
      <PageHeader
        title="Klar for salg"
        description="Flips klare til listing."
      />
      {flips.length === 0 ? (
        <EmptyState
          title="Ingen flips klare for salg"
          action={
            <Link href="/refurbishment/active">
              <Button type="button" variant="secondary">
                Aktive flips
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
