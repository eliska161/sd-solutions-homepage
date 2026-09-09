import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { MoneyText } from "@/components/ui/MoneyText";
import { Textarea } from "@/components/ui/Textarea";
import { parseKrToOre } from "@/lib/labels";
import {
  createService,
  deactivateService,
  listServices,
} from "@/server/services-catalog";

async function createServiceAction(formData: FormData) {
  "use server";
  await createService({
    code: String(formData.get("code") || ""),
    name: String(formData.get("name") || ""),
    description: String(formData.get("description") || "") || null,
    customerPriceOre: parseKrToOre(formData.get("customerPriceKr")),
    estimatedPartsCostOre:
      parseKrToOre(formData.get("estimatedPartsCostKr")) || null,
    estimatedLaborMinutes: Number(formData.get("estimatedLaborMinutes") || 0) || null,
    warrantyDays: Number(formData.get("warrantyDays") || 90) || null,
  });
  redirect("/services");
}

async function deactivateServiceAction(formData: FormData) {
  "use server";
  await deactivateService(String(formData.get("id")));
  redirect("/services");
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const services = await listServices(true);

  return (
    <div>
      <PageHeader
        title="Tjenester"
        description="Prisliste for verkstedtjenester."
        actions={
          <Link href="/services?new=1">
            <Button type="button">Ny tjeneste</Button>
          </Link>
        }
      />

      {params.new === "1" ? (
        <form
          action={createServiceAction}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 text-sm font-medium">Ny tjeneste</div>
          <div>
            <Label htmlFor="code">Kode *</Label>
            <Input id="code" name="code" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="name">Navn *</Label>
            <Input id="name" name="name" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="customerPriceKr">Kundepris (kr) *</Label>
            <Input
              id="customerPriceKr"
              name="customerPriceKr"
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="warrantyDays">Garantidager</Label>
            <Input
              id="warrantyDays"
              name="warrantyDays"
              type="number"
              defaultValue={90}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea id="description" name="description" className="mt-1.5" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Lagre</Button>
            <Link href="/services">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {services.length === 0 ? (
        <EmptyState
          title="Ingen tjenester"
          action={
            <Link href="/services?new=1">
              <Button type="button">Ny tjeneste</Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Kode", "Navn", "Pris", "Garanti", "Status", ""]}>
          {services.map((s) => (
            <tr key={s.id}>
              <Td className="font-mono text-[13px]">{s.code}</Td>
              <Td>{s.name}</Td>
              <Td>
                <MoneyText ore={s.customerPriceOre} />
              </Td>
              <Td className="text-muted">
                {s.warrantyDays != null ? `${s.warrantyDays} dager` : "—"}
              </Td>
              <Td className="text-muted">{s.active ? "Aktiv" : "Inaktiv"}</Td>
              <Td>
                {s.active ? (
                  <form action={deactivateServiceAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Deaktiver
                    </Button>
                  </form>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
