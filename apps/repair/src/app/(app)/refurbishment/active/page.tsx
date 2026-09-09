import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlipStatusBadge } from "@/components/ui/StatusBadge";
import { MoneyText } from "@/components/ui/MoneyText";
import { listFlips } from "@/server/flips";

async function FlipListPage({
  title,
  description,
  filter,
  emptyTitle,
}: {
  title: string;
  description: string;
  filter: (status: string) => boolean;
  emptyTitle: string;
}) {
  const flips = (await listFlips()).filter((f) => filter(f.status));

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link href="/refurbishment/candidates?new=1">
            <Button type="button" variant="secondary">
              Ny kandidat
            </Button>
          </Link>
        }
      />
      {flips.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          action={
            <Link href="/refurbishment">
              <Button type="button" variant="secondary">
                Til oversikt
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Flip", "Modell", "Status", "Est. profit"]}>
          {flips.map((f) => (
            <tr key={f.id} className="hover:bg-white/[0.03]">
              <Td>
                <Link
                  href={`/refurbishment/${f.id}`}
                  className="font-medium hover:text-accent"
                >
                  {f.flipNumber}
                </Link>
              </Td>
              <Td>{f.model}</Td>
              <Td>
                <FlipStatusBadge status={f.status} />
              </Td>
              <Td>
                <MoneyText ore={f.actualProfitOre ?? f.estimatedProfitOre} />
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

export default async function ActiveFlipsPage() {
  return (
    <FlipListPage
      title="Aktive flips"
      description="Flips under arbeid (ikke solgt/arkivert)."
      filter={(s) => !["SOLD", "ARCHIVED", "READY_TO_LIST", "LISTED"].includes(s)}
      emptyTitle="Ingen aktive flips"
    />
  );
}
