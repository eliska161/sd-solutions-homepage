"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  connectSerialPrinter,
  printerLinkLabel,
  printWorkshopReceipt,
} from "@/lib/thermal/usb-printer";
import type { WorkshopReceiptInput, WorkshopReceiptKind } from "@/lib/thermal/types";

export function ThermalPrintBar({ ticketId }: { ticketId: string }) {
  const [busy, setBusy] = useState<"connect" | WorkshopReceiptKind | null>(null);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("Ingen skriver");

  async function connect() {
    setBusy("connect");
    setNote("");
    try {
      await connectSerialPrinter();
      setLink(printerLinkLabel());
      setNote("USB-skriver klar (115200). Velg POS-8360-L i serial-listen.");
    } catch (err) {
      setNote(
        err instanceof Error
          ? err.message
          : "Klarte ikke åpne USB-serial. Start Chrome med --disable-serial-blocklist.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function print(kind: WorkshopReceiptKind) {
    setBusy(kind);
    setNote("");
    try {
      const res = await fetch(`/api/repairs/${ticketId}/thermal`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        purchase?: WorkshopReceiptInput;
        repair?: WorkshopReceiptInput;
      };
      if (!res.ok || !data.ok || !data.purchase || !data.repair) {
        throw new Error(data.error || "Kunne ikke hente kvittering");
      }
      const result = await printWorkshopReceipt(kind === "purchase" ? data.purchase : data.repair);
      if (!result.ok) {
        throw new Error(
          "Skriveren svarte ikke. Koble til USB og velg POS-8360-L (115200).",
        );
      }
      setLink(printerLinkLabel());
      setNote(kind === "purchase" ? "Kjøpskvittering skrevet ut." : "Reparasjonskvittering skrevet ut.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Utskrift feilet.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void connect()}
        disabled={busy !== null}
      >
        {busy === "connect" ? "Kobler til…" : "Koble til USB"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void print("purchase")}
        disabled={busy !== null}
      >
        {busy === "purchase" ? "Skriver…" : "Kjøpskvittering"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void print("repair")}
        disabled={busy !== null}
      >
        {busy === "repair" ? "Skriver…" : "Reparasjonskvittering"}
      </Button>
      <p className="text-[13px] text-muted">
        Termisk 80 mm USB 115200 · {link}
        {note ? ` · ${note}` : ""}
      </p>
    </div>
  );
}
