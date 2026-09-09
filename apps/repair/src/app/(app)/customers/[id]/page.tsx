import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BillingAddressFields } from "@/components/forms/BillingAddressFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RepairStatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate } from "@/lib/labels";
import { getCustomerProfile, updateCustomer } from "@/server/customers";

async function updateCustomerAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await updateCustomer(id, {
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    streetAddress: String(formData.get("streetAddress") || ""),
    postalCode: String(formData.get("postalCode") || ""),
    city: String(formData.get("city") || ""),
    country: String(formData.get("country") || "Norge"),
    notes: String(formData.get("notes") || "") || null,
  });
  redirect(`/customers/${id}`);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCustomerProfile(id);
  if (!profile) notFound();
  const { customer, devices, repairs, stats } = profile;

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.email, customer.address]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Link href={`/repairs/new?customerId=${customer.id}`}>
            <Button type="button">Ny reparasjon</Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Enheter</p>
            <p className="mt-2 text-2xl font-medium">{stats.deviceCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Reparasjoner</p>
            <p className="mt-2 text-2xl font-medium">{stats.repairCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Åpne</p>
            <p className="mt-2 text-2xl font-medium">{stats.openRepairs}</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Faktureringsinformasjon" />
          <CardBody>
            <form action={updateCustomerAction} className="grid gap-3">
              <input type="hidden" name="id" value={customer.id} />
              <div>
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={customer.name}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={customer.phone ?? ""}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email">E-post *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
                  required
                  className="mt-1.5"
                />
              </div>
              <BillingAddressFields
                defaults={{
                  streetAddress: customer.streetAddress ?? "",
                  postalCode: customer.postalCode ?? "",
                  city: customer.city ?? "",
                  country: customer.country ?? "Norge",
                }}
              />
              <div>
                <Label htmlFor="notes">Interne notater</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={customer.notes ?? ""}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit">Lagre endringer</Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Enheter" />
            <CardBody className="space-y-2">
              {devices.length === 0 ? (
                <EmptyState
                  title="Ingen enheter"
                  action={
                    <Link href={`/devices?new=1&customerId=${customer.id}`}>
                      <Button type="button" size="sm">
                        Ny enhet
                      </Button>
                    </Link>
                  }
                />
              ) : (
                devices.map((d) => (
                  <Link
                    key={d.id}
                    href={`/devices/${d.id}`}
                    className="block rounded-xl border border-border px-3 py-2.5 hover:bg-white/[0.03]"
                  >
                    <p className="text-sm text-foreground">
                      {d.brand} {d.model}
                      {d.storage ? ` · ${d.storage}` : ""}
                    </p>
                    <p className="text-[12px] text-muted">
                      {d.imei || d.serialNumber || "—"}
                    </p>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reparasjoner" />
            <CardBody className="space-y-2">
              {repairs.length === 0 ? (
                <EmptyState
                  title="Ingen reparasjoner"
                  action={
                    <Link href={`/repairs/new?customerId=${customer.id}`}>
                      <Button type="button" size="sm">
                        Ny reparasjon
                      </Button>
                    </Link>
                  }
                />
              ) : (
                repairs.map((r) => (
                  <Link
                    key={r.id}
                    href={`/repairs/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-sm text-foreground">{r.ticketNumber}</p>
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
    </div>
  );
}
