"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { updateFlipDevice } from "@/server/flips";

export function FlipDevicePanel({
  refurbishmentId,
  initial,
}: {
  refurbishmentId: string;
  initial: {
    model: string;
    storage: string | null;
    color: string | null;
    serialNumber: string | null;
    imei: string | null;
    batteryHealth: number | null;
    activationLockClear: boolean;
    findMyOff: boolean;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial.model);
  const [storage, setStorage] = useState(initial.storage ?? "");
  const [color, setColor] = useState(initial.color ?? "");
  const [serialNumber, setSerialNumber] = useState(initial.serialNumber ?? "");
  const [imei, setImei] = useState(initial.imei ?? "");
  const [batteryHealth, setBatteryHealth] = useState(
    initial.batteryHealth != null ? String(initial.batteryHealth) : "",
  );
  const [activationLockClear, setActivationLockClear] = useState(
    initial.activationLockClear,
  );
  const [findMyOff, setFindMyOff] = useState(initial.findMyOff);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const bh = batteryHealth.trim();
      await updateFlipDevice({
        refurbishmentId,
        model,
        storage,
        color,
        serialNumber,
        imei,
        batteryHealth: bh === "" ? null : Number.parseInt(bh, 10),
        activationLockClear,
        findMyOff,
        notes,
      });
      setMessage("Enhetsdata lagret.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="flip-model">Modell</Label>
          <Input
            id="flip-model"
            className="mt-1.5"
            value={model}
            disabled={pending}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="flip-storage">Lagring</Label>
          <Input
            id="flip-storage"
            className="mt-1.5"
            value={storage}
            disabled={pending}
            onChange={(e) => setStorage(e.target.value)}
            placeholder="f.eks. 128GB"
          />
        </div>
        <div>
          <Label htmlFor="flip-color">Farge</Label>
          <Input
            id="flip-color"
            className="mt-1.5"
            value={color}
            disabled={pending}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="flip-battery">Batterihelse (%)</Label>
          <Input
            id="flip-battery"
            className="mt-1.5"
            inputMode="numeric"
            value={batteryHealth}
            disabled={pending}
            onChange={(e) => setBatteryHealth(e.target.value)}
            placeholder="0–100"
          />
        </div>
        <div>
          <Label htmlFor="flip-imei">IMEI</Label>
          <Input
            id="flip-imei"
            className="mt-1.5"
            value={imei}
            disabled={pending}
            onChange={(e) => setImei(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="flip-serial">Serienummer</Label>
          <Input
            id="flip-serial"
            className="mt-1.5"
            value={serialNumber}
            disabled={pending}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activationLockClear}
            disabled={pending}
            onChange={(e) => setActivationLockClear(e.target.checked)}
          />
          Activation Lock fjernet
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={findMyOff}
            disabled={pending}
            onChange={(e) => setFindMyOff(e.target.checked)}
          />
          Finn iPhone av
        </label>
      </div>

      <div>
        <Label htmlFor="flip-notes">Notater</Label>
        <Textarea
          id="flip-notes"
          className="mt-1.5"
          rows={3}
          value={notes}
          disabled={pending}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          Lagre enhet
        </Button>
        {message ? <p className="text-[13px] text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
