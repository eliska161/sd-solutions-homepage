"use client";

import { useMemo, useState } from "react";
import { createPublicServiceOrder } from "@/server/public-service-order";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatNokFromOre, CUSTOMER_POSTAGE_ORE } from "@/lib/money";
import type { IphoneModelOption } from "@/lib/apple-models";

export function ServiceOrderForm({ models }: { models: IphoneModelOption[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("");
  const [color, setColor] = useState("");
  const [inboundMethod, setInboundMethod] = useState<"IN_PERSON" | "POST">(
    "IN_PERSON",
  );
  const [outboundMethod, setOutboundMethod] = useState<"IN_PERSON" | "POST">(
    "IN_PERSON",
  );

  const selected = models.find((m) => m.name === model);
  const postageOre =
    (inboundMethod === "POST" ? CUSTOMER_POSTAGE_ORE : 0) +
    (outboundMethod === "POST" ? CUSTOMER_POSTAGE_ORE : 0);

  const storageOptions = useMemo(
    () => selected?.storages.filter(Boolean) ?? [],
    [selected],
  );
  const colorOptions = useMemo(
    () => selected?.colors.filter(Boolean) ?? [],
    [selected],
  );

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const serialNumber = String(formData.get("serialNumber") || "").trim();
    const imei = String(formData.get("imei") || "").trim();
    if (!serialNumber && !imei) {
      setPending(false);
      setError("Oppgi serienummer eller IMEI — ett av dem er nok.");
      return;
    }
    const result = await createPublicServiceOrder({
      honeypot: String(formData.get("company") || ""),
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      streetAddress: String(formData.get("streetAddress") || ""),
      postalCode: String(formData.get("postalCode") || ""),
      city: String(formData.get("city") || ""),
      brand: "Apple",
      model: String(formData.get("model") || ""),
      storage: String(formData.get("storage") || "") || null,
      color: String(formData.get("color") || "") || null,
      serialNumber: serialNumber || null,
      imei: imei || null,
      customerProblem: String(formData.get("customerProblem") || ""),
      inboundMethod,
      outboundMethod,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = `/s/${result.token}?ny=1`;
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Personalia
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Navn</Label>
            <Input id="name" name="name" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" type="tel" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">E-post</Label>
            <Input id="email" name="email" type="email" required className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="streetAddress">Adresse</Label>
            <Input
              id="streetAddress"
              name="streetAddress"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">Postnummer</Label>
            <Input id="postalCode" name="postalCode" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="city">Sted</Label>
            <Input id="city" name="city" required className="mt-1" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Enhet</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="model">Modell</Label>
            <Select
              id="model"
              name="model"
              required
              className="mt-1"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setStorage("");
                setColor("");
              }}
            >
              <option value="">Velg iPhone…</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="storage">Lagring</Label>
            {storageOptions.length > 0 ? (
              <Select
                id="storage"
                name="storage"
                className="mt-1"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
              >
                <option value="">Velg…</option>
                {storageOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="storage"
                name="storage"
                className="mt-1"
                placeholder="f.eks. 128 GB"
              />
            )}
          </div>
          <div>
            <Label htmlFor="color">Farge</Label>
            {colorOptions.length > 0 ? (
              <Select
                id="color"
                name="color"
                className="mt-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                <option value="">Velg…</option>
                {colorOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            ) : (
              <Input id="color" name="color" className="mt-1" />
            )}
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-foreground">
              Serienummer eller IMEI
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              Ett av feltene er nok. Du trenger ikke fylle inn begge.
            </p>
          </div>
          <div>
            <Label htmlFor="serialNumber">Serienummer</Label>
            <Input id="serialNumber" name="serialNumber" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="imei">IMEI</Label>
            <Input id="imei" name="imei" inputMode="numeric" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="customerProblem">Hva er feil?</Label>
            <Textarea
              id="customerProblem"
              name="customerProblem"
              required
              className="mt-1"
              placeholder="Beskriv feilen, når den oppsto, og om telefonen har vært i vann, falt, osv."
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Innlevering og utlevering
        </legend>
        <p className="text-[13px] text-muted">
          Post koster {formatNokFromOre(CUSTOMER_POSTAGE_ORE)} ekstra hver vei.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="inboundMethod">Innlevering</Label>
            <Select
              id="inboundMethod"
              className="mt-1"
              value={inboundMethod}
              onChange={(e) =>
                setInboundMethod(e.target.value as "IN_PERSON" | "POST")
              }
            >
              <option value="IN_PERSON">Leveres i butikk</option>
              <option value="POST">Sendes med post (+69 kr)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="outboundMethod">Utlevering</Label>
            <Select
              id="outboundMethod"
              className="mt-1"
              value={outboundMethod}
              onChange={(e) =>
                setOutboundMethod(e.target.value as "IN_PERSON" | "POST")
              }
            >
              <option value="IN_PERSON">Hentes i butikk</option>
              <option value="POST">Returneres med post (+69 kr)</option>
            </Select>
          </div>
        </div>
        {postageOre > 0 ? (
          <p className="text-sm font-medium text-foreground">
            Porto: {formatNokFromOre(postageOre)}
          </p>
        ) : (
          <p className="text-sm text-muted">Ingen porto — fysisk inn/ut.</p>
        )}
      </fieldset>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Oppretter…" : "Opprett serviceordre"}
      </Button>
    </form>
  );
}
