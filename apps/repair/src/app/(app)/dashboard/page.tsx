import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { RepairStatusBadge, FlipStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { listActivity } from "@/server/activity";
import { listCustomers } from "@/server/customers";
import { getDashboardStats } from "@/server/dashboard";

export default async function DashboardPage() {
  const [stats, customers, activity] = await Promise.all([
    getDashboardStats(),
    listCustomers(),
    listActivity({ limit: 12 }),
  ]);

  const cards = [
    {
      label: "Åpne reparasjoner",
      value: stats.counts.openRepairs,
      href: "/repairs",
    },
    {
      label: "Fullført denne mnd",
      value: stats.counts.completedThisMonth,
      href: "/repairs?status=COMPLETED",
    },
    {
      label: "Kunder",
      value: stats.counts.customers,
      href: "/customers",
    },
    {
      label: "Aktive flips",
      value: stats.counts.activeFlips,
      href: "/refurbishment/active",
    },
    {
      label: "Lavt lager",
      value: stats.counts.lowStock,
      href: "/inventory/parts",
    },
    {
      label: "Omsetning (mnd)",
      valueNode: <MoneyText ore={stats.monthly.totalRevenueOre} />,
      href: "/reports",
    },
  ];

  const recentCustomers = customers.slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Oversikt over verksted, lager og flipping."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-border bg-surface px-5 py-5 transition-colors hover:border-white/16"
          >
            <p className="text-[13px] text-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-medium tracking-[-0.04em] text-foreground">
              {"valueNode" in item && item.valueNode
                ? item.valueNode
                : item.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Siste reparasjoner"
            actions={
              <Link href="/repairs" className="text-[13px] text-accent">
                Se alle
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {stats.recentRepairs.length === 0 ? (
              <EmptyState
                title="Ingen reparasjoner ennå"
                action={
                  <Link href="/repairs/new" className="text-sm text-accent">
                    Ny reparasjon
                  </Link>
                }
              />
            ) : (
              stats.recentRepairs.map((r) => (
                <Link
                  key={r.id}
                  href={`/repairs/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-sm text-foreground">{r.ticketNumber}</p>
                    <p className="text-[12px] text-muted line-clamp-1">
                      {r.customerProblem}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {r.assigneeName || "Tekniker ikke tildelt"}
                      {" · "}
                      Estimert ferdig:{" "}
                      {formatDateOnly(r.estimatedCompletionDate)}
                    </p>
                  </div>
                  <RepairStatusBadge status={r.status} />
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Siste kunder"
            actions={
              <Link href="/customers" className="text-[13px] text-accent">
                Se alle
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {recentCustomers.length === 0 ? (
              <EmptyState
                title="Ingen kunder"
                action={
                  <Link href="/customers" className="text-sm text-accent">
                    Opprett kunde
                  </Link>
                }
              />
            ) : (
              recentCustomers.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-sm text-foreground">{c.name}</p>
                    <p className="text-[12px] text-muted">
                      {c.phone || c.email || "—"}
                    </p>
                  </div>
                  <span className="text-[12px] text-muted">
                    {formatDate(c.lastActivityAt ?? c.createdAt)}
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Flips"
            actions={
              <Link href="/refurbishment" className="text-[13px] text-accent">
                Se alle
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {stats.recentFlips.length === 0 ? (
              <EmptyState
                title="Ingen flips"
                action={
                  <Link
                    href="/refurbishment/candidates"
                    className="text-sm text-accent"
                  >
                    Ny kandidat
                  </Link>
                }
              />
            ) : (
              stats.recentFlips.map((f) => (
                <Link
                  key={f.id}
                  href={`/refurbishment/${f.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-sm text-foreground">{f.flipNumber}</p>
                    <p className="text-[12px] text-muted">{f.model}</p>
                  </div>
                  <FlipStatusBadge status={f.status} />
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Lavt lager"
            actions={
              <Link href="/inventory/parts" className="text-[13px] text-accent">
                Lager
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {stats.lowStock.length === 0 ? (
              <p className="text-sm text-muted">Ingen deler under minimum.</p>
            ) : (
              stats.lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm text-foreground">{p.name}</p>
                    <p className="text-[12px] text-muted">{p.sku}</p>
                  </div>
                  <p className="text-sm text-warning">
                    {p.quantityOnHand} / {p.minimumStock}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Aktivitet" />
        <CardBody className="space-y-2">
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Ingen aktivitet ennå.</p>
          ) : (
            activity.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <div>
                  <p className="text-sm text-foreground">{a.message}</p>
                  <p className="text-[12px] text-muted">
                    {a.type} · {a.entityType}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] text-muted">
                  {formatDate(a.createdAt)}
                </span>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
