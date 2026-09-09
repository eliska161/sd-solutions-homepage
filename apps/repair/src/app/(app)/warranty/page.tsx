import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/labels";
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
        description="Garantikrav knyttet til reparasjoner."
      />

      {claims.length === 0 ? (
        <EmptyState
          title="Ingen garantikrav"
          description="Krav opprettes fra reparasjonsworkspace eller senere flyt."
          action={
            <Link href="/repairs">
              <Button type="button" variant="secondary">
                Til reparasjoner
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Opprettet", "Beskrivelse", "Status", ""]}>
          {claims.map((c) => (
            <tr key={c.id}>
              <Td className="text-muted">{formatDate(c.createdAt)}</Td>
              <Td className="max-w-md">{c.description}</Td>
              <Td>{c.status}</Td>
              <Td>
                <form action={updateClaimAction} className="flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <Select name="status" defaultValue={c.status} className="w-40">
                    <option value="OPEN">Åpen</option>
                    <option value="IN_PROGRESS">Under arbeid</option>
                    <option value="APPROVED">Godkjent</option>
                    <option value="REJECTED">Avvist</option>
                    <option value="RESOLVED">Løst</option>
                    <option value="CLOSED">Lukket</option>
                  </Select>
                  <Button type="submit" size="sm" variant="secondary">
                    Oppdater
                  </Button>
                </form>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
