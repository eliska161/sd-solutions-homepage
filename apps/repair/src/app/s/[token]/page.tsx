import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { customerStatusTone } from "@/lib/customer-progress";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { getPublicRepairByToken } from "@/server/public-status";
import { CustomerUpdateForm } from "./CustomerUpdateForm";
import { workshopAddressOneLine } from "@/lib/workshop";

export const dynamic = "force-dynamic";

function badgeTone(
  status: string,
): "default" | "muted" | "accent" | "success" | "warning" | "danger" {
  switch (customerStatusTone(status)) {
    case "waiting":
      return "warning";
    case "ready":
    case "done":
      return "success";
    case "alert":
      return "danger";
    default:
      return "accent";
  }
}

export default async function CustomerStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ny?: string }>;
}) {
  const { token } = await params;
  const { ny } = await searchParams;
  const data = await getPublicRepairByToken(token);
  if (!data) notFound();

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
    <div>
      <PageHeader
        title={data.ticketNumber}
        description={data.deviceLabel}
        actions={<Badge tone={badgeTone(data.status)}>{data.statusLabel}</Badge>}
      />

      {ny === "1" ? (
        <p className="mb-4 rounded border border-border bg-surface px-4 py-3 text-sm">
          {data.inboundMethod === "POST"
            ? `Serviceordre opprettet. Send enheten til ${workshopAddressOneLine()}. Merk pakken med ${data.ticketNumber}.`
            : data.dropoffLabel
              ? `Serviceordre opprettet. Lever inn ${data.dropoffLabel}.`
              : "Serviceordre opprettet. Vi tar den inn når enheten er levert."}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Saken" />
          <CardBody className="space-y-4 text-sm">
            <div>
              <p className="text-[13px] text-muted">
                {currentStep
                  ? `Nå · ${currentStep.label}`
                  : "Status oppdateres fortløpende"}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded bg-black/[0.06]">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-[13px] text-muted">Diagnose</p>
              {data.diagnosisText ? (
                <p className="mt-1 whitespace-pre-wrap">
                  {data.diagnosisText}
                </p>
              ) : (
                <p className="mt-1 text-muted">
                  Diagnostikk pågår. Problembeskrivelse kommer når
                  undersøkelsen er ferdig.
                </p>
              )}
            </div>

            <dl className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <div>
                <dt className="text-[13px] text-muted">Tekniker</dt>
                <dd className="mt-0.5">{data.technicianName}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Estimert ferdig</dt>
                <dd className="mt-0.5">
                  {formatDateOnly(data.estimatedCompletionDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Pris</dt>
                <dd className="mt-0.5">
                  {data.customerPriceLabel ?? "Avventer"}
                </dd>
              </div>
            </dl>
            <p className="text-[12px] text-muted">
              Estimert dato er ikke garantert.
            </p>
            <dl className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-muted">Innlevering</dt>
                <dd className="mt-0.5">
                  {data.inboundMethod === "POST"
                    ? "Send selv"
                    : data.dropoffLabel
                      ? `Butikk · ${data.dropoffLabel}`
                      : "Butikk"}
                  {data.inboundMethod === "IN_PERSON" && !data.received ? (
                    <>
                      <br />
                      <Link
                        href={`/s/${token}/innlevering`}
                        className="text-[12px] text-accent underline"
                      >
                        {data.dropoffLabel
                          ? "Endre innleveringstid"
                          : "Velg dato og timeslot"}
                      </Link>
                    </>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Utlevering</dt>
                <dd className="mt-0.5">
                  {data.outboundMethod === "POST" ? (
                    <>
                      Sendes tilbake
                      {data.outboundPostageLabel
                        ? ` (${data.outboundPostageLabel})`
                        : ""}
                      {data.returnTrackingNumber ? (
                        <>
                          <br />
                          Sporing: {data.returnTrackingNumber}
                        </>
                      ) : null}
                    </>
                  ) : (
                    "Butikk"
                  )}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Fremdrift" />
          <CardBody>
            <ol>
              {data.progress.map((step, index) => {
                const isLast = index === data.progress.length - 1;
                return (
                  <li
                    key={step.key}
                    className="relative flex gap-3 pb-4 last:pb-0"
                  >
                    {!isLast ? (
                      <span
                        aria-hidden
                        className={`absolute left-[7px] top-4 h-[calc(100%-8px)] w-px ${
                          data.progress[index + 1]?.state === "todo"
                            ? "bg-border"
                            : "bg-accent/50"
                        }`}
                      />
                    ) : null}
                    <span className="relative z-[1] mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                      {step.state === "done" ? (
                        <span className="h-[15px] w-[15px] rounded-full bg-accent" />
                      ) : step.state === "current" ? (
                        <span className="h-[15px] w-[15px] rounded-full bg-accent/20 ring-2 ring-accent" />
                      ) : (
                        <span className="h-[15px] w-[15px] rounded-full border border-border bg-white" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={
                          step.state === "todo"
                            ? "text-sm text-muted"
                            : step.state === "current"
                              ? "text-sm font-medium"
                              : "text-sm"
                        }
                      >
                        {step.label}
                      </p>
                      {step.state === "current" ? (
                        <p className="text-[11px] text-accent">Pågår nå</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>

        {data.services.length > 0 || data.discount ? (
          <Card className="lg:col-span-3">
            <CardHeader title="Tjenester" />
            <CardBody className="text-sm">
              <ul className="space-y-1.5">
                {data.services.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span>{s.name}</span>
                    <span className="shrink-0 tabular-nums">{s.priceLabel}</span>
                  </li>
                ))}
              </ul>
              {data.discount ? (
                <p className="mt-2 flex items-baseline justify-between gap-3 text-muted">
                  <span>{data.discount.label}</span>
                  <span className="shrink-0">−{data.discount.amountLabel}</span>
                </p>
              ) : null}
              <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3 font-medium">
                <span>Totalpris</span>
                <span className="shrink-0 tabular-nums">
                  {data.customerPriceLabel ?? "Avventer"}
                </span>
              </p>
            </CardBody>
          </Card>
        ) : null}

        <Card className="lg:col-span-3">
          <CardHeader title="Oppdateringer" />
          <CardBody className="space-y-4">
            {data.updates.length === 0 ? (
              <p className="text-sm text-muted">
                Ingen meldinger ennå. Du kan skrive til verkstedet under.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.updates.map((u) => (
                  <li
                    key={u.id}
                    className="border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-[11px] text-muted">
                      {u.authorName} · {formatDate(u.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {u.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <CustomerUpdateForm token={token} />
          </CardBody>
        </Card>

        {data.documents.length > 0 ? (
          <Card className="lg:col-span-3">
            <CardHeader title="Dokumenter" />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {data.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline"
                    >
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        {data.photos.length > 0 ? (
          <Card className="lg:col-span-3">
            <CardHeader title="Bilder" />
            <CardBody>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {data.photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded border border-border"
                  >
                    {p.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={p.description || "Dokumentasjon"}
                        className="h-28 w-full object-cover lg:h-32"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center text-[12px] text-muted lg:h-32">
                        Fil
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <p className="mt-6 text-[12px] text-muted">
        SD Solutions · Slåttmyrvegen 49, 2406 Elverum
      </p>
    </div>
  );
}
