import { notFound } from "next/navigation";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { getPublicRepairByToken } from "@/server/public-status";

export default async function CustomerStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicRepairByToken(token);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,163,196,0.12),_transparent_55%)]" />
      <main className="relative mx-auto max-w-lg px-4 pb-16 pt-10 sm:pt-14">
        <header className="mb-8">
          <p className="text-[13px] font-medium tracking-[0.18em] text-accent uppercase">
            SD Solutions
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em]">
            Reparasjon {data.ticketNumber.replace(/^REP-/, "#")}
          </h1>
          <p className="mt-2 text-lg text-muted">{data.deviceLabel}</p>
        </header>

        <section className="rounded-2xl border border-border bg-surface/80 px-5 py-5 backdrop-blur">
          <p className="text-[13px] text-muted">Status</p>
          <p className="mt-2 text-xl font-medium tracking-[-0.02em]">
            <span className="mr-2" aria-hidden>
              {data.statusEmoji}
            </span>
            {data.statusLabel}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-surface/80 px-5 py-5">
          <p className="text-[13px] text-muted">Fremdrift</p>
          <ol className="mt-4 space-y-3">
            {data.progress.map((step) => (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    step.state === "done"
                      ? "text-success"
                      : step.state === "current"
                        ? "text-accent"
                        : "text-muted/50"
                  }
                  aria-hidden
                >
                  {step.state === "done"
                    ? "✓"
                    : step.state === "current"
                      ? "●"
                      : "○"}
                </span>
                <span
                  className={
                    step.state === "todo" ? "text-muted" : "text-foreground"
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface/80 px-5 py-5">
            <p className="text-[13px] text-muted">Tekniker</p>
            <p className="mt-2 text-base">{data.technicianName}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/80 px-5 py-5">
            <p className="text-[13px] text-muted">Estimert ferdig</p>
            <p className="mt-2 text-base">
              {formatDateOnly(data.estimatedCompletionDate)}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Estimert klar for henting — ikke en garantert dato.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-surface/80 px-5 py-5">
          <p className="text-[13px] text-muted">Problem</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {data.customerProblem}
          </p>
        </section>

        {data.customerPriceLabel ? (
          <section className="mt-5 rounded-2xl border border-border bg-surface/80 px-5 py-5">
            <p className="text-[13px] text-muted">Pris</p>
            <p className="mt-2 text-lg">{data.customerPriceLabel}</p>
          </section>
        ) : null}

        {data.updates.length > 0 ? (
          <section className="mt-5 rounded-2xl border border-border bg-surface/80 px-5 py-5">
            <p className="text-[13px] text-muted">Oppdateringer</p>
            <ul className="mt-4 space-y-4">
              {data.updates.map((u) => (
                <li key={u.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="text-[12px] text-muted">{formatDate(u.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{u.content}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.photos.length > 0 ? (
          <section className="mt-5 rounded-2xl border border-border bg-surface/80 px-5 py-5">
            <p className="text-[13px] text-muted">Bilder</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {data.photos.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-border"
                >
                  {p.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.description || "Dokumentasjon"}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-[12px] text-muted">
                      Fil
                    </div>
                  )}
                  {p.description ? (
                    <p className="truncate px-2 py-1 text-[11px] text-muted">
                      {p.description}
                    </p>
                  ) : null}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-10 text-center text-[12px] text-muted">
          <p>SD Solutions · Slåttmyrvegen 49, 2406 Elverum</p>
          <p className="mt-1">Spørsmål? Kontakt verkstedet direkte.</p>
        </footer>
      </main>
    </div>
  );
}
