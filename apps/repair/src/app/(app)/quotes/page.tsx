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
import { Textarea } from "@/components/ui/Textarea";
import { formatDate, parseKrToOre } from "@/lib/labels";
import { listCustomers } from "@/server/customers";
import { createQuote, listQuotes, updateQuoteStatus } from "@/server/quotes";

async function createQuoteAction(formData: FormData) {
  "use server";
  const quote = await createQuote({
    customerId: String(formData.get("customerId") || ""),
    notes: String(formData.get("notes") || "") || null,
    items: [
      {
        kind: "CUSTOM",
        description: String(formData.get("itemDescription") || ""),
        quantity: Number(formData.get("quantity") || 1),
        unitPriceOre: parseKrToOre(formData.get("unitPriceKr")),
      },
    ],
  });
  redirect("/quotes");
  return quote;
}

async function updateStatusAction(formData: FormData) {
  "use server";
  await updateQuoteStatus(
    String(formData.get("id")),
    String(formData.get("status")) as
      | "DRAFT"
      | "SENT"
      | "ACCEPTED"
      | "REJECTED"
      | "EXPIRED"
      | "CANCELLED",
  );
  redirect("/quotes");
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const [quotes, customers] = await Promise.all([
    listQuotes(),
    listCustomers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Tilbud"
        description="Enkle tilbud til kunder."
        actions={
          <Link href="/quotes?new=1">
            <Button type="button">Nytt tilbud</Button>
          </Link>
        }
      />

      {params.new === "1" ? (
        <form
          action={createQuoteAction}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 text-sm font-medium">Nytt tilbud</div>
          <div className="sm:col-span-2">
            <Label htmlFor="customerId">Kunde</Label>
            <Select id="customerId" name="customerId" required className="mt-1.5">
              <option value="">Velg…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="itemDescription">Linje</Label>
            <Input
              id="itemDescription"
              name="itemDescription"
              required
              placeholder="F.eks. Skjermbytte iPhone 13"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="quantity">Antall</Label>
            <Input id="quantity" name="quantity" type="number" defaultValue={1} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="unitPriceKr">Enhetspris (kr)</Label>
            <Input id="unitPriceKr" name="unitPriceKr" required className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notater</Label>
            <Textarea id="notes" name="notes" className="mt-1.5" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Opprett</Button>
            <Link href="/quotes">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {quotes.length === 0 ? (
        <EmptyState
          title="Ingen tilbud"
          action={
            <Link href="/quotes?new=1">
              <Button type="button">Nytt tilbud</Button>
            </Link>
          }
        />
      ) : (
        <DataTable headers={["Opprettet", "Status", "Total", ""]}>
          {quotes.map((q) => (
            <tr key={q.id}>
              <Td className="text-muted">{formatDate(q.createdAt)}</Td>
              <Td>{q.status}</Td>
              <Td>
                <MoneyText ore={q.totalOre} />
              </Td>
              <Td>
                <form action={updateStatusAction} className="flex gap-2">
                  <input type="hidden" name="id" value={q.id} />
                  <Select name="status" defaultValue={q.status} className="w-36">
                    <option value="DRAFT">Utkast</option>
                    <option value="SENT">Sendt</option>
                    <option value="ACCEPTED">Akseptert</option>
                    <option value="REJECTED">Avvist</option>
                    <option value="EXPIRED">Utløpt</option>
                    <option value="CANCELLED">Kansellert</option>
                  </Select>
                  <Button type="submit" size="sm" variant="secondary">
                    Oppdater
                  </Button>
                </form>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
