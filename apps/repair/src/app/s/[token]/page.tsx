import { notFound } from "next/navigation";
import { customerStatusTone } from "@/lib/customer-progress";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { getPublicRepairByToken } from "@/server/public-status";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<
  ReturnType<typeof customerStatusTone>,
  string
> = {
  progress: "bg-[var(--cs-teal-soft)] text-[var(--cs-teal)]",
  waiting: "bg-[var(--cs-amber-soft)] text-[var(--cs-amber)]",
  ready: "bg-[var(--cs-ready-soft)] text-[var(--cs-ready)]",
  done: "bg-[var(--cs-ready-soft)] text-[var(--cs-ready)]",
  alert: "bg-[var(--cs-alert-soft)] text-[var(--cs-alert)]",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cs-muted)]">
      {children}
    </p>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.35rem] border border-[var(--cs-line)] bg-[var(--cs-card)] px-5 py-5 shadow-[0_1px_2px_rgba(20,32,31,0.04),0_12px_32px_rgba(20,32,31,0.05)] backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}

export default async function CustomerStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicRepairByToken(token);
  if (!data) notFound();

  const ticketShort = data.ticketNumber.replace(/^REP-/, "");
  const tone = customerStatusTone(data.status);
  const currentStep =
    data.progress.find((s) => s.state === "current") ??
    data.progress.find((s) => s.state === "done");
  const doneCount = data.progress.filter((s) => s.state === "done").length;
  const progressPct = Math.round(
    ((doneCount + (currentStep?.state === "current" ? 0.45 : 0)) /
      Math.max(data.progress.length, 1)) *
      100,
  );

  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-14">
      <header className="cs-enter mb-8 lg:mb-10">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--cs-teal)]">
          SD Solutions
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-[var(--cs-ink)] lg:text-[34px]">
          Reparasjonsstatus
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--cs-muted)]">
          Følg saken din hos verkstedet — samme oversikt du ville fått over
          disk.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        <Panel className="cs-enter-delay lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--cs-muted)]">
                Saksnummer
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--cs-ink)]">
                REP-{ticketShort}
              </p>
              <p className="mt-1 text-sm leading-snug text-[var(--cs-muted)]">
                {data.deviceLabel}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_PILL[tone]}`}
            >
              {data.statusLabel}
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--cs-muted)]">
              <span>
                {currentStep
                  ? `Nå: ${currentStep.label}`
                  : "Status oppdateres fortløpende"}
              </span>
              <span>{Math.min(progressPct, 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-[var(--cs-teal)] transition-[width] duration-500"
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
          </div>

          {data.diagnosisText ? (
            <p className="mt-5 text-sm leading-relaxed text-zinc-700">
              {data.diagnosisText}
            </p>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">
              Diagnostikk pågår. Problembeskrivelse kommer når undersøkelsen er
              ferdig.
            </p>
          )}

          <dl className="mt-5 grid gap-3 border-t border-[var(--cs-line)] pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] text-[var(--cs-muted)]">Tekniker</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--cs-ink)]">
                {data.technicianName}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--cs-muted)]">
                Estimert ferdig
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--cs-ink)]">
                {formatDateOnly(data.estimatedCompletionDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--cs-muted)]">Pris</dt>
              <dd
                className={
                  data.customerPriceLabel
                    ? "mt-1 text-sm font-semibold text-[var(--cs-ink)]"
                    : "mt-1 text-sm font-medium text-zinc-400"
                }
              >
                {data.customerPriceLabel ?? "Avventer"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-snug text-[var(--cs-muted)]">
            Estimert klar for henting — ikke en garantert dato.
          </p>
        </Panel>

        <Panel className="cs-enter-delay lg:col-span-5">
          <SectionTitle>Fremdrift</SectionTitle>
          <ol className="relative mt-5">
            {data.progress.map((step, index) => {
              const isLast = index === data.progress.length - 1;
              return (
                <li
                  key={step.key}
                  className="relative flex gap-3.5 pb-5 last:pb-0"
                >
                  {!isLast ? (
                    <span
                      aria-hidden
                      className={`absolute left-[9px] top-5 h-[calc(100%-10px)] w-px ${
                        data.progress[index + 1]?.state === "todo"
                          ? "bg-zinc-200"
                          : "bg-[var(--cs-teal)]/45"
                      }`}
                    />
                  ) : null}
                  <span className="relative z-[1] mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                    {step.state === "done" ? (
                      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--cs-teal)] text-white">
                        <svg
                          viewBox="0 0 12 12"
                          className="h-2.5 w-2.5"
                          aria-hidden
                        >
                          <path
                            d="M2.5 6.2 4.8 8.5 9.5 3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : step.state === "current" ? (
                      <span className="cs-pulse flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--cs-teal)]/15 ring-2 ring-[var(--cs-teal)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--cs-teal)]" />
                      </span>
                    ) : (
                      <span className="h-[18px] w-[18px] rounded-full border border-zinc-300 bg-white" />
                    )}
                  </span>
                  <div className="min-w-0 pt-px">
                    <p
                      className={
                        step.state === "todo"
                          ? "text-sm text-zinc-400"
                          : step.state === "current"
                            ? "text-sm font-semibold text-[var(--cs-ink)]"
                            : "text-sm text-zinc-700"
                      }
                    >
                      {step.label}
                    </p>
                    {step.state === "current" ? (
                      <p className="mt-0.5 text-[11px] text-[var(--cs-teal)]">
                        Pågår nå
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        {(data.services.length > 0 ||
          data.discount ||
          data.parts.length > 0) && (
          <Panel
            className={`cs-enter-delay-2 ${
              data.updates.length > 0 ? "lg:col-span-6" : "lg:col-span-12"
            }`}
          >
            {data.services.length > 0 || data.discount ? (
              <div className={data.parts.length > 0 ? "mb-5" : ""}>
                <SectionTitle>Tjenester</SectionTitle>
                <ul className="mt-3 space-y-2.5">
                  {data.services.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start gap-2 text-sm text-[var(--cs-ink)]"
                    >
                      <span
                        aria-hidden
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--cs-teal)]"
                      />
                      <span>{s.name}</span>
                    </li>
                  ))}
                </ul>
                {data.discount ? (
                  <p className="mt-2.5 text-sm text-[var(--cs-muted)]">
                    {data.discount.label}: −{data.discount.amountLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            {data.parts.length > 0 ? (
              <div>
                <SectionTitle>Deler</SectionTitle>
                <ul className="mt-3 space-y-2.5">
                  {data.parts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 text-sm text-[var(--cs-ink)]"
                    >
                      <span>
                        {p.quantity > 1 ? `${p.quantity} × ` : ""}
                        {p.name}
                      </span>
                      {p.status === "ordered" ? (
                        <span className="rounded-full bg-[var(--cs-amber-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--cs-amber)]">
                          Bestilt
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
        )}

        {data.updates.length > 0 ? (
          <Panel
            className={`cs-enter-delay-2 ${
              data.services.length > 0 ||
              data.discount ||
              data.parts.length > 0
                ? "lg:col-span-6"
                : "lg:col-span-12"
            }`}
          >
            <SectionTitle>Oppdateringer</SectionTitle>
            <ul className="mt-4 space-y-4">
              {data.updates.map((u) => (
                <li
                  key={u.id}
                  className="border-b border-[var(--cs-line)] pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-[11px] text-[var(--cs-muted)]">
                    {formatDate(u.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {u.content}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {data.photos.length > 0 ? (
          <Panel className="cs-enter-delay-2 lg:col-span-12">
            <SectionTitle>Bilder</SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {data.photos.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-[var(--cs-line)] bg-white/70"
                >
                  {p.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.description || "Dokumentasjon"}
                      className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.02] lg:h-36"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs text-zinc-400 lg:h-36">
                      Fil
                    </div>
                  )}
                </a>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>

      <footer className="cs-enter-delay-2 mt-10 text-center text-[11px] text-[var(--cs-muted)] lg:mt-12">
        <p>SD Solutions · Slåttmyrvegen 49, 2406 Elverum</p>
        <p className="mt-1">Spørsmål? Kontakt verkstedet direkte.</p>
      </footer>
    </main>
  );
}
