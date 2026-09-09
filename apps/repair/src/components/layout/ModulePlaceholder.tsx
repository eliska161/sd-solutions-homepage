import { PageHeader } from "@/components/layout/PageHeader";

export function ModulePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-2xl border border-border bg-surface px-6 py-10">
        <p className="text-[13px] font-medium tracking-[0.04em] text-muted uppercase">
          Kommer i {phase}
        </p>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Ruten og navigasjonen er på plass. Domene-logikk, skjemaer og
          databasekobling bygges i de planlagte fasene — se{" "}
          <code className="text-foreground/80">docs/ARCHITECTURE.md</code>.
        </p>
      </div>
    </div>
  );
}
