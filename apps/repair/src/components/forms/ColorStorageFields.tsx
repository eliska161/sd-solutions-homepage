"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

const OTHER = "__other__";

export function ColorStorageFields({
  storage,
  color,
  storageOptions,
  colorOptions,
  onStorageChange,
  onColorChange,
  storageId = "storage",
  colorId = "color",
}: {
  storage: string;
  color: string;
  storageOptions: string[];
  colorOptions: string[];
  onStorageChange: (value: string) => void;
  onColorChange: (value: string) => void;
  storageId?: string;
  colorId?: string;
}) {
  const [storageOther, setStorageOther] = useState(false);
  const [colorOther, setColorOther] = useState(false);

  // When lookup options change, sync "Annet"-mode with current values.
  useEffect(() => {
    if (storageOptions.length === 0) {
      setStorageOther(false);
      return;
    }
    setStorageOther(Boolean(storage) && !storageOptions.includes(storage));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to option list changes
  }, [storageOptions]);

  useEffect(() => {
    if (colorOptions.length === 0) {
      setColorOther(false);
      return;
    }
    setColorOther(Boolean(color) && !colorOptions.includes(color));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to option list changes
  }, [colorOptions]);

  return (
    <>
      <div>
        <Label htmlFor={storageId}>Lagring</Label>
        {storageOptions.length > 0 ? (
          <div className="mt-1.5 space-y-2">
            <Select
              id={storageId}
              value={storageOther ? OTHER : storage}
              onChange={(e) => {
                const v = e.target.value;
                if (v === OTHER) {
                  setStorageOther(true);
                  onStorageChange("");
                } else {
                  setStorageOther(false);
                  onStorageChange(v);
                }
              }}
            >
              <option value="">Velg…</option>
              {storageOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OTHER}>Annet…</option>
            </Select>
            {storageOther ? (
              <Input
                value={storage}
                onChange={(e) => onStorageChange(e.target.value)}
                placeholder="F.eks. 2 TB"
                autoFocus
              />
            ) : null}
          </div>
        ) : (
          <Input
            id={storageId}
            className="mt-1.5"
            value={storage}
            onChange={(e) => onStorageChange(e.target.value)}
          />
        )}
      </div>
      <div>
        <Label htmlFor={colorId}>Farge</Label>
        {colorOptions.length > 0 ? (
          <div className="mt-1.5 space-y-2">
            <Select
              id={colorId}
              value={colorOther ? OTHER : color}
              onChange={(e) => {
                const v = e.target.value;
                if (v === OTHER) {
                  setColorOther(true);
                  onColorChange("");
                } else {
                  setColorOther(false);
                  onColorChange(v);
                }
              }}
            >
              <option value="">Velg…</option>
              {colorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTHER}>Annet…</option>
            </Select>
            {colorOther ? (
              <Input
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                placeholder="F.eks. Natural Titanium"
                autoFocus
              />
            ) : null}
          </div>
        ) : (
          <Input
            id={colorId}
            className="mt-1.5"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
        )}
      </div>
    </>
  );
}
