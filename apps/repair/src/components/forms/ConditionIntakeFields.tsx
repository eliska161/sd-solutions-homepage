"use client";

import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { MultiFaultPicker } from "@/components/forms/MultiFaultPicker";
import {
  CONDITION_GRADES,
  COSMETIC_FAULTS,
} from "@/lib/intake-options";

export function ConditionIntakeFields({
  gradeKey,
  onGradeChange,
  faultKeys,
  onFaultsChange,
  comment,
  onCommentChange,
}: {
  gradeKey: string;
  onGradeChange: (key: string) => void;
  faultKeys: string[];
  onFaultsChange: (keys: string[]) => void;
  comment: string;
  onCommentChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-foreground">Fysisk tilstand *</p>
      <div>
        <Label htmlFor="conditionGrade">Karakter *</Label>
        <Select
          id="conditionGrade"
          className="mt-1.5"
          value={gradeKey}
          required
          onChange={(e) => onGradeChange(e.target.value)}
        >
          <option value="">Velg karakter…</option>
          {CONDITION_GRADES.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>

      <MultiFaultPicker
        label="Kosmetiske feil"
        options={COSMETIC_FAULTS}
        value={faultKeys}
        onChange={onFaultsChange}
        addLabel="Legg til ny feil"
        emptyHint="Ingen kosmetiske feil lagt til."
      />

      <div>
        <Label htmlFor="conditionComment">Ekstra kommentar</Label>
        <Textarea
          id="conditionComment"
          className="mt-1.5"
          rows={2}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Valgfritt…"
        />
      </div>
    </div>
  );
}
