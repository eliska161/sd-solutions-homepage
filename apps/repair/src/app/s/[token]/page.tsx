import {
  CalendarDays,
  Check,
  Circle,
  ClipboardList,
  ImageIcon,
  MessageSquareText,
  Banknote,
  Package,
  Smartphone,
  UserRound,
  Wrench,
} from "lucide-react";
import { notFound } from "next/navigation";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { getPublicRepairByToken } from "@/server/public-status";

export const dynamic = "force-dynamic";

function Section({
  icon: Icon,
  label,
  children,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/8 bg-slate-900/70 px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-sm ${className}`}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
      </div>
      {children}
    </section>
  );
}

function ProgressIcon({ state }: { state: "done" | "current" | "todo" }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/25" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-300" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center text-slate-600">
      <Circle className="h-3.5 w-3.5" aria-hidden />
    </span>
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

  return (
    <main className="relative mx-auto max-w-md px-4 py-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(14,116,144,0.35),_transparent_65%)]"
      />

      <header className="relative mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
          SD Solutions
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          Reparasjon {data.ticketNumber.replace(/^REP-/, "#")}
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
          <Smartphone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <span>{data.deviceLabel}</span>
        </p>
      </header>

      <div className="relative space-y-3">
        <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/80 via-slate-900/90 to-slate-950 px-4 py-4 shadow-[0_10px_32px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/70">
                Status nå
              </p>
              <p className="mt-1.5 text-lg font-semibold text-slate-50">
                {data.statusLabel}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </section>

        <Section icon={ClipboardList} label="Fremdrift">
          <ol className="space-y-2.5">
            {data.progress.map((step) => (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <ProgressIcon state={step.state} />
                <span
                  className={
                    step.state === "todo"
                      ? "text-slate-500"
                      : step.state === "current"
                        ? "font-medium text-cyan-100"
                        : "text-slate-200"
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <div className="grid grid-cols-2 gap-3">
          <Section icon={UserRound} label="Tekniker">
            <p className="text-sm font-medium text-slate-100">
              {data.technicianName}
            </p>
          </Section>
          <Section icon={CalendarDays} label="Estimert ferdig">
            <p className="text-sm font-medium text-slate-100">
              {formatDateOnly(data.estimatedCompletionDate)}
            </p>
          </Section>
        </div>
        <p className="px-1 text-[11px] leading-snug text-slate-500">
          Estimert klar for henting — ikke en garantert dato.
        </p>

        <Section icon={MessageSquareText} label="Problem">
          {data.diagnosisText ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {data.diagnosisText}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">
              Diagnostikk pågår. Tekniker publiserer problembeskrivelse når
              undersøkelsen er ferdig.
            </p>
          )}
        </Section>

        {data.services.length > 0 ? (
          <Section icon={Wrench} label="Tjenester">
            <ul className="space-y-2">
              {data.services.map((s) => (
                <li key={s.id} className="text-sm text-slate-200">
                  {s.name}
                </li>
              ))}
            </ul>
            {data.discount ? (
              <p className="mt-3 text-sm text-amber-300/90">
                {data.discount.label}: −{data.discount.amountLabel}
              </p>
            ) : null}
          </Section>
        ) : data.discount ? (
          <Section icon={Wrench} label="Tjenester">
            <p className="text-sm text-amber-300/90">
              {data.discount.label}: −{data.discount.amountLabel}
            </p>
          </Section>
        ) : null}

        {data.parts.length > 0 ? (
          <Section icon={Package} label="Deler i reparasjonen">
            <ul className="space-y-2">
              {data.parts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 text-sm text-slate-200"
                >
                  <span>
                    {p.quantity > 1 ? `${p.quantity} × ` : ""}
                    {p.name}
                  </span>
                  {p.status === "ordered" ? (
                    <span className="text-[11px] text-amber-300/90">Bestilt</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {data.customerPriceLabel ? (
          <Section icon={Banknote} label="Pris">
            <p className="text-lg font-semibold text-slate-50">
              {data.customerPriceLabel}
            </p>
          </Section>
        ) : null}

        {data.updates.length > 0 ? (
          <Section icon={MessageSquareText} label="Oppdateringer">
            <ul className="space-y-3">
              {data.updates.map((u) => (
                <li
                  key={u.id}
                  className="border-b border-white/6 pb-2.5 last:border-0 last:pb-0"
                >
                  <p className="text-[11px] text-slate-500">
                    {formatDate(u.createdAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-200">
                    {u.content}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {data.photos.length > 0 ? (
          <Section icon={ImageIcon} label="Bilder">
            <div className="grid grid-cols-2 gap-2">
              {data.photos.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/50"
                >
                  {p.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.description || "Dokumentasjon"}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs text-slate-500">
                      Fil
                    </div>
                  )}
                </a>
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      <footer className="relative mt-10 text-center text-[11px] text-slate-500">
        <p>SD Solutions · Slåttmyrvegen 49, 2406 Elverum</p>
        <p className="mt-1">Spørsmål? Kontakt verkstedet direkte.</p>
      </footer>
    </main>
  );
}
