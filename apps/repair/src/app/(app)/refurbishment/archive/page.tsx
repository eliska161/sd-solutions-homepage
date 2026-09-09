import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlipStatusBadge } from "@/components/ui/StatusBadge";
import { listFlips } from "@/server/flips";

export default async function ArchiveFlipsPage() {
  const flips = await listFlips("ARCHIVED");

  return (
    <div>
      <PageHeader title="Arkiv" description="Arkiverte flips." />
      {flips.length === 0 ? (
        <EmptyState
          title="Arkivet er tomt"
          action={
            <Link href="/refurbishment">
              <Button type="button" variant="secondary">
                Til oversikt
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Flip", "Modell", "Status"]}>
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
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
