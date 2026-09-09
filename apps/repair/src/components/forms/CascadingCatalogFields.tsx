"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { CatalogNode } from "@/lib/intake-options";

export function CascadingCatalogFields({
  catalog,
  namePrefix,
  label,
  required,
}: {
  catalog: CatalogNode[];
  namePrefix: string;
  label: string;
  required?: boolean;
}) {
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const [l3, setL3] = useState("");
  const [comment, setComment] = useState("");

  const level1 = catalog;
  const level2 = useMemo(
    () => level1.find((n) => n.key === l1)?.children ?? [],
    [level1, l1],
  );
  const level3 = useMemo(
    () => level2.find((n) => n.key === l2)?.children ?? [],
    [level2, l2],
  );

  useEffect(() => {
    setL2("");
    setL3("");
  }, [l1]);
  useEffect(() => {
    setL3("");
  }, [l2]);

  const leaf = l3 || l2 || l1;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div>
        <Label htmlFor={`${namePrefix}-l1`}>Hovedkategori{required ? " *" : ""}</Label>
        <Select
          id={`${namePrefix}-l1`}
          className="mt-1.5"
          value={l1}
          required={required}
          onChange={(e) => setL1(e.target.value)}
        >
          <option value="">Velg…</option>
          {level1.map((n) => (
            <option key={n.key} value={n.key}>
              {n.label}
            </option>
          ))}
        </Select>
      </div>
      {level2.length > 0 ? (
        <div>
          <Label htmlFor={`${namePrefix}-l2`}>Underkategori *</Label>
          <Select
            id={`${namePrefix}-l2`}
            className="mt-1.5"
            value={l2}
            required
            onChange={(e) => setL2(e.target.value)}
          >
            <option value="">Velg…</option>
            {level2.map((n) => (
              <option key={n.key} value={n.key}>
                {n.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {level3.length > 0 ? (
        <div>
          <Label htmlFor={`${namePrefix}-l3`}>Detalj *</Label>
          <Select
            id={`${namePrefix}-l3`}
            className="mt-1.5"
            value={l3}
            required
            onChange={(e) => setL3(e.target.value)}
          >
            <option value="">Velg…</option>
            {level3.map((n) => (
              <option key={n.key} value={n.key}>
                {n.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div>
        <Label htmlFor={`${namePrefix}-comment`}>Ekstra kommentar</Label>
        <Textarea
          id={`${namePrefix}-comment`}
          className="mt-1.5"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Valgfritt…"
        />
      </div>
      <input type="hidden" name={`${namePrefix}Key`} value={leaf} />
      <input type="hidden" name={`${namePrefix}Comment`} value={comment} />
    </div>
  );
}
