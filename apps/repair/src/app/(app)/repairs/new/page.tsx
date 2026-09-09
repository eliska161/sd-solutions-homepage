import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { listCustomers } from "@/server/customers";
import { createDevice, listDevices } from "@/server/devices";
import { createRepair } from "@/server/repairs";

async function createRepairAction(formData: FormData) {
  "use server";
  const customerId = String(formData.get("customerId") || "");
  let deviceId = String(formData.get("deviceId") || "");
  const createNewDevice = formData.get("createNewDevice") === "on";

  if (createNewDevice || !deviceId) {
    const model = String(formData.get("newModel") || "");
    if (!model) throw new Error("Modell er påkrevd for ny enhet");
    const device = await createDevice({
      brand: String(formData.get("newBrand") || "Apple"),
      model,
      storage: String(formData.get("newStorage") || "") || null,
      color: String(formData.get("newColor") || "") || null,
      imei: String(formData.get("newImei") || "") || null,
      ownershipType: "CUSTOMER",
      customerId,
    });
    deviceId = device.id;
  }

  const repair = await createRepair({
    customerId,
    deviceId,
    customerProblem: String(formData.get("customerProblem") || ""),
    physicalCondition: String(formData.get("physicalCondition") || "") || null,
  });
  redirect(`/repairs/${repair.id}`);
}

export default async function NewRepairPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const params = await searchParams;
  const [customers, devices] = await Promise.all([
    listCustomers(),
    listDevices(),
  ]);

  return (
    <div>
      <PageHeader
        title="Ny reparasjon"
        description="Velg kunde og enhet, eller opprett enhet samtidig."
      />

      <form
        action={createRepairAction}
        className="max-w-2xl space-y-5 rounded-2xl border border-border bg-surface p-5"
      >
        <div>
          <Label htmlFor="customerId">Kunde *</Label>
          <Select
            id="customerId"
            name="customerId"
            required
            defaultValue={params.customerId ?? ""}
            className="mt-1.5"
          >
            <option value="">Velg kunde…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[12px] text-muted">
            Mangler kunde?{" "}
            <Link href="/customers?new=1" className="text-accent">
              Opprett først
            </Link>
          </p>
        </div>

        <div>
          <Label htmlFor="deviceId">Eksisterende enhet</Label>
          <Select id="deviceId" name="deviceId" className="mt-1.5">
            <option value="">— Opprett ny under —</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.brand} {d.model}
                {d.imei ? ` · ${d.imei}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="rounded-xl border border-border p-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="createNewDevice" defaultChecked />
            Opprett ny enhet
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="newBrand">Merke</Label>
              <Input
                id="newBrand"
                name="newBrand"
                defaultValue="Apple"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newModel">Modell</Label>
              <Input id="newModel" name="newModel" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="newStorage">Lagring</Label>
              <Input id="newStorage" name="newStorage" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="newColor">Farge</Label>
              <Input id="newColor" name="newColor" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="newImei">IMEI</Label>
              <Input id="newImei" name="newImei" className="mt-1.5" />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="customerProblem">Problembeskrivelse *</Label>
          <Textarea
            id="customerProblem"
            name="customerProblem"
            required
            className="mt-1.5"
            placeholder="F.eks. sprukket skjerm, ingen lading…"
          />
        </div>
        <div>
          <Label htmlFor="physicalCondition">Fysisk tilstand</Label>
          <Textarea
            id="physicalCondition"
            name="physicalCondition"
            className="mt-1.5"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Opprett ticket</Button>
          <Link href="/repairs">
            <Button type="button" variant="ghost">
              Avbryt
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
