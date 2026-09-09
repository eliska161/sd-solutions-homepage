"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ColorStorageFields } from "@/components/forms/ColorStorageFields";
import { ConditionIntakeFields } from "@/components/forms/ConditionIntakeFields";
import { MultiFaultPicker } from "@/components/forms/MultiFaultPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  formatConditionSummary,
  formatProblemSummary,
  REPAIR_FAULTS,
} from "@/lib/intake-options";
import { INTAKE_PHOTO_CATEGORIES } from "@/lib/intake-catalog";
import { uploadAttachment } from "@/server/attachments";
import { lookupDeviceByImeiOrSerial } from "@/server/devices";
import { createRepairTicketFromForm } from "@/server/repairs-intake";

type Customer = { id: string; name: string };
type Device = {
  id: string;
  brand: string;
  model: string;
  imei: string | null;
  serialNumber: string | null;
  storage: string | null;
  color: string | null;
};

export function NewRepairForm({
  customers,
  devices,
  defaultCustomerId,
}: {
  customers: Customer[];
  devices: Device[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("");
  const [color, setColor] = useState("");
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [storageOptions, setStorageOptions] = useState<string[]>([]);
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [createNew, setCreateNew] = useState(true);
  const [problemFaults, setProblemFaults] = useState<string[]>([]);
  const [problemComment, setProblemComment] = useState("");
  const [conditionGrade, setConditionGrade] = useState("");
  const [cosmeticFaults, setCosmeticFaults] = useState<string[]>([]);
  const [conditionComment, setConditionComment] = useState("");

  const [photoTicketId, setPhotoTicketId] = useState<string | null>(null);
  const [photoCategory, setPhotoCategory] = useState("INTAKE_FRONT");
  const [photoNote, setPhotoNote] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  function onLookup() {
    const q = imei.trim() || serial.trim();
    if (!q) {
      setLookupMsg("Skriv IMEI eller serienummer først.");
      return;
    }
    startTransition(async () => {
      const result = await lookupDeviceByImeiOrSerial(q);
      const { existing, catalog } = result;

      if (existing) {
        setCreateNew(false);
        setDeviceId(existing.id);
        setBrand(existing.brand);
        setModel(existing.model);
        setStorage(existing.storage ?? "");
        setColor(existing.color ?? "");
        setImei(existing.imei ?? imei);
        setSerial(existing.serialNumber ?? serial);
        setColorOptions([]);
        setStorageOptions([]);
        setLookupMsg(`Fant eksisterende enhet: ${existing.brand} ${existing.model}`);
        return;
      }

      if (catalog?.brand && catalog.model) {
        setCreateNew(true);
        setDeviceId("");
        setBrand(catalog.brand);
        setModel(catalog.model);
        setStorage("");
        setColor("");
        setColorOptions(catalog.colorOptions);
        setStorageOptions(catalog.storageOptions);
        if (catalog.storageOptions.length === 1) {
          setStorage(catalog.storageOptions[0] ?? "");
        }
        if (catalog.colorOptions.length === 1) {
          setColor(catalog.colorOptions[0] ?? "");
        }
        if (catalog.imei && catalog.imei.length >= 14) {
          setImei(catalog.imei);
        }
        setLookupMsg(catalog.sourceNote);
        return;
      }

      setLookupMsg(
        catalog?.sourceNote ||
          "Ingen treff. Serienummer finnes bare i vårt system; IMEI bruker lokal TAC-database.",
      );
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        if (problemFaults.length === 0) {
          throw new Error("Legg til minst én feil som må utbedres");
        }
        if (!conditionGrade) throw new Error("Velg karakter for fysisk tilstand");

        const customerProblem = formatProblemSummary(
          problemFaults,
          problemComment,
        );
        const physicalCondition = formatConditionSummary(
          conditionGrade,
          cosmeticFaults,
          conditionComment,
        );

        const result = await createRepairTicketFromForm({
          customerId: String(fd.get("customerId") || ""),
          deviceId: createNew ? null : deviceId || null,
          createNewDevice: createNew,
          brand,
          model,
          storage: storage || null,
          color: color || null,
          imei: imei || null,
          serialNumber: serial || null,
          customerProblem,
          physicalCondition,
        });
        setPhotoTicketId(result.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke opprette");
      }
    });
  }

  function uploadPhoto(fileList: FileList | null) {
    if (!photoTicketId || !fileList?.[0]) return;
    const formData = new FormData();
    formData.set("file", fileList[0]);
    startTransition(async () => {
      await uploadAttachment({
        entityType: "repair_ticket",
        entityId: photoTicketId,
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
        description: photoNote || null,
        visibility: "INTERNAL",
        formData,
      });
      setPhotoCount((n) => n + 1);
      setPhotoNote("");
    });
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="max-w-2xl space-y-5 rounded-2xl border border-border bg-surface p-5"
      >
        <div>
          <Label htmlFor="customerId">Kunde *</Label>
          <Select
            id="customerId"
            name="customerId"
            required
            defaultValue={defaultCustomerId ?? ""}
            className="mt-1.5"
          >
            <option value="">Velg kunde…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[12px] text-muted">
            Mangler kunde?{" "}
            <Link href="/customers?new=1" className="text-accent">
              Opprett først (faktureringsinfo påkrevd)
            </Link>
          </p>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Enhet — IMEI / serienummer</p>
          <p className="text-[12px] text-muted">
            IMEI lagres på enheten ved opprettelse (ikke bare til oppslag).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="newImei">IMEI</Label>
              <Input
                id="newImei"
                className="mt-1.5"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newSerial">Serienummer</Label>
              <Input
                id="newSerial"
                className="mt-1.5"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={onLookup}
          >
            Hent enhetsdata
          </Button>
          {lookupMsg ? (
            <p className="text-[12px] text-muted">{lookupMsg}</p>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createNew}
              onChange={(e) => setCreateNew(e.target.checked)}
            />
            Opprett / bruk ny enhet
          </label>

          {!createNew ? (
            <div>
              <Label htmlFor="deviceId">Eksisterende enhet</Label>
              <Select
                id="deviceId"
                className="mt-1.5"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required={!createNew}
              >
                <option value="">Velg…</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.brand} {d.model}
                    {d.imei ? ` · ${d.imei}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="newBrand">Merke *</Label>
                <Input
                  id="newBrand"
                  className="mt-1.5"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newModel">Modell *</Label>
                <Input
                  id="newModel"
                  className="mt-1.5"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
              </div>
              <ColorStorageFields
                storage={storage}
                color={color}
                storageOptions={storageOptions}
                colorOptions={colorOptions}
                onStorageChange={setStorage}
                onColorChange={setColor}
                storageId="newStorage"
                colorId="newColor"
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <MultiFaultPicker
            label="Feil som må utbedres"
            options={REPAIR_FAULTS}
            value={problemFaults}
            onChange={setProblemFaults}
            comment={problemComment}
            onCommentChange={setProblemComment}
            required
            addLabel="Legg til ny feil"
            emptyHint="Legg til én eller flere feil fra listen."
          />
          <p className="mt-3 text-[12px] text-muted">
            Kundevendt problemtekst skrives av tekniker etter diagnostikk — ikke her.
          </p>
        </div>

        <ConditionIntakeFields
          gradeKey={conditionGrade}
          onGradeChange={setConditionGrade}
          faultKeys={cosmeticFaults}
          onFaultsChange={setCosmeticFaults}
          comment={conditionComment}
          onCommentChange={setConditionComment}
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending || Boolean(photoTicketId)}>
            Opprett ticket
          </Button>
          <Link href="/repairs">
            <Button type="button" variant="ghost">
              Avbryt
            </Button>
          </Link>
        </div>
      </form>

      {photoTicketId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-lg font-medium tracking-[-0.02em]">
              Ta bilder ved mottak
            </h2>
            <p className="mt-2 text-sm text-muted">
              Anbefalt: forside, bakside, sider, topp, bunn + skader. {photoCount}{" "}
              bilde(r) lastet opp.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="photoCat">Vinkel</Label>
                <Select
                  id="photoCat"
                  className="mt-1.5"
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
              <div>
                <Label htmlFor="photoNote">Beskrivelse</Label>
                <Input
                  id="photoNote"
                  className="mt-1.5"
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="photoFile">Kamera / bilde</Label>
                <Input
                  id="photoFile"
                  className="mt-1.5"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => uploadPhoto(e.target.files)}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => router.push(`/repairs/${photoTicketId}`)}
              >
                Ferdig — gå til ticket
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(`/repairs/${photoTicketId}`)}
              >
                Hopp over bilder
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
