"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { MoneyText } from "@/components/ui/MoneyText";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { parseKrToOre } from "@/lib/labels";
import { orderPartForRepair, usePartOnRepair } from "@/server/parts";

type PartOption = {
  id: string;
  name: string;
  sku: string;
  quantityOnHand: number;
  active: boolean;
};

type UsedPart = {
  id: string;
  quantity: number;
  unitCostOre: number;
  status?: string | null;
  notes?: string | null;
  partName: string | null;
  partSku: string | null;
};

export function TicketPartsPanel({
  ticketId,
  usedParts,
  parts,
}: {
  ticketId: string;
  usedParts: UsedPart[];
  parts: PartOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [partType, setPartType] = useState("OTHER");
  const [orderQty, setOrderQty] = useState("1");
  const [costKr, setCostKr] = useState("");

  const inStock = parts.filter((p) => p.active && p.quantityOnHand > 0);

  function resetOrderForm() {
    setName("");
    setDetails("");
    setBrand("");
    setCategory("");
    setPartType("OTHER");
    setOrderQty("1");
    setCostKr("");
  }

  return (
    <div className="space-y-4">
      {usedParts.length === 0 ? (
        <p className="text-sm text-muted">Ingen deler knyttet til ticketen.</p>
      ) : (
        usedParts.map((p) => (
          <div
            key={p.id}
            className="flex justify-between gap-3 text-sm border-b border-border pb-2"
          >
            <div>
              <p>
                {p.quantity} × {p.partName} ({p.partSku})
              </p>
              <p className="text-[12px] text-muted">
                {p.status === "ORDERED" ? "Bestilt" : "Brukt"}
                {p.notes ? ` · ${p.notes}` : ""}
              </p>
            </div>
            <MoneyText ore={p.quantity * p.unitCostOre} />
          </div>
        ))
      )}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!partId) return;
          startTransition(async () => {
            try {
              await usePartOnRepair({
                ticketId,
                partId,
                quantity: Number(qty) || 1,
              });
              setPartId("");
              setQty("1");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Feil");
            }
          });
        }}
      >
        <Select
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          className="max-w-sm flex-1"
          required={inStock.length > 0}
          disabled={inStock.length === 0}
        >
          <option value="">
            {inStock.length === 0 ? "Ingen deler på lager…" : "Velg del…"}
          </option>
          {inStock.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.quantityOnHand} på lager)
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-24"
          disabled={inStock.length === 0}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || inStock.length === 0}
        >
          Bruk del
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(true)}
        >
          Bestill ny del
        </Button>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          resetOrderForm();
        }}
        title="Bestill / legg til del uten lager"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                await orderPartForRepair({
                  ticketId,
                  name,
                  details,
                  brand: brand || null,
                  category: category || null,
                  partType: partType as
                    | "OEM"
                    | "ORIGINAL_PULL"
                    | "SOFT_OLED"
                    | "HARD_OLED"
                    | "LCD"
                    | "INCELL"
                    | "BATTERY"
                    | "FLEX"
                    | "OTHER",
                  quantity: Number(orderQty) || 1,
                  estimatedCostOre: parseKrToOre(costKr) || 0,
                  setTicketWaiting: true,
                });
                setOpen(false);
                resetOrderForm();
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Feil");
              }
            });
          }}
        >
          <p className="text-[12px] text-muted">
            Oppretter delen i katalogen med 0 på lager og markerer den som{" "}
            <span className="text-foreground">bestilt</span> på ticketen.
          </p>
          <div>
            <Label htmlFor="ordName">Hva trengs? *</Label>
            <Input
              id="ordName"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="F.eks. Soft OLED iPhone 14 Pro"
            />
          </div>
          <div>
            <Label htmlFor="ordDetails">Detaljer</Label>
            <Textarea
              id="ordDetails"
              className="mt-1.5"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Farge, leverandør, merknad, modellvariant…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ordBrand">Merke</Label>
              <Input
                id="ordBrand"
                className="mt-1.5"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Apple"
              />
            </div>
            <div>
              <Label htmlFor="ordCat">Kategori</Label>
              <Input
                id="ordCat"
                className="mt-1.5"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Skjerm / Batteri…"
              />
            </div>
            <div>
              <Label htmlFor="ordType">Type</Label>
              <Select
                id="ordType"
                className="mt-1.5"
                value={partType}
                onChange={(e) => setPartType(e.target.value)}
              >
                <option value="OTHER">Annet</option>
                <option value="SOFT_OLED">Soft OLED</option>
                <option value="HARD_OLED">Hard OLED</option>
                <option value="LCD">LCD</option>
                <option value="INCELL">Incell</option>
                <option value="BATTERY">Batteri</option>
                <option value="OEM">OEM</option>
                <option value="ORIGINAL_PULL">Original pull</option>
                <option value="FLEX">Flex</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ordQty">Antall</Label>
              <Input
                id="ordQty"
                type="number"
                min={1}
                className="mt-1.5"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ordCost">Estimert kost (kr)</Label>
              <Input
                id="ordCost"
                className="mt-1.5"
                value={costKr}
                onChange={(e) => setCostKr(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Lagrer…" : "Legg til som bestilt"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                resetOrderForm();
              }}
            >
              Avbryt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
