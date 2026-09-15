import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { RepairStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, REPAIR_STATUS_LABELS, REPAIR_STATUSES } from "@/lib/labels";
import { listRepairs, type RepairListFilters } from "@/server/repairs";

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pending?: string }>;
}) {
  const params = await searchParams;
  const status = params.status as RepairListFilters["status"] | undefined;
  const pending = params.pending === "1";
  const repairs = await listRepairs({
    ...(status ? { status } : {}),
    ...(pending ? { pendingReceive: true } : {}),
  });

  return (
    <div>
      <PageHeader
        title="Reparasjoner"
        description="Tickets og verkstedstatus."
        actions={
          <Link href="/repairs/new">
            <Button type="button">Ny reparasjon</Button>
          </Link>
        }
      />

      <form className="mb-6 flex flex-wrap items-center gap-2">
        <Select
          name="status"
          defaultValue={status ?? ""}
          className="max-w-xs"
        >
          <option value="">Alle statuser</option>
          {REPAIR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REPAIR_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {repairs.length === 0 ? (
        <EmptyState
          title="Ingen reparasjoner"
          description="Opprett en ticket for å starte verkstedflyten."
          action={
            <Link href="/repairs/new">
              <Button type="button">Ny reparasjon</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Ticket", "Problem", "Kilde", "Inn", "Tekniker", "Status", "Opprettet"]}
        >
          {repairs.map((r) => (
            <tr key={r.id} className="hover:bg-black/[0.03]">
              <Td>
                <Link
                  href={`/repairs/${r.id}`}
                  className="font-medium hover:text-accent"
                >
                  {r.ticketNumber}
                </Link>
              </Td>
              <Td className="max-w-md truncate text-muted">
                {r.customerProblem}
              </Td>
              <Td className="text-muted">
                {r.source === "CUSTOMER_PORTAL" ? "Nettside" : "Verksted"}
                {!r.receivedAt ? " · venter" : ""}
              </Td>
              <Td className="text-muted">
                {r.inboundMethod === "POST" ? "Post" : "Butikk"}
              </Td>
              <Td className="text-muted">
                {r.assigneeName || "Tekniker ikke tildelt"}
              </Td>
              <Td>
                <RepairStatusBadge status={r.status} />
              </Td>
              <Td className="text-muted">{formatDate(r.createdAt)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
