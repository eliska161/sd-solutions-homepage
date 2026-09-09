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
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status as RepairListFilters["status"] | undefined;
  const repairs = await listRepairs(status ? { status } : {});

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
          headers={["Ticket", "Problem", "Tekniker", "Estimert ferdig", "Status", "Opprettet"]}
        >
          {repairs.map((r) => (
            <tr key={r.id} className="hover:bg-white/[0.03]">
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
                {r.assigneeName || "Tekniker ikke tildelt"}
              </Td>
              <Td className="text-muted">
                {r.estimatedCompletionDate
                  ? formatDate(r.estimatedCompletionDate).split(",")[0] ||
                    formatDate(r.estimatedCompletionDate)
                  : "—"}
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
