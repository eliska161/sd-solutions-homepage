import { PageHeader } from "@/components/layout/PageHeader";
import { listCustomers } from "@/server/customers";
import { listDevices } from "@/server/devices";
import { NewRepairForm } from "./NewRepairForm";

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
        description="Kunde, enhet, problem og tilstand — deretter bilder ved mottak."
      />
      <NewRepairForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        devices={devices.map((d) => ({
          id: d.id,
          brand: d.brand,
          model: d.model,
          imei: d.imei,
          serialNumber: d.serialNumber,
          storage: d.storage,
          color: d.color,
        }))}
        defaultCustomerId={params.customerId}
      />
    </div>
  );
}
