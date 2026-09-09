"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { CatalogOption } from "@/lib/intake-options";

export function MultiFaultPicker({
  label,
  options,
  value,
  onChange,
  comment,
  onCommentChange,
  required,
  addLabel = "Legg til ny feil",
  emptyHint,
}: {
  label: string;
  options: CatalogOption[];
  value: string[];
  onChange: (keys: string[]) => void;
  comment?: string;
  onCommentChange?: (value: string) => void;
  required?: boolean;
  addLabel?: string;
  emptyHint?: string;
}) {
  const baseId = useId();
  const [draft, setDraft] = useState("");

  const available = options.filter((o) => !value.includes(o.key));
  const groups = Array.from(
    new Set(available.map((o) => o.group).filter(Boolean)),
  ) as string[];

  function addFault() {
    if (!draft) return;
    if (value.includes(draft)) return;
    onChange([...value, draft]);
    setDraft("");
  }

  function removeFault(key: string) {
    onChange(value.filter((k) => k !== key));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </p>

      {value.length === 0 ? (
        <p className="text-[12px] text-muted">
          {emptyHint ?? "Ingen feil lagt til ennå."}
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((key) => {
            const opt = options.find((o) => o.key === key);
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{opt?.label ?? key}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFault(key)}
                >
                  Fjern
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${baseId}-fault`}>Velg feil</Label>
          <Select
            id={`${baseId}-fault`}
            className="mt-1.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          >
            <option value="">Velg…</option>
            {groups.length > 0
              ? groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {available
                      .filter((o) => o.group === g)
                      .map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                  </optgroup>
                ))
              : null}
            {available
              .filter((o) => !o.group)
              .map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!draft}
          onClick={addFault}
        >
          {addLabel}
        </Button>
      </div>

      {onCommentChange ? (
        <div>
          <Label htmlFor={`${baseId}-comment`}>Ekstra kommentar</Label>
          <Textarea
            id={`${baseId}-comment`}
            className="mt-1.5"
            rows={2}
            value={comment ?? ""}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Valgfritt…"
          />
        </div>
      ) : null}
    </div>
  );
}
