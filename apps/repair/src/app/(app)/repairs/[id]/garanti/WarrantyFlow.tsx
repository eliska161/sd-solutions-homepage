"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { parseKrToOre } from "@/lib/labels";
import { completeWarrantyCase } from "@/server/warranty";
import {
  connectUsbPrinter,
  printerLinkLabel,
  printWorkshopReceipt,
} from "@/lib/thermal/usb-printer";
import type { WorkshopReceiptInput } from "@/lib/thermal/types";

const STEPS = [
  { id: "sak", label: "Sak" },
  { id: "krav", label: "Krav" },
  { id: "losning", label: "Løsning" },
  { id: "signatur", label: "Signatur" },
  { id: "kvittering", label: "Kvittering" },
] as const;

type Step = (typeof STEPS)[number]["id"];
type Outcome = "repair" | "refund" | "reject";
type Copy = "store" | "customer";

export function WarrantyFlow(input: {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  deviceLabel: string;
  totalLabel: string;
  defaultRefundKr: string;
  warrantyLabel: string;
  warrantyExpired: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("sak");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("repair");
  const [refundKr, setRefundKr] = useState(input.defaultRefundKr);
  const [signerName, setSignerName] = useState(input.customerName);
  const [printedStore, setPrintedStore] = useState(false);
  const [error, setError] = useState("");
  const [stripeNote, setStripeNote] = useState("");
  const [printNote, setPrintNote] = useState("");
  const [link, setLink] = useState("Ingen skriver");
  const [pending, start] = useTransition();

  const current = STEPS.findIndex((row) => row.id === step);
  const needsSign = outcome !== "reject";

  function go(next: Step) {
    setError("");
    setStep(next);
  }

  async function printCopy(copy: Copy) {
    setPrintNote("");
    const res = await fetch(`/api/repairs/${input.ticketId}/thermal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copy,
        outcome,
        description,
        refundOre: outcome === "refund" ? parseKrToOre(refundKr) : 0,
        signerName,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      warranty?: WorkshopReceiptInput | null;
    };
    if (!res.ok || !data.ok || !data.warranty) {
      throw new Error(data.error || "Fant ingen kvittering");
    }
    const printed = await printWorkshopReceipt(data.warranty);
    if (!printed.ok) throw new Error("Koble til skriveren først (USB-serial / COM).");
    setLink(printerLinkLabel());
    if (copy === "store") setPrintedStore(true);
    setPrintNote(
      copy === "store"
        ? "Butikkeksemplar skrevet ut. La kunden signere med penn."
        : "Kundeeksemplar skrevet ut. Gi denne til kunden.",
    );
  }

  function finish() {
    setError("");
    start(async () => {
      const result = await completeWarrantyCase({
        ticketId: input.ticketId,
        description,
        outcome,
        refundOre: outcome === "refund" ? parseKrToOre(refundKr) : 0,
        signerName,
        signedOnPaper: needsSign ? printedStore : false,
      });
      if (!result.ok) {
        setError(result.error || "Kunne ikke lagre garantisaken");
        return;
      }
      if (result.stripeRefundError) {
        setStripeNote(
          `Stripe-refusjon feilet (${result.stripeRefundError}). Registrert i saken likevel.`,
        );
      }
      setStep("kvittering");
      router.refresh();
      try {
        await printCopy("customer");
      } catch (err) {
        setPrintNote(err instanceof Error ? err.message : "Kundeeksemplar feilet.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((row, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={row.id} className="flex min-w-0 flex-1 items-center gap-1">
              {index > 0 ? (
                <span className={`h-px flex-1 ${done || active ? "bg-accent" : "bg-border"}`} />
              ) : null}
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
            </li>
          );
        })}
      </ol>

      {step === "sak" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-[13px] text-muted">{input.ticketNumber}</p>
          <p className="mt-1 text-lg font-semibold">{input.customerName}</p>
          <p className="text-sm text-muted">{input.deviceLabel || "Enhet"}</p>
          <p className="mt-4 text-sm">
            Opprinnelig beløp <span className="font-semibold">{input.totalLabel}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{input.warrantyLabel}</p>
          {input.warrantyExpired ? (
            <p className="mt-2 text-sm text-warning">
              Garantiperioden kan være utløpt. Du kan likevel ta inn saken som reklamasjon.
            </p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <Button type="button" onClick={() => go("krav")}>
              Neste
            </Button>
            <Link href={`/repairs/${input.ticketId}`} className="inline-flex h-9 items-center px-3 text-sm text-muted">
              Avbryt
            </Link>
          </div>
        </div>
      ) : null}

      {step === "krav" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <Label htmlFor="krav">Hva er galt?</Label>
          <Textarea
            id="krav"
            className="mt-1.5 min-h-28"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="F.eks. skjerm slukket tre uker etter bytte."
          />
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              onClick={() => {
                if (!description.trim()) {
                  setError("Beskriv kravet");
                  return;
                }
                go("losning");
              }}
            >
              Neste
            </Button>
            <Button type="button" variant="ghost" onClick={() => go("sak")}>
              Tilbake
            </Button>
          </div>
        </div>
      ) : null}

      {step === "losning" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-sm font-medium">Hva gjør vi?</p>
          <div className="mt-3 grid gap-2">
            {(
              [
                ["repair", "Garantiarbeid", "Fiks på nytt. Ingen ny kostnad."],
                ["refund", "Tilbakebetaling", "Kreditnota. Kunden signerer beløpet."],
                ["reject", "Avvis", "Dekkes ikke av garantien."],
              ] as const
            ).map(([id, title, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => setOutcome(id)}
                className={[
                  "rounded border px-4 py-3 text-left",
                  outcome === id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-white hover:bg-black/[0.03]",
                ].join(" ")}
              >
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>
              </button>
            ))}
          </div>
          {outcome === "refund" ? (
            <div className="mt-4">
              <Label htmlFor="refundKr">Refusjonsbeløp (kr)</Label>
              <Input
                id="refundKr"
                className="mt-1.5"
                value={refundKr}
                onChange={(e) => setRefundKr(e.target.value)}
              />
            </div>
          ) : null}
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              onClick={() => (needsSign ? go("signatur") : finish())}
              disabled={pending}
            >
              {needsSign ? "Neste" : pending ? "Lagrer…" : "Fullfør"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => go("krav")}>
              Tilbake
            </Button>
          </div>
        </div>
      ) : null}

      {step === "signatur" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-sm font-medium">Butikkens eksemplar</p>
          <p className="mt-1 text-sm text-muted">
            Skriv ut slippen og la kunden signere med penn i feltet.
            Kunden får kvittering etterpå.
          </p>
          <div className="mt-3">
            <Label htmlFor="signer">Navn på slippen</Label>
            <Input
              id="signer"
              className="mt-1.5"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>
          <p className="mt-3 text-[13px] text-muted">Termisk 80 mm · {link}</p>
          {printNote ? <p className="mt-2 text-sm text-muted">{printNote}</p> : null}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError("");
                start(async () => {
                  try {
                    await connectUsbPrinter();
                    setLink(printerLinkLabel());
                    await printCopy("store");
                  } catch (err) {
                    setPrintNote(err instanceof Error ? err.message : "Utskrift feilet.");
                  }
                });
              }}
              disabled={pending}
            >
              {pending ? "Skriver…" : "Skriv butikkeksemplar"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (signerName.trim().length < 2) {
                  setError("Oppgi navn");
                  return;
                }
                if (!printedStore) {
                  setError("Skriv ut butikkeksemplaret først, så kunden kan signere med penn");
                  return;
                }
                finish();
              }}
              disabled={pending}
            >
              {pending ? "Lagrer…" : "Kunden har signert"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => go("losning")}>
              Tilbake
            </Button>
          </div>
        </div>
      ) : null}

      {step === "kvittering" ? (
        <div className="rounded border border-border bg-white px-5 py-5">
          <p className="text-lg font-semibold">Kundeeksemplar</p>
          <p className="mt-1 text-sm text-muted">
            {outcome === "refund"
              ? `Tilbakebetaling ${refundKr} kr`
              : outcome === "repair"
                ? "Garantiarbeid uten kostnad"
                : "Krav avvist"}
            . {input.ticketNumber}. Gi denne kvitteringen til kunden.
          </p>
          {stripeNote ? <p className="mt-2 text-sm text-warning">{stripeNote}</p> : null}
          {printNote ? <p className="mt-2 text-[13px] text-muted">{printNote}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                start(async () => {
                  try {
                    await printCopy("customer");
                  } catch (err) {
                    setPrintNote(err instanceof Error ? err.message : "Utskrift feilet.");
                  }
                });
              }}
              disabled={pending}
            >
              {pending ? "Skriver…" : "Skriv kundeeksemplar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                start(async () => {
                  try {
                    await printCopy("store");
                  } catch (err) {
                    setPrintNote(err instanceof Error ? err.message : "Utskrift feilet.");
                  }
                });
              }}
              disabled={pending}
            >
              Skriv butikkeksemplar på nytt
            </Button>
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
              className="inline-flex h-9 items-center rounded border border-border px-3.5 text-sm"
            >
              PDF
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
