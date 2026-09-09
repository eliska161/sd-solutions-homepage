import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlipStatusBadge } from "@/components/ui/StatusBadge";
import { MoneyText } from "@/components/ui/MoneyText";
import { listCandidates, listFlips } from "@/server/flips";

export default async function RefurbishmentDashboardPage() {
  const [candidates, flips] = await Promise.all([
    listCandidates(),
    listFlips(),
  ]);

  const active = flips.filter(
    (f) => !["SOLD", "ARCHIVED"].includes(f.status),
  );
  const ready = flips.filter((f) => f.status === "READY_TO_LIST");
  const listed = flips.filter((f) => f.status === "LISTED");
  const sold = flips.filter((f) => f.status === "SOLD");

  const cards = [
    { label: "Kandidater", value: candidates.length, href: "/refurbishment/candidates" },
    { label: "Aktive", value: active.length, href: "/refurbishment/active" },
    { label: "Klar for salg", value: ready.length, href: "/refurbishment/ready" },
    { label: "Listet", value: listed.length, href: "/refurbishment/listed" },
    { label: "Solgt", value: sold.length, href: "/refurbishment/sold" },
  ];

  return (
    <div>
      <PageHeader
        title="Flipping"
        description="Kandidater, aktive flips og salg."
        actions={
          <Link href="/refurbishment/candidates?new=1">
            <Button type="button">Ny kandidat</Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-border bg-surface px-5 py-5 hover:border-white/16"
          >
            <p className="text-[13px] text-muted">{c.label}</p>
            <p className="mt-2 text-3xl font-medium">{c.value}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium">Siste flips</h2>
      {flips.length === 0 ? (
        <EmptyState
          title="Ingen flips"
          action={
            <Link href="/refurbishment/candidates?new=1">
              <Button type="button">Ny kandidat</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {flips.slice(0, 10).map((f) => (
            <Link
              key={f.id}
              href={`/refurbishment/${f.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-white/[0.03]"
            >
              <div>
                <p className="text-sm">
                  {f.flipNumber} · {f.model}
                </p>
                <p className="text-[12px] text-muted">
                  Est. fortjeneste{" "}
                  <MoneyText ore={f.estimatedProfitOre} />
                </p>
              </div>
              <FlipStatusBadge status={f.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
