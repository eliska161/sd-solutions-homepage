import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingAddressFields } from "@/components/forms/BillingAddressFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate } from "@/lib/labels";
import { createCustomer, listCustomers } from "@/server/customers";

async function createCustomerAction(formData: FormData) {
  "use server";
  const row = await createCustomer({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    streetAddress: String(formData.get("streetAddress") || ""),
    postalCode: String(formData.get("postalCode") || ""),
    city: String(formData.get("city") || ""),
    country: String(formData.get("country") || "Norge"),
    notes: String(formData.get("notes") || "") || null,
  });
  redirect(`/customers/${row.id}`);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const showNew = params.new === "1";
  const customers = await listCustomers(q);

  return (
    <div>
      <PageHeader
        title="Kunder"
        description="Faktureringsinfo er obligatorisk for alle kunder."
        actions={
          <Link href="/customers?new=1">
            <Button type="button">Ny kunde</Button>
          </Link>
        }
      />

      <form className="mb-6 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Søk navn, e-post eller telefon…"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Søk
        </Button>
      </form>

      {showNew ? (
        <form
          action={createCustomerAction}
          className="mb-8 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-foreground">
              Ny kunde — faktureringsinformasjon
            </p>
          </div>
          <div>
            <Label htmlFor="name">Navn *</Label>
            <Input id="name" name="name" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="phone">Telefon *</Label>
            <Input id="phone" name="phone" required className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">E-post *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <BillingAddressFields />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Interne notater</Label>
            <Textarea id="notes" name="notes" className="mt-1.5" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Lagre kunde</Button>
            <Link href="/customers">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {customers.length === 0 ? (
        <EmptyState
          title="Ingen kunder funnet"
          description={
            q
              ? "Prøv et annet søk, eller opprett en ny kunde."
              : "Opprett første kunde for å starte reparasjoner."
          }
          action={
            <Link href="/customers?new=1">
              <Button type="button">Ny kunde</Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Navn", "Telefon", "E-post", "Adresse", "Sist"]}>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-white/[0.03]">
              <Td>
                <Link
                  href={`/customers/${c.id}`}
                  className="font-medium text-foreground hover:text-accent"
                >
                  {c.name}
                </Link>
              </Td>
              <Td className="text-muted">{c.phone || "—"}</Td>
              <Td className="text-muted">{c.email || "—"}</Td>
              <Td className="max-w-xs truncate text-muted">
                {c.address || "—"}
              </Td>
              <Td className="text-muted">
                {formatDate(c.lastActivityAt ?? c.createdAt)}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
