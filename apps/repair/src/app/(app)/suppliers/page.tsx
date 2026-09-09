import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { createSupplier, listSuppliers } from "@/server/suppliers";

async function createSupplierAction(formData: FormData) {
  "use server";
  await createSupplier({
    name: String(formData.get("name") || ""),
    website: String(formData.get("website") || "") || null,
    contact: String(formData.get("contact") || "") || null,
    currency: String(formData.get("currency") || "NOK"),
    notes: String(formData.get("notes") || "") || null,
    active: true,
    apiSupported: false,
    defaultShippingOre: 0,
  });
  redirect("/suppliers");
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const suppliers = await listSuppliers(true);

  return (
    <div>
      <PageHeader
        title="Leverandører"
        description="Leverandører av reservedeler."
        actions={
          <Link href="/suppliers?new=1">
            <Button type="button">Ny leverandør</Button>
          </Link>
        }
      />

      {params.new === "1" ? (
        <form
          action={createSupplierAction}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 text-sm font-medium">Ny leverandør</div>
          <div>
            <Label htmlFor="name">Navn *</Label>
            <Input id="name" name="name" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="website">Nettside</Label>
            <Input id="website" name="website" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="contact">Kontakt</Label>
            <Input id="contact" name="contact" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="currency">Valuta</Label>
            <Input
              id="currency"
              name="currency"
              defaultValue="NOK"
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notater</Label>
            <Textarea id="notes" name="notes" className="mt-1.5" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Lagre</Button>
            <Link href="/suppliers">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {suppliers.length === 0 ? (
        <EmptyState
          title="Ingen leverandører"
          action={
            <Link href="/suppliers?new=1">
              <Button type="button">Ny leverandør</Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Navn", "Kontakt", "Valuta", "Status"]}>
          {suppliers.map((s) => (
            <tr key={s.id}>
              <Td>
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.website ? (
                    <p className="text-[12px] text-muted">{s.website}</p>
                  ) : null}
                </div>
              </Td>
              <Td className="text-muted">{s.contact || "—"}</Td>
              <Td className="text-muted">{s.currency}</Td>
              <Td className="text-muted">{s.active ? "Aktiv" : "Inaktiv"}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
