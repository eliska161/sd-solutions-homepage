import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { WARRANTY_CLAIM_STATUS_LABELS, formatDate } from "@/lib/labels";
import { formatNokFromOre } from "@/lib/money";
import { listClaims, updateClaimStatus } from "@/server/warranty";

async function updateClaimAction(formData: FormData) {
  "use server";
  await updateClaimStatus(
    String(formData.get("id")),
    String(formData.get("status")) as
      | "OPEN"
      | "IN_PROGRESS"
      | "APPROVED"
      | "REJECTED"
      | "RESOLVED"
      | "CLOSED",
  );
  redirect("/warranty");
}

export default async function WarrantyPage() {
  const claims = await listClaims();

  return (
    <div>
      <PageHeader
        title="Garanti"
        description="Reklamasjoner og garantisaker."
      />

      {claims.length === 0 ? (
        <EmptyState
          title="Ingen garantikrav"
          description="Åpne en sak og velg Garantisak. Kunden signerer butikkeksemplaret med penn."
          action={
            <Link href="/repairs">
              <Button type="button" variant="secondary">
                Til reparasjoner
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Sak", "Krav", "Utfall", "Status", ""]}>
          {claims.map((c) => (
            <tr key={c.id}>
              <Td>
                {c.ticketId ? (
                  <Link href={`/repairs/${c.ticketId}`} className="text-accent underline">
                    {c.ticketNumber || "Sak"}
                  </Link>
                ) : (
                  "—"
                )}
                {c.customerName ? (
                  <span className="mt-0.5 block text-[13px] text-muted">{c.customerName}</span>
                ) : null}
                <span className="mt-0.5 block text-[12px] text-muted">
                  {formatDate(c.createdAt)}
                </span>
              </Td>
              <Td className="max-w-md">{c.description}</Td>
              <Td>
                {c.resolution || "—"}
                {c.refundOre > 0 ? (
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {formatNokFromOre(c.refundOre)}
                  </span>
                ) : null}
              </Td>
              <Td>
                {WARRANTY_CLAIM_STATUS_LABELS[c.status] || c.status}
              </Td>
              <Td>
                <form action={updateClaimAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <Select name="status" defaultValue={c.status} className="w-40">
                    {(
                      Object.keys(WARRANTY_CLAIM_STATUS_LABELS) as Array<
                        keyof typeof WARRANTY_CLAIM_STATUS_LABELS
                      >
                    ).map((status) => (
                      <option key={status} value={status}>
                        {WARRANTY_CLAIM_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm" variant="secondary">
                    Oppdater
                  </Button>
                  {c.ticketId ? (
                    <Link
                      href={`/repairs/${c.ticketId}/garanti`}
                      className="inline-flex h-8 items-center text-sm text-accent underline"
                    >
                      Ny sak
                    </Link>
                  ) : null}
                </form>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
