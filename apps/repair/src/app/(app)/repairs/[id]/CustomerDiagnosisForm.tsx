"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { updateCustomerDiagnosis } from "@/server/repairs";

export function CustomerDiagnosisForm({
  ticketId,
  initialValue,
}: {
  ticketId: string;
  initialValue: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await updateCustomerDiagnosis(ticketId, value);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Kunne ikke lagre");
          }
        });
      }}
    >
      <div>
        <Label htmlFor="customerDiagnosis">
          Kundevendt problembeskrivelse (etter diagnostikk)
        </Label>
        <p className="mt-1 text-[12px] text-muted">
          Dette er teksten kunden ser på statussiden. Skriv manuelt etter utført
          diagnostikk — ikke mottakslisten.
        </p>
        <Textarea
          id="customerDiagnosis"
          className="mt-2"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="F.eks. Skjermglass knust, touch OK. Batterihelse 78 %. Anbefaler glassbytte."
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Lagrer…" : "Lagre kundetekst"}
      </Button>
    </form>
  );
}
