"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ThermalPrintBar } from "@/components/ThermalPrintBar";
import {
  refreshRepairTapToPay,
  startRepairTapToPay,
} from "@/server/repairs";
import { CopyPayValue } from "./CopyPayValue";

const STEPS = [
  { id: "bekreft", label: "Beløp" },
  { id: "tap", label: "Tap" },
  { id: "ferdig", label: "Ferdig" },
] as const;

type Step = (typeof STEPS)[number]["id"];

export function TapToPayFlow(input: {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  deviceLabel: string;
  lines: { name: string; amountLabel: string }[];
  totalLabel: string;
  amountCopy: string;
  alreadyPaid: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(input.alreadyPaid ? "ferdig" : "bekreft");
  const [sentToReader, setSentToReader] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (step !== "tap") return;
    let cancelled = false;
    const tick = async () => {
      const status = await refreshRepairTapToPay(input.ticketId);
      if (!cancelled && status.paid) {
        setStep("ferdig");
        router.refresh();
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [step, input.ticketId, router]);

  function begin() {
    setError("");
    start(async () => {
      const result = await startRepairTapToPay(input.ticketId);
      if (!result.ok) {
        setError(result.error || "Kunne ikke starte Tap to Pay");
        return;
      }
      if (result.paid) {
        setStep("ferdig");
        router.refresh();
        return;
      }
      setSentToReader(Boolean(result.sentToReader));
      setStep("tap");
    });
  }

  const current = STEPS.findIndex((row) => row.id === step);

  return (
    <div className="mx-auto max-w-lg">
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((row, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={row.id} className="flex min-w-0 flex-1 items-center gap-2">
              {index > 0 ? (
                <span
                  className={`h-px flex-1 ${done || active ? "bg-accent" : "bg-border"}`}
                />
              ) : null}
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    done
                      ? "bg-accent text-white"
                      : active
                        ? "bg-accent/15 text-accent ring-2 ring-accent"
                        : "border border-border bg-white text-muted",
                  ].join(" ")}
                >
                  {index + 1}
                </span>
                <span
                  className={[
                    "truncate text-[12px]",
                    active ? "font-medium text-foreground" : "text-muted",
                  ].join(" ")}
                >
                  {row.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {step === "bekreft" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-[13px] text-muted">{input.ticketNumber}</p>
          <p className="mt-1 text-lg font-semibold">{input.customerName}</p>
          <p className="text-sm text-muted">{input.deviceLabel || "Enhet"}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {input.lines.map((line) => (
              <li key={line.name} className="flex justify-between gap-4">
                <span>{line.name}</span>
                <span className="tabular-nums">{line.amountLabel}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-sm font-medium">Å betale</span>
            <span className="text-[28px] font-semibold tabular-nums">
              {input.totalLabel}
            </span>
          </p>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={begin} disabled={pending}>
              {pending ? "Starter…" : "Start Tap to Pay"}
            </Button>
            <Link
              href={`/repairs/${input.ticketId}`}
              className="inline-flex h-9 items-center rounded px-3.5 text-sm text-muted hover:text-foreground"
            >
              Avbryt
            </Link>
          </div>
        </div>
      ) : null}

      {step === "tap" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-lg font-semibold">Åpne Stripe-appen</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Trykk + og velg Charge a card</li>
            <li>Lim inn beløp og saksnummer som beskrivelse</li>
            <li>Velg Tap to Pay og la kunden tappe</li>
          </ol>
          {sentToReader ? (
            <p className="mt-3 text-sm text-muted">
              Beløpet er også sendt til telefonen hvis den er online som leser.
            </p>
          ) : null}
          <div className="mt-4 grid gap-2">
            <CopyPayValue label="Beløp i Stripe" value={input.amountCopy} />
            <CopyPayValue label="Beskrivelse" value={input.ticketNumber} />
          </div>
          <p className="mt-4 text-sm text-muted">Venter på tap…</p>
          <div className="mt-5">
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => setStep("bekreft")}
            >
              Tilbake
            </button>
          </div>
        </div>
      ) : null}

      {step === "ferdig" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-lg font-semibold">Betalt</p>
          <p className="mt-1 text-sm text-muted">
            {input.ticketNumber} · {input.totalLabel}
          </p>
          <div className="mt-4">
            <ThermalPrintBar ticketId={input.ticketId} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/repairs/${input.ticketId}`}
              className="inline-flex h-9 items-center rounded bg-accent px-3.5 text-sm font-medium text-white"
            >
              Tilbake til saken
            </Link>
            <a
              href={`/api/repairs/${input.ticketId}/receipt`}
              className="inline-flex h-9 items-center rounded border border-border bg-white px-3.5 text-sm"
            >
              PDF-kvittering
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
