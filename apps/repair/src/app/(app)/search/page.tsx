import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FlipStatusBadge, RepairStatusBadge } from "@/components/ui/StatusBadge";
import { globalSearch } from "@/server/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const results = q.trim().length >= 2 ? await globalSearch(q) : null;

  const empty =
    results &&
    results.customers.length === 0 &&
    results.tickets.length === 0 &&
    results.devices.length === 0 &&
    results.parts.length === 0 &&
    results.flips.length === 0;

  return (
    <div>
      <PageHeader
        title="Søk"
        description="Søk på tvers av kunder, tickets, enheter, deler og flips."
      />

      <form className="mb-8 flex max-w-lg gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Søk…"
          autoFocus
        />
        <Button type="submit" variant="secondary">
          Søk
        </Button>
      </form>

      {!q || q.trim().length < 2 ? (
        <EmptyState
          title="Skriv minst 2 tegn"
          description="Bruk søkefeltet i topbaren eller her."
        />
      ) : empty ? (
        <EmptyState title={`Ingen treff for «${q}»`} />
      ) : results ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <ResultCard title="Kunder">
            {results.customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="block rounded-xl border border-border px-3 py-2 hover:bg-white/[0.03]"
              >
                {c.name}
              </Link>
            ))}
          </ResultCard>
          <ResultCard title="Reparasjoner">
            {results.tickets.map((t) => (
              <Link
                key={t.id}
                href={`/repairs/${t.id}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 hover:bg-white/[0.03]"
              >
                <span>{t.ticketNumber}</span>
                <RepairStatusBadge status={t.status} />
              </Link>
            ))}
          </ResultCard>
          <ResultCard title="Enheter">
            {results.devices.map((d) => (
              <Link
                key={d.id}
                href={`/devices/${d.id}`}
                className="block rounded-xl border border-border px-3 py-2 hover:bg-white/[0.03]"
              >
                {d.brand} {d.model}
              </Link>
            ))}
          </ResultCard>
          <ResultCard title="Deler">
            {results.parts.map((p) => (
              <Link
                key={p.id}
                href="/inventory/parts"
                className="block rounded-xl border border-border px-3 py-2 hover:bg-white/[0.03]"
              >
                {p.sku} · {p.name}
              </Link>
            ))}
          </ResultCard>
          <ResultCard title="Flips">
            {results.flips.map((f) => (
              <Link
                key={f.id}
                href={`/refurbishment/${f.id}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 hover:bg-white/[0.03]"
              >
                <span>
                  {f.flipNumber} · {f.model}
                </span>
                <FlipStatusBadge status={f.status} />
              </Link>
            ))}
          </ResultCard>
        </div>
      ) : null}
    </div>
  );
}

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  if (items.filter(Boolean).length === 0) return null;
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="space-y-2">{children}</CardBody>
    </Card>
  );
}
