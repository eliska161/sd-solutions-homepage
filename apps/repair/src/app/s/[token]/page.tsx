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

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-10">
      <header className="mb-6 border-b border-zinc-200 pb-5">
        <p className="text-xs font-semibold uppercase text-[#0e7490]">
          SD Solutions
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Reparasjon {data.ticketNumber.replace(/^REP-/, "#")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{data.deviceLabel}</p>
      </header>

      <section className="mb-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs text-zinc-500">Status</p>
        <p className="mt-1 text-base font-semibold">{data.statusLabel}</p>
      </section>

      <section className="mb-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs text-zinc-500">Fremdrift</p>
        <ol className="mt-3 space-y-2">
          {data.progress.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              <span
                className={
                  step.state === "done"
                    ? "text-emerald-600"
                    : step.state === "current"
                      ? "text-[#0e7490]"
                      : "text-zinc-300"
                }
                aria-hidden
              >
                {step.state === "done" ? "✓" : step.state === "current" ? "●" : "○"}
              </span>
              <span
                className={
                  step.state === "todo" ? "text-zinc-400" : "text-zinc-900"
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Tekniker</p>
          <p className="mt-1 text-sm font-medium">{data.technicianName}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Estimert ferdig</p>
          <p className="mt-1 text-sm font-medium">
            {formatDateOnly(data.estimatedCompletionDate)}
          </p>
        </div>
      </section>
      <p className="mb-3 text-[11px] leading-snug text-zinc-500">
        Estimert klar for henting — ikke en garantert dato.
      </p>

      <section className="mb-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs text-zinc-500">Problem</p>
        {data.diagnosisText ? (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {data.diagnosisText}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">
            Diagnostikk pågår. Tekniker publiserer problembeskrivelse når
            undersøkelsen er ferdig.
          </p>
        )}
      </section>

      {data.customerPriceLabel ? (
        <section className="mb-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Pris</p>
          <p className="mt-1 text-base font-semibold">{data.customerPriceLabel}</p>
        </section>
      ) : null}

      {data.updates.length > 0 ? (
        <section className="mb-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Oppdateringer</p>
          <ul className="mt-3 space-y-3">
            {data.updates.map((u) => (
              <li
                key={u.id}
                className="border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
              >
                <p className="text-[11px] text-zinc-500">
                  {formatDate(u.createdAt)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{u.content}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.photos.length > 0 ? (
        <section className="mb-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Bilder</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {data.photos.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-md border border-zinc-200"
              >
                {p.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.url}
                    alt={p.description || "Dokumentasjon"}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-zinc-500">
                    Fil
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-8 text-center text-[11px] text-zinc-500">
        <p>SD Solutions · Slåttmyrvegen 49, 2406 Elverum</p>
        <p className="mt-1">Spørsmål? Kontakt verkstedet direkte.</p>
      </footer>
    </main>
  );
}
