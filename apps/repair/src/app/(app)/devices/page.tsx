import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { createDevice, listDevices } from "@/server/devices";
import { listCustomers } from "@/server/customers";

async function createDeviceAction(formData: FormData) {
  "use server";
  const batteryRaw = String(formData.get("batteryHealth") || "");
  const row = await createDevice({
    brand: String(formData.get("brand") || "Apple"),
    model: String(formData.get("model") || ""),
    variant: String(formData.get("variant") || "") || null,
    storage: String(formData.get("storage") || "") || null,
    color: String(formData.get("color") || "") || null,
    serialNumber: String(formData.get("serialNumber") || "") || null,
    imei: String(formData.get("imei") || "") || null,
    batteryHealth: batteryRaw ? Number(batteryRaw) : null,
    condition: String(formData.get("condition") || "") || null,
    ownershipType: (String(formData.get("ownershipType") || "CUSTOMER") as
      | "CUSTOMER"
      | "SD_SOLUTIONS"
      | "UNKNOWN"),
    customerId: String(formData.get("customerId") || "") || null,
  });
  redirect(`/devices/${row.id}`);
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string; customerId?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const showNew = params.new === "1";
  const [devices, customers] = await Promise.all([
    listDevices(q),
    listCustomers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Enheter"
        description="Telefoner og enheter knyttet til kunder eller SD Solutions."
        actions={
          <Link href="/devices?new=1">
            <Button type="button">Ny enhet</Button>
          </Link>
        }
      />

      <form className="mb-6 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Søk modell, IMEI, serienummer…"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Søk
        </Button>
      </form>

      {showNew ? (
        <form
          action={createDeviceAction}
          className="mb-8 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-foreground">Ny enhet</p>
          </div>
          <div>
            <Label htmlFor="brand">Merke</Label>
            <Input
              id="brand"
              name="brand"
              defaultValue="Apple"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="model">Modell *</Label>
            <Input id="model" name="model" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="storage">Lagring</Label>
            <Input id="storage" name="storage" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="color">Farge</Label>
            <Input id="color" name="color" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="imei">IMEI</Label>
            <Input id="imei" name="imei" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="serialNumber">Serienummer</Label>
            <Input id="serialNumber" name="serialNumber" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="batteryHealth">Batterihelse %</Label>
            <Input
              id="batteryHealth"
              name="batteryHealth"
              type="number"
              min={0}
              max={100}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ownershipType">Eierskap</Label>
            <Select
              id="ownershipType"
              name="ownershipType"
              defaultValue="CUSTOMER"
              className="mt-1.5"
            >
              <option value="CUSTOMER">Kunde</option>
              <option value="SD_SOLUTIONS">SD Solutions</option>
              <option value="UNKNOWN">Ukjent</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="customerId">Kunde</Label>
            <Select
              id="customerId"
              name="customerId"
              defaultValue={params.customerId ?? ""}
              className="mt-1.5"
            >
              <option value="">— Ingen —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Lagre enhet</Button>
            <Link href="/devices">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {devices.length === 0 ? (
        <EmptyState
          title="Ingen enheter"
          description="Registrer en enhet for å knytte den til reparasjoner."
          action={
            <Link href="/devices?new=1">
              <Button type="button">Ny enhet</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Enhet", "IMEI / SN", "Eierskap", "Batteri"]}
        >
          {devices.map((d) => (
            <tr key={d.id} className="hover:bg-white/[0.03]">
              <Td>
                <Link
                  href={`/devices/${d.id}`}
                  className="font-medium hover:text-accent"
                >
                  {d.brand} {d.model}
                  {d.storage ? ` ${d.storage}` : ""}
                </Link>
              </Td>
              <Td className="text-muted">
                {d.imei || d.serialNumber || "—"}
              </Td>
              <Td className="text-muted">{d.ownershipType}</Td>
              <Td className="text-muted">
                {d.batteryHealth != null ? `${d.batteryHealth}%` : "—"}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
