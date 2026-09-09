import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RepairStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/labels";
import { getDevice, getDeviceHistory } from "@/server/devices";
import { getCustomer } from "@/server/customers";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = await getDevice(id);
  if (!device) notFound();
  const [history, customer] = await Promise.all([
    getDeviceHistory(id),
    device.customerId ? getCustomer(device.customerId) : Promise.resolve(null),
  ]);

  return (
    <div>
      <PageHeader
        title={`${device.brand} ${device.model}`}
        description={[device.storage, device.color, device.variant]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Detaljer" />
          <CardBody className="space-y-2 text-sm">
            <p>
              <span className="text-muted">IMEI: </span>
              {device.imei || "—"}
            </p>
            <p>
              <span className="text-muted">Serienummer: </span>
              {device.serialNumber || "—"}
            </p>
            <p>
              <span className="text-muted">Batteri: </span>
              {device.batteryHealth != null ? `${device.batteryHealth}%` : "—"}
            </p>
            <p>
              <span className="text-muted">Tilstand: </span>
              {device.condition || "—"}
            </p>
            <p>
              <span className="text-muted">Eierskap: </span>
              {device.ownershipType}
            </p>
            <p>
              <span className="text-muted">Kunde: </span>
              {customer ? (
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-accent"
                >
                  {customer.name}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Reparasjonshistorikk" />
          <CardBody className="space-y-2">
            {history.length === 0 ? (
              <EmptyState title="Ingen reparasjoner på denne enheten" />
            ) : (
              history.map((r) => (
                <Link
                  key={r.id}
                  href={`/repairs/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-sm">{r.ticketNumber}</p>
                    <p className="text-[12px] text-muted">
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <RepairStatusBadge status={r.status} />
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
