import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { listDevices } from "@/server/devices";
import { listCustomers } from "@/server/customers";
import { DeviceCreateForm } from "./DeviceCreateForm";

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
        <DeviceCreateForm
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          defaultCustomerId={params.customerId}
        />
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
        <DataTable headers={["Enhet", "IMEI / SN", "Eierskap", "Batteri"]}>
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
