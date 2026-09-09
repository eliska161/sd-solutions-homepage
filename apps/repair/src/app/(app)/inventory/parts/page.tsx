import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { MoneyText } from "@/components/ui/MoneyText";
import { Select } from "@/components/ui/Select";
import { parseKrToOre } from "@/lib/labels";
import { createPart, listParts, receiveStock } from "@/server/parts";

async function createPartAction(formData: FormData) {
  "use server";
  await createPart({
    sku: String(formData.get("sku") || ""),
    name: String(formData.get("name") || ""),
    category: String(formData.get("category") || "") || null,
    brand: String(formData.get("brand") || "") || null,
    partType: (String(formData.get("partType") || "OTHER") as
      | "OEM"
      | "ORIGINAL_PULL"
      | "SOFT_OLED"
      | "HARD_OLED"
      | "LCD"
      | "INCELL"
      | "BATTERY"
      | "FLEX"
      | "OTHER"),
    costPriceOre: parseKrToOre(formData.get("costPriceKr")),
    sellPriceOre: parseKrToOre(formData.get("sellPriceKr")) || null,
    quantityOnHand: Number(formData.get("quantityOnHand") || 0),
    minimumStock: Number(formData.get("minimumStock") || 0),
    location: String(formData.get("location") || "") || null,
  });
  redirect("/inventory/parts");
}

async function receiveStockAction(formData: FormData) {
  "use server";
  await receiveStock({
    partId: String(formData.get("partId") || ""),
    quantity: Number(formData.get("quantity") || 0),
    unitCostOre: parseKrToOre(formData.get("unitCostKr")) || undefined,
    note: String(formData.get("note") || "") || undefined,
  });
  redirect("/inventory/parts");
}

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string; receive?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const parts = await listParts(q);

  return (
    <div>
      <PageHeader
        title="Deler"
        description="Reservedelskatalog og beholdning."
        actions={
          <div className="flex gap-2">
            <Link href="/inventory/parts?receive=1">
              <Button type="button" variant="secondary">
                Motta lager
              </Button>
            </Link>
            <Link href="/inventory/parts?new=1">
              <Button type="button">Ny del</Button>
            </Link>
          </div>
        }
      />

      <form className="mb-6 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Søk SKU eller navn…"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Søk
        </Button>
      </form>

      {params.new === "1" ? (
        <form
          action={createPartAction}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 text-sm font-medium">Ny del</div>
          <div>
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" name="sku" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="name">Navn *</Label>
            <Input id="name" name="name" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="partType">Type</Label>
            <Select id="partType" name="partType" defaultValue="OTHER" className="mt-1.5">
              <option value="OEM">OEM</option>
              <option value="ORIGINAL_PULL">Original pull</option>
              <option value="SOFT_OLED">Soft OLED</option>
              <option value="HARD_OLED">Hard OLED</option>
              <option value="LCD">LCD</option>
              <option value="INCELL">Incell</option>
              <option value="BATTERY">Batteri</option>
              <option value="FLEX">Flex</option>
              <option value="OTHER">Annet</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Kategori</Label>
            <Input id="category" name="category" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="costPriceKr">Kostpris (kr)</Label>
            <Input id="costPriceKr" name="costPriceKr" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="sellPriceKr">Salgspris (kr)</Label>
            <Input id="sellPriceKr" name="sellPriceKr" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="quantityOnHand">Antall</Label>
            <Input
              id="quantityOnHand"
              name="quantityOnHand"
              type="number"
              defaultValue={0}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="minimumStock">Minimum</Label>
            <Input
              id="minimumStock"
              name="minimumStock"
              type="number"
              defaultValue={0}
              className="mt-1.5"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Lagre</Button>
            <Link href="/inventory/parts">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {params.receive === "1" ? (
        <form
          action={receiveStockAction}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 text-sm font-medium">Motta lager</div>
          <div className="sm:col-span-2">
            <Label htmlFor="partId">Del</Label>
            <Select id="partId" name="partId" required className="mt-1.5">
              <option value="">Velg…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Antall</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="unitCostKr">Enhetskost (kr)</Label>
            <Input id="unitCostKr" name="unitCostKr" className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="note">Notat</Label>
            <Input id="note" name="note" className="mt-1.5" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Registrer mottak</Button>
            <Link href="/inventory/parts">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {parts.length === 0 ? (
        <EmptyState
          title="Ingen deler"
          description="Opprett første reservedel i katalogen."
          action={
            <Link href="/inventory/parts?new=1">
              <Button type="button">Ny del</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["SKU", "Navn", "På lager", "Min", "Kost", "Status"]}
        >
          {parts.map((p) => (
            <tr key={p.id}>
              <Td className="font-mono text-[13px]">{p.sku}</Td>
              <Td>{p.name}</Td>
              <Td
                className={
                  p.quantityOnHand <= p.minimumStock ? "text-warning" : ""
                }
              >
                {p.quantityOnHand}
              </Td>
              <Td className="text-muted">{p.minimumStock}</Td>
              <Td>
                <MoneyText ore={p.costPriceOre} />
              </Td>
              <Td className="text-muted">{p.active ? "Aktiv" : "Inaktiv"}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
