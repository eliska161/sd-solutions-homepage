"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConditionIntakeFields } from "@/components/forms/ConditionIntakeFields";
import { MultiFaultPicker } from "@/components/forms/MultiFaultPicker";
import { Button } from "@/components/ui/Button";
import { REPAIR_FAULTS } from "@/lib/intake-options";
import { updateFlipConditionFaults } from "@/server/flips";

export function FlipConditionFaultsPanel({
  refurbishmentId,
  initial,
}: {
  refurbishmentId: string;
  initial: {
    conditionGrade: string | null;
    cosmeticFaultKeys: string[];
    repairFaultKeys: string[];
    conditionComment: string | null;
    faultComment: string | null;
    conditionSummary: string | null;
    faultSummary: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grade, setGrade] = useState(initial.conditionGrade ?? "");
  const [cosmetic, setCosmetic] = useState(initial.cosmeticFaultKeys ?? []);
  const [faults, setFaults] = useState(initial.repairFaultKeys ?? []);
  const [conditionComment, setConditionComment] = useState(
    initial.conditionComment ?? "",
  );
  const [faultComment, setFaultComment] = useState(initial.faultComment ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setMessage(null);
    setError(null);
    if (!grade) {
      setError("Velg karakter for fysisk tilstand");
      return;
    }
    startTransition(async () => {
      try {
        await updateFlipConditionFaults({
          refurbishmentId,
          conditionGrade: grade,
          cosmeticFaultKeys: cosmetic,
          repairFaultKeys: faults,
          conditionComment,
          faultComment,
        });
        setMessage("Tilstand og feil lagret.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kunne ikke lagre");
      }
    });
  }

  return (
    <div className="space-y-6">
      <ConditionIntakeFields
        gradeKey={grade}
        onGradeChange={setGrade}
        faultKeys={cosmetic}
        onFaultsChange={setCosmetic}
        comment={conditionComment}
        onCommentChange={setConditionComment}
      />

      <div className="rounded-xl border border-border p-4">
        <MultiFaultPicker
          label="Feil / reparasjonsbehov"
          options={REPAIR_FAULTS}
          value={faults}
          onChange={setFaults}
          comment={faultComment}
          onCommentChange={setFaultComment}
          addLabel="Legg til feil"
          emptyHint="Ingen feil lagt til."
        />
      </div>

      {(initial.conditionSummary || initial.faultSummary) && (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {initial.conditionSummary ? (
            <div>
              <p className="text-muted">Sist lagret tilstand</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-[13px]">
                {initial.conditionSummary}
              </pre>
            </div>
          ) : null}
          {initial.faultSummary ? (
            <div>
              <p className="text-muted">Sist lagret feil</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-[13px]">
                {initial.faultSummary}
              </pre>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          Lagre tilstand og feil
        </Button>
        {message ? <p className="text-[13px] text-muted">{message}</p> : null}
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
