"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  createPublicServiceOrder,
  lookupPublicImeiOrSerial,
} from "@/server/public-service-order";
import { PhoneCountryField } from "@/components/forms/PhoneCountryField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatNokFromOre, CUSTOMER_POSTAGE_ORE } from "@/lib/money";
import { WORKSHOP_FEES, PART_GRADE_CUSTOMER_TEXT } from "@/lib/legal";
import { REPAIR_TERMS_VERSION, repairTermsSections } from "@/lib/repair-terms";
import type { IphoneModelOption } from "@/lib/apple-models";
import { SignaturePad } from "@/components/forms/SignaturePad";

export function ServiceOrderForm({ models }: { models: IphoneModelOption[] }) {
  const [pending, setPending] = useState(false);
  const [lookupPending, startLookup] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [imei, setImei] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("");
  const [color, setColor] = useState("");
  const [lookupColors, setLookupColors] = useState<string[]>([]);
  const [lookupStorages, setLookupStorages] = useState<string[]>([]);
  const lastLookup = useRef("");
  const [phone, setPhone] = useState("");
  const [inboundMethod, setInboundMethod] = useState<"IN_PERSON" | "POST">(
    "IN_PERSON",
  );
  const [outboundMethod, setOutboundMethod] = useState<"IN_PERSON" | "POST">(
    "IN_PERSON",
  );
  const [step, setStep] = useState<"order" | "terms">("order");
  const [accepted, setAccepted] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const modelChoices = useMemo(() => {
    if (model && !models.some((m) => m.name === model)) {
      return [
        {
          name: model,
          colors: lookupColors,
          storages: lookupStorages,
        },
        ...models,
      ];
    }
    return models;
  }, [model, models, lookupColors, lookupStorages]);

  const selected = modelChoices.find((m) => m.name === model);

  const storageOptions = useMemo(() => {
    const fromLookup = lookupStorages.filter(Boolean);
    if (fromLookup.length > 0) return fromLookup;
    return selected?.storages.filter(Boolean) ?? [];
  }, [lookupStorages, selected]);

  const colorOptions = useMemo(() => {
    const fromLookup = lookupColors.filter(Boolean);
    if (fromLookup.length > 0) return fromLookup;
    return selected?.colors.filter(Boolean) ?? [];
  }, [lookupColors, selected]);

  function applyLookup(raw: string, force = false) {
    const q = raw.trim();
    if (q.length < 5) {
      setLookupMsg("Skriv IMEI eller serienummer først.");
      return;
    }
    if (!force && q === lastLookup.current) return;
    lastLookup.current = q;
    startLookup(async () => {
      const result = await lookupPublicImeiOrSerial(q);
      const foundImei = result.imei;
      if (foundImei && foundImei.length >= 14) {
        lastLookup.current = foundImei;
        setImei((prev) =>
          prev.replace(/\D/g, "") === foundImei ? prev : foundImei,
        );
      }
      setLookupColors(result.colorOptions);
      setLookupStorages(result.storageOptions);
      setStorage(
        result.storageOptions.length === 1 ? (result.storageOptions[0] ?? "") : "",
      );
      setColor(
        result.colorOptions.length === 1 ? (result.colorOptions[0] ?? "") : "",
      );
      if (result.model) {
        setModel(result.model);
      }
      setLookupMsg(result.note);
    });
  }

  function onIdentifierBlur() {
    const q = imei.trim() || serialNumber.trim();
    if (q.length < 8) return;
    applyLookup(q);
  }

  function goToTerms() {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const serial = String(new FormData(form).get("serialNumber") || "").trim();
    const imeiValue = String(new FormData(form).get("imei") || "").trim();
    if (!serial && !imeiValue) {
      setError("Oppgi serienummer eller IMEI — ett av dem er nok.");
      return;
    }
    setError(null);
    const name = String(new FormData(form).get("name") || "").trim();
    if (name && !signerName) setSignerName(name);
    setStep("terms");
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const serial = String(formData.get("serialNumber") || "").trim();
    const imeiValue = String(formData.get("imei") || "").trim();
    if (!serial && !imeiValue) {
      setPending(false);
      setError("Oppgi serienummer eller IMEI — ett av dem er nok.");
      return;
    }
    if (step !== "terms") {
      setPending(false);
      goToTerms();
      return;
    }
    if (!accepted) {
      setPending(false);
      setError("Du må bekrefte at du har lest betingelsene.");
      return;
    }
    if (!signerName.trim() || !signature) {
      setPending(false);
      setError("Skriv navn og signer før ordren opprettes.");
      return;
    }
    const result = await createPublicServiceOrder({
      honeypot: String(formData.get("company") || ""),
      name: String(formData.get("name") || ""),
      phone: phone || String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      streetAddress: String(formData.get("streetAddress") || ""),
      postalCode: String(formData.get("postalCode") || ""),
      city: String(formData.get("city") || ""),
      brand: "Apple",
      model: String(formData.get("model") || ""),
      storage: String(formData.get("storage") || "") || null,
      color: String(formData.get("color") || "") || null,
      serialNumber: serial || null,
      imei: imeiValue || null,
      customerProblem: String(formData.get("customerProblem") || ""),
      inboundMethod,
      outboundMethod,
      termsVersion: REPAIR_TERMS_VERSION,
      termsAccepted: true,
      termsSignerName: signerName.trim(),
      signaturePng: signature,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = `/s/takk?token=${encodeURIComponent(result.token)}`;
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-6">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <fieldset className={`space-y-3 ${step === "terms" ? "hidden" : ""}`}>
        <legend className="text-sm font-semibold text-foreground">
          Personalia
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Navn</Label>
            <Input id="name" name="name" required className="mt-1" />
          </div>
          <div>
            <PhoneCountryField value={phone} onChange={setPhone} />
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

      <fieldset className={`space-y-3 ${step === "terms" ? "hidden" : ""}`}>
        <legend className="text-sm font-semibold text-foreground">Enhet</legend>
        <p className="text-[13px] text-muted">
          Fyll inn IMEI eller serienummer. IMEI (15 siffer) henter modell
          automatisk. Ett av feltene er nok.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="imei">IMEI</Label>
            <Input
              id="imei"
              name="imei"
              inputMode="numeric"
              className="mt-1"
              value={imei}
              onChange={(e) => {
                const next = e.target.value;
                setImei(next);
                const digits = next.replace(/\D/g, "");
                if (digits.length === 15) applyLookup(digits);
              }}
              onBlur={onIdentifierBlur}
            />
          </div>
          <div>
            <Label htmlFor="serialNumber">Serienummer</Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              className="mt-1"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              onBlur={onIdentifierBlur}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={lookupPending}
              onClick={() =>
                applyLookup(imei.trim() || serialNumber.trim(), true)
              }
            >
              {lookupPending ? "Henter…" : "Hent modell"}
            </Button>
            {lookupMsg ? (
              <p className="mt-2 text-[13px] text-muted">{lookupMsg}</p>
            ) : null}
          </div>
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
                setLookupColors([]);
                setLookupStorages([]);
                setStorage("");
                setColor("");
              }}
            >
              <option value="">Velg iPhone…</option>
              {modelChoices.map((m) => (
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
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
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
              <Input
                id="color"
                name="color"
                className="mt-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            )}
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

      <fieldset className={`space-y-3 ${step === "terms" ? "hidden" : ""}`}>
        <legend className="text-sm font-semibold text-foreground">
          Innlevering og utlevering
        </legend>
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
              <option value="POST">Send selv (0 kr)</option>
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
              <option value="POST">
                Sendes tilbake ({formatNokFromOre(CUSTOMER_POSTAGE_ORE)})
              </option>
            </Select>
          </div>
        </div>
      </fieldset>

      {step === "terms" ? (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground">
            Reparasjonsbetingelser
          </legend>
          <p className="text-[13px] text-muted">
            Les gjennom og signer. Ordren opprettes ikke før du har signert.
            Diagnose koster {WORKSHOP_FEES.diagnosisKr} kr. Ingen feil funnet,
            eller hvis du takker nei etter diagnose:{" "}
            {WORKSHOP_FEES.noFaultKr} kr. Godkjent og utført reparasjon:
            diagnosen inngår i prisen og belastes ikke separat. Send selv inn:{" "}
            {WORKSHOP_FEES.inboundPostageKr} kr i porto fra oss. Returporto:{" "}
            {WORKSHOP_FEES.returnPostageKr} kr. {PART_GRADE_CUSTOMER_TEXT}
          </p>
          <p className="text-[13px] text-muted">
            Egne sider:{" "}
            <Link href="/s/vilkar" className="text-accent underline">
              vilkår
            </Link>
            {", "}
            <Link href="/s/innlevering-vilkar" className="text-accent underline">
              inn- og utlevering
            </Link>
            {", "}
            <Link href="/s/garanti" className="text-accent underline">
              garanti
            </Link>
            {" og "}
            <Link href="/s/personvern" className="text-accent underline">
              personvern
            </Link>
            .
          </p>
          <div className="max-h-[360px] space-y-3 overflow-y-auto rounded border border-border bg-surface p-3 text-[13px] leading-5">
            {repairTermsSections().map((section) => (
              <div key={section.title}>
                <p className="font-semibold">{section.title}</p>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-1 text-muted">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <a
            href="/api/public/repair-terms"
            className="inline-block text-[13px] text-accent underline"
          >
            Last ned betingelsene som PDF
          </a>
          <div>
            <Label htmlFor="signerName">Navn (signatur)</Label>
            <Input
              id="signerName"
              className="mt-1"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required={step === "terms"}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Håndskrift</p>
            <SignaturePad onChange={setSignature} />
          </div>
          <label className="flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              Jeg har lest reparasjonsbetingelsene og godtar dem. Jeg eier
              enheten eller har rett til å levere den inn.
            </span>
          </label>
        </fieldset>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {step === "order" ? (
        <Button type="button" onClick={goToTerms} disabled={pending}>
          Fortsett til betingelser
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep("order")}
            disabled={pending}
          >
            Tilbake
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Oppretter…" : "Signer og opprett serviceordre"}
          </Button>
        </div>
      )}
    </form>
  );
}
