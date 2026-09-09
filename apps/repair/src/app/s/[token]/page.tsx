import { notFound } from "next/navigation";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { getPublicRepairByToken } from "@/server/public-status";

export const dynamic = "force-dynamic";

export default async function CustomerStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicRepairByToken(token);
  if (!data) notFound();

  const ticketShort = data.ticketNumber.replace(/^REP-/, "");

  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:py-12">
      <header className="mb-8">
        <p className="text-[13px] font-semibold tracking-tight text-[#0f766e]">
          SD Solutions
        </p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-zinc-900">
          Reparasjonsstatus
        </h1>
      </header>

      <section className="rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_rgba(16,24,40,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-zinc-900">
              REP-{ticketShort}
            </p>
            <p className="mt-1 text-sm leading-snug text-zinc-500">
              {data.deviceLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#ea580c] px-2.5 py-1 text-[11px] font-semibold text-white">
            {data.statusLabel}
          </span>
        </div>

        {data.diagnosisText ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            {data.diagnosisText}
          </p>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Diagnostikk pågår. Problembeskrivelse kommer når undersøkelsen er
            ferdig.
          </p>
        )}

        <dl className="mt-5 space-y-2.5 border-t border-zinc-100 pt-4">
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-zinc-400">Tekniker</dt>
            <dd className="text-right font-medium text-zinc-800">
              {data.technicianName}
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-zinc-400">Estimert ferdig</dt>
            <dd className="text-right font-medium text-zinc-800">
              {formatDateOnly(data.estimatedCompletionDate)}
            </dd>
          </div>
          {data.customerPriceLabel ? (
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-zinc-400">Pris</dt>
              <dd className="text-right font-semibold text-zinc-900">
                {data.customerPriceLabel}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-[11px] leading-snug text-zinc-400">
          Estimert klar for henting — ikke en garantert dato.
        </p>
      </section>

      <section className="mt-4 rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_rgba(16,24,40,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Fremdrift
        </p>
        <ol className="relative mt-5 space-y-0">
          {data.progress.map((step, index) => {
            const isLast = index === data.progress.length - 1;
            return (
              <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast ? (
                  <span
                    aria-hidden
                    className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-zinc-200"
                  />
                ) : null}
                <span className="relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {step.state === "done" ? (
                    <span className="h-3 w-3 rounded-full bg-[#0f766e]" />
                  ) : step.state === "current" ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0f766e]/20">
                      <span className="h-2 w-2 rounded-full bg-[#0f766e]" />
                    </span>
                  ) : (
                    <span className="h-3 w-3 rounded-full border border-zinc-300 bg-white" />
                  )}
                </span>
                <span
                  className={
                    step.state === "todo"
                      ? "text-sm text-zinc-400"
                      : step.state === "current"
                        ? "text-sm font-semibold text-zinc-900"
                        : "text-sm text-zinc-700"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {(data.services.length > 0 || data.discount || data.parts.length > 0) && (
        <section className="mt-4 rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_rgba(16,24,40,0.04)]">
          {data.services.length > 0 || data.discount ? (
            <div className={data.parts.length > 0 ? "mb-5" : ""}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Tjenester
              </p>
              <ul className="mt-3 space-y-2">
                {data.services.map((s) => (
                  <li key={s.id} className="text-sm text-zinc-800">
                    {s.name}
                  </li>
                ))}
              </ul>
              {data.discount ? (
                <p className="mt-2 text-sm text-zinc-500">
                  {data.discount.label}: −{data.discount.amountLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {data.parts.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Deler
              </p>
              <ul className="mt-3 space-y-2">
                {data.parts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 text-sm text-zinc-800"
                  >
                    <span>
                      {p.quantity > 1 ? `${p.quantity} × ` : ""}
                      {p.name}
                    </span>
                    {p.status === "ordered" ? (
                      <span className="text-[11px] font-medium text-[#ea580c]">
                        Bestilt
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {data.updates.length > 0 ? (
        <section className="mt-4 rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_rgba(16,24,40,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Oppdateringer
          </p>
          <ul className="mt-4 space-y-4">
            {data.updates.map((u) => (
              <li key={u.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                <p className="text-[11px] text-zinc-400">
                  {formatDate(u.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {u.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.photos.length > 0 ? (
        <section className="mt-4 rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_rgba(16,24,40,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Bilder
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.photos.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl border border-zinc-100"
              >
                {p.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.url}
                    alt={p.description || "Dokumentasjon"}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center text-xs text-zinc-400">
                    Fil
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-10 text-center text-[11px] text-zinc-400">
        <p>SD Solutions · Slåttmyrvegen 49, 2406 Elverum</p>
        <p className="mt-1">Spørsmål? Kontakt verkstedet direkte.</p>
      </footer>
    </main>
  );
}
