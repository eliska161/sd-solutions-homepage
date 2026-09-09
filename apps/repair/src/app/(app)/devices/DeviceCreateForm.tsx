"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ColorStorageFields } from "@/components/forms/ColorStorageFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { createDevice, lookupDeviceByImeiOrSerial } from "@/server/devices";

type Customer = { id: string; name: string };

export function DeviceCreateForm({
  customers,
  defaultCustomerId,
}: {
  customers: Customer[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [storage, setStorage] = useState("");
  const [color, setColor] = useState("");
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [storageOptions, setStorageOptions] = useState<string[]>([]);
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");

  function onLookup() {
    const q = imei.trim() || serial.trim();
    if (!q) {
      setLookupMsg("Skriv IMEI (eller serienummer) først.");
      return;
    }
    startTransition(async () => {
      const { existing, catalog } = await lookupDeviceByImeiOrSerial(q);
      if (existing) {
        setLookupMsg(
          `Enhet finnes allerede: ${existing.brand} ${existing.model} — åpner den.`,
        );
        router.push(`/devices/${existing.id}`);
        return;
      }
      if (catalog?.brand && catalog.model) {
        setBrand(catalog.brand);
        setModel(catalog.model);
        setStorage("");
        setColor("");
        setColorOptions(catalog.colorOptions);
        setStorageOptions(catalog.storageOptions);
        setVariant(catalog.ios?.identifier ?? "");
        if (catalog.storageOptions.length === 1) {
          setStorage(catalog.storageOptions[0] ?? "");
        }
        if (catalog.colorOptions.length === 1) {
          setColor(catalog.colorOptions[0] ?? "");
        }
        if (catalog.imei.length >= 14) setImei(catalog.imei);
        setLookupMsg(catalog.sourceNote);
        return;
      }
      setLookupMsg(
        catalog?.sourceNote ||
          "Ingen TAC-treff. Fyll merke/modell manuelt.",
      );
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const batteryRaw = String(fd.get("batteryHealth") || "");
    startTransition(async () => {
      try {
        const row = await createDevice({
          brand,
          model,
          variant: variant || null,
          storage: storage || null,
          color: color || null,
          serialNumber: serial || null,
          imei: imei || null,
          batteryHealth: batteryRaw ? Number(batteryRaw) : null,
          condition: String(fd.get("condition") || "") || null,
          ownershipType: (String(fd.get("ownershipType") || "CUSTOMER") as
            | "CUSTOMER"
            | "SD_SOLUTIONS"
            | "UNKNOWN"),
          customerId: String(fd.get("customerId") || "") || null,
        });
        router.push(`/devices/${row.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke opprette");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <p className="text-sm font-medium text-foreground">Ny enhet</p>
        <p className="mt-1 text-[12px] text-muted">
          IMEI-oppslag bruker lokal TAC-database (+ ios-device-list for Apple).
        </p>
      </div>

      <div>
        <Label htmlFor="imei">IMEI</Label>
        <Input
          id="imei"
          className="mt-1.5"
          value={imei}
          onChange={(e) => setImei(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="serialNumber">Serienummer</Label>
        <Input
          id="serialNumber"
          className="mt-1.5"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onLookup}
        >
          Hent fra IMEI / serienummer
        </Button>
        {lookupMsg ? (
          <p className="text-[12px] text-muted">{lookupMsg}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="brand">Merke</Label>
        <Input
          id="brand"
          className="mt-1.5"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="model">Modell *</Label>
        <Input
          id="model"
          className="mt-1.5"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="variant">Variant / identifier</Label>
        <Input
          id="variant"
          className="mt-1.5"
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
        />
      </div>
      <ColorStorageFields
        storage={storage}
        color={color}
        storageOptions={storageOptions}
        colorOptions={colorOptions}
        onStorageChange={setStorage}
        onColorChange={setColor}
      />
      <div>
        <Label htmlFor="batteryHealth">Batterihelse %</Label>
        <Input
          id="batteryHealth"
          name="batteryHealth"
          type="number"
          min={0}
          max={100}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="ownershipType">Eierskap</Label>
        <Select
          id="ownershipType"
          name="ownershipType"
          defaultValue="CUSTOMER"
          className="mt-1.5"
        >
          <option value="CUSTOMER">Kunde</option>
          <option value="SD_SOLUTIONS">SD Solutions</option>
          <option value="UNKNOWN">Ukjent</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Select
          id="customerId"
          name="customerId"
          defaultValue={defaultCustomerId ?? ""}
          className="mt-1.5"
        >
          <option value="">Ingen / SD Solutions</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="condition">Tilstand</Label>
        <Input id="condition" name="condition" className="mt-1.5" />
      </div>
      {error ? (
        <p className="sm:col-span-2 text-sm text-danger">{error}</p>
      ) : null}
      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" disabled={pending}>
          Opprett enhet
        </Button>
      </div>
    </form>
  );
}
