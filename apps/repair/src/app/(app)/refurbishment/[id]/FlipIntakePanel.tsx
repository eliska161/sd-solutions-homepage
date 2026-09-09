"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  FLIP_INTAKE_CHECKLIST,
  INTAKE_PHOTO_CATEGORIES,
  INTAKE_PHYSICAL_ZONES,
} from "@/lib/intake-catalog";
import { upsertFlipIntakeInspection } from "@/server/flip-intake";
import { uploadAttachment } from "@/server/attachments";

const RESULTS = [
  { value: "PASS", label: "OK" },
  { value: "FAIL", label: "Avvik" },
  { value: "NOT_TESTED", label: "Ikke testet" },
  { value: "NOT_APPLICABLE", label: "Ikke relevant" },
] as const;

type IntakeRow = {
  damageNotes: string | null;
  physicalZones: Record<string, string>;
  checklist: Record<string, { result: string; note?: string }>;
  completedAt: Date | string | null;
} | null;

export function FlipIntakePanel({
  refurbishmentId,
  intake,
}: {
  refurbishmentId: string;
  intake: IntakeRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [zones, setZones] = useState<Record<string, string>>(
    intake?.physicalZones ?? {},
  );
  const [checklist, setChecklist] = useState<
    Record<string, { result: string; note?: string }>
  >(intake?.checklist ?? {});
  const [damageNotes, setDamageNotes] = useState(intake?.damageNotes ?? "");
  const [photoCategory, setPhotoCategory] = useState("INTAKE_FRONT");
  const [photoDescription, setPhotoDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function save(markCompleted = false) {
    setMessage(null);
    startTransition(async () => {
      const checklistPayload: Record<
        string,
        {
          result: "PASS" | "FAIL" | "NOT_TESTED" | "NOT_APPLICABLE";
          note?: string;
        }
      > = {};
      for (const [key, value] of Object.entries(checklist)) {
        checklistPayload[key] = {
          result: value.result as
            | "PASS"
            | "FAIL"
            | "NOT_TESTED"
            | "NOT_APPLICABLE",
          ...(value.note ? { note: value.note } : {}),
        };
      }
      await upsertFlipIntakeInspection({
        refurbishmentId,
        damageNotes,
        physicalZones: zones,
        checklist: checklistPayload,
        markCompleted,
      });
      setMessage(
        markCompleted
          ? "Mottakskontroll lagret og markert utført."
          : "Lagret.",
      );
      router.refresh();
    });
  }

  function onUpload(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      await uploadAttachment({
        entityType: "refurbishment",
        entityId: refurbishmentId,
        category: photoCategory as
          | "INTAKE_FRONT"
          | "INTAKE_BACK"
          | "INTAKE_LEFT"
          | "INTAKE_RIGHT"
          | "INTAKE_TOP"
          | "INTAKE_BOTTOM"
          | "DAMAGE"
          | "SERIAL_NUMBER"
          | "OTHER",
        description: photoDescription || null,
        visibility: "INTERNAL",
        formData,
      });
      setPhotoDescription("");
      setMessage("Bilde lastet opp.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {intake?.completedAt ? (
        <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
          Mottakskontroll markert som utført.
        </p>
      ) : (
        <p className="text-[13px] text-muted">
          Registrer fysisk tilstand og funksjon når flip-telefonen mottas.
        </p>
      )}

      <div>
        <h3 className="text-sm font-medium">Fysisk tilstand</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {INTAKE_PHYSICAL_ZONES.map((zone) => (
            <div key={zone.key}>
              <Label htmlFor={`flip-zone-${zone.key}`}>{zone.label}</Label>
              <Input
                id={`flip-zone-${zone.key}`}
                className="mt-1.5"
                placeholder="Riper, sprekker, bulker…"
                value={zones[zone.key] ?? ""}
                disabled={pending}
                onChange={(e) =>
                  setZones((prev) => ({ ...prev, [zone.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium">Registrerte skader ved mottak</h3>
        <Textarea
          className="mt-2"
          rows={4}
          placeholder="F.eks. Sprekk i nedre høyre hjørne av skjermen…"
          value={damageNotes}
          disabled={pending}
          onChange={(e) => setDamageNotes(e.target.value)}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium">Sjekkliste</h3>
        <div className="mt-3 space-y-2">
          {FLIP_INTAKE_CHECKLIST.map((check) => (
            <div
              key={check.key}
              className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm">{check.label}</p>
              <Select
                className="w-full sm:w-40"
                disabled={pending}
                value={checklist[check.key]?.result ?? "NOT_TESTED"}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    [check.key]: {
                      result: e.target.value,
                      note: prev[check.key]?.note,
                    },
                  }))
                }
              >
                {RESULTS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium">Bilder ved mottak</h3>
        <p className="mt-1 text-[12px] text-muted">
          Anbefalt: forside, bakside, sider + nærbilder av skader og IMEI.
        </p>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            onUpload(fd);
            form.reset();
          }}
        >
          <div>
            <Label htmlFor="flip-intake-cat">Vinkel</Label>
            <Select
              id="flip-intake-cat"
              className="mt-1.5 w-44"
              value={photoCategory}
              onChange={(e) => setPhotoCategory(e.target.value)}
            >
              {INTAKE_PHOTO_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="flip-intake-desc">Beskrivelse</Label>
            <Input
              id="flip-intake-desc"
              className="mt-1.5"
              value={photoDescription}
              onChange={(e) => setPhotoDescription(e.target.value)}
              placeholder="Valgfritt"
            />
          </div>
          <div>
            <Label htmlFor="flip-intake-file">Bilde</Label>
            <Input
              id="flip-intake-file"
              name="file"
              type="file"
              accept="image/*"
              capture="environment"
              required
              className="mt-1.5"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={pending}>
            Last opp
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => save(false)}
        >
          Lagre mottakskontroll
        </Button>
        <Button type="button" disabled={pending} onClick={() => save(true)}>
          Merk som utført
        </Button>
      </div>
      {message ? <p className="text-[13px] text-muted">{message}</p> : null}
    </div>
  );
}
