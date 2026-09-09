import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";

const attention = [
  { label: "Aktive reparasjoner", value: "—", href: "/repairs" },
  { label: "Venter på kunde", value: "—", href: "/repairs?status=WAITING_FOR_CUSTOMER" },
  { label: "Venter på deler", value: "—", href: "/repairs?status=WAITING_FOR_PART" },
  { label: "Aktive flips", value: "—", href: "/refurbishment/active" },
  { label: "Klar for salg", value: "—", href: "/refurbishment/ready" },
  { label: "Lavt lager", value: "—", href: "/inventory/parts" },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Handlingsorientert oversikt over reparasjoner, flips og lager. Tall kobles til Neon i senere faser."
      />

      <div className="mb-8 rounded-2xl border border-border bg-surface px-5 py-4">
        <p className="text-sm text-foreground">
          Fase 1 er klar: egen app, Neon-skjema, auth-stub og navigasjon.
        </p>
        <p className="mt-1 text-[13px] text-muted">
          Sett <code className="text-foreground/80">DATABASE_URL</code> og kjør
          migrasjoner før fase 2 (login).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attention.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-border bg-surface px-5 py-5 transition-colors hover:border-white/16"
          >
            <p className="text-[13px] text-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-medium tracking-[-0.04em] text-foreground">
              {item.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
