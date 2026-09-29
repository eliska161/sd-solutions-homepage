"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  createPublicServiceOrder,
  lookupPublicDevice,
} from "@/server/public-service-order";
import { PhoneCountryField } from "@/components/forms/PhoneCountryField";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatNokFromOre, CUSTOMER_POSTAGE_ORE } from "@/lib/money";
import { LEGAL_PARTY, WORKSHOP_FEES, PART_GRADE_CUSTOMER_TEXT } from "@/lib/legal";
import {
  JOB_TYPE_LABELS,
  partGradeOptionsForJob,
  quotePublicPart,
  type PartGrade,
  type PublicJobType,
} from "@/lib/part-grades";
import { REPAIR_TERMS_VERSION, repairTermsSections } from "@/lib/repair-terms";
import type { IphoneModelOption } from "@/lib/apple-models";
import { SignaturePad } from "@/components/forms/SignaturePad";
import { customerPriceWithLabor } from "@/lib/vat";

const ORDER_STEPS = [
  { id: "contact", label: "Kontakt" },
  { id: "device", label: "Enhet" },
  { id: "job", label: "Reparasjon" },
  { id: "delivery", label: "Levering" },
  { id: "terms", label: "Betingelser" },
] as const;

type OrderStep = (typeof ORDER_STEPS)[number]["id"];

function compactSerial(raw: string) {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function StepBar({
  step,
  onBackTo,
}: {
  step: OrderStep;
  onBackTo: (next: OrderStep) => void;
}) {
  const current = ORDER_STEPS.findIndex((row) => row.id === step);
  return (
    <ol className="mb-4 flex items-start gap-1 sm:gap-2">
      {ORDER_STEPS.map((row, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={row.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <span
                aria-hidden
                className={`hidden h-px flex-1 sm:block ${
                  done || active ? "bg-accent" : "bg-border"
                }`}
              />
            ) : null}
            <button
              type="button"
              disabled={!done}
              onClick={() => onBackTo(row.id)}
              className="flex min-w-0 flex-col items-center gap-1 disabled:cursor-default sm:flex-row sm:gap-2"
            >
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  done
                    ? "bg-accent text-white"
                    : active
                      ? "bg-accent/15 text-accent ring-2 ring-accent"
                      : "border border-border bg-white text-muted",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span
                className={[
                  "max-w-full truncate text-[10px] leading-tight sm:text-[12px]",
                  active
                    ? "font-medium text-foreground"
                    : done
                      ? "text-foreground"
                      : "text-muted",
                ].join(" ")}
              >
                {row.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function ServiceOrderForm({
  models,
  chargeVat,
}: {
  models: IphoneModelOption[];
  chargeVat: boolean;
}) {
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
  const [lookupKind, setLookupKind] = useState<"ok" | "miss" | null>(null);
  const [phone, setPhone] = useState("");
  const [inboundMethod, setInboundMethod] = useState<"IN_PERSON" | "POST">(
    "IN_PERSON",
  );
  const [outboundMethod, setOutboundMethod] = useState<"IN_PERSON" | "POST">(
    "IN_PERSON",
  );
  const [jobType, setJobType] = useState<PublicJobType>("screen");
  const [partGrade, setPartGrade] = useState<PartGrade>("copy");
  const [step, setStep] = useState<OrderStep>("contact");
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
  const partQuote =
    jobType !== "other" && model
      ? quotePublicPart({
          deviceLabel: model,
          jobType,
          partGrade,
        })
      : null;

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

  function applyLookup(
    force = false,
    overrides?: { imei?: string; serialNumber?: string },
  ) {
    const imeiValue = (overrides?.imei ?? imei).trim();
    const serialValue = (overrides?.serialNumber ?? serialNumber).trim();
    if (imeiValue.replace(/\D/g, "").length < 8 && compactSerial(serialValue).length < 8) {
      setLookupKind(null);
      setLookupMsg("Skriv IMEI (15 siffer) eller serienummer først.");
      return;
    }
    const key = `${imeiValue}|${serialValue}`;
    if (!force && key === lastLookup.current) return;
    lastLookup.current = key;
    startLookup(async () => {
      const result = await lookupPublicDevice({
        imei: imeiValue,
        serialNumber: serialValue,
      });
      const foundImei = result.imei;
      if (foundImei && foundImei.replace(/\D/g, "").length >= 14) {
        setImei((prev) =>
          prev.replace(/\D/g, "") === foundImei.replace(/\D/g, "")
            ? prev
            : foundImei,
        );
      }
      if (result.serialNumber && compactSerial(result.serialNumber).length >= 8) {
        setSerialNumber((prev) =>
          compactSerial(prev) === compactSerial(result.serialNumber || "")
            ? prev
            : result.serialNumber || prev,
        );
      }
      setLookupColors(result.colorOptions);
      setLookupStorages(result.storageOptions);
      if (result.storageOptions.length === 1) {
        setStorage(result.storageOptions[0] ?? "");
      } else if (
        result.storageOptions.length > 0 &&
        !result.storageOptions.includes(storage)
      ) {
        setStorage("");
      }
      if (result.colorOptions.length === 1) {
        setColor(result.colorOptions[0] ?? "");
      } else if (
        result.colorOptions.length > 0 &&
        !result.colorOptions.includes(color)
      ) {
        setColor("");
      }
      if (result.model) {
        setModel(result.model);
      }
      setLookupKind(result.model ? "ok" : "miss");
      setLookupMsg(result.note);
    });
  }

  function goTo(next: OrderStep) {
    setError(null);
    const form = formRef.current;
    if (form && !form.reportValidity()) return;

    if (step === "contact") {
      if (phone.replace(/\D/g, "").length < 8) {
        setError("Telefonnummer er påkrevd.");
        return;
      }
    }

    if (step === "device") {
      const serial = serialNumber.trim();
      const imeiValue = imei.trim();
      if (!serial && !imeiValue) {
        setError("Oppgi serienummer eller IMEI — ett av dem er nok.");
        return;
      }
      if (!model.trim()) {
        setError("Velg modell.");
        return;
      }
    }

    if (step === "job") {
      const problem = form
        ? String(new FormData(form).get("customerProblem") || "").trim()
        : "";
      if (jobType === "other") {
        if (problem.length < 8) {
          setError("Beskriv feilen med minst noen setninger.");
          return;
        }
      } else if (!partGrade) {
        setError("Velg deltype.");
        return;
      }
    }

    if (next === "terms") {
      const name = form
        ? String(new FormData(form).get("name") || "").trim()
        : "";
      if (name && !signerName) setSignerName(name);
    }

    setStep(next);
  }

  function nextStep() {
    const index = ORDER_STEPS.findIndex((row) => row.id === step);
    const following = ORDER_STEPS[index + 1];
    if (following) goTo(following.id);
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const serial = String(formData.get("serialNumber") || "").trim();
    const imeiValue = String(formData.get("imei") || "").trim();
    if (!serial && !imeiValue) {
      setPending(false);
      setError("Oppgi serienummer eller IMEI — ett av dem er nok.");
      setStep("device");
      return;
    }
    if (step !== "terms") {
      setPending(false);
      nextStep();
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
      jobType,
      partGrade: jobType === "other" ? null : partGrade,
      batteryHealth:
        jobType === "battery" && partGrade === "oem_pull" ? "99_100" : null,
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
    window.location.href = `${LEGAL_PARTY.web}/takk/serviceordre?token=${encodeURIComponent(result.token)}`;
  }

  const stepMeta: Record<OrderStep, { title: string; description: string }> = {
    contact: {
      title: "Kontakt",
      description: "Navn og adresse vi bruker på saken.",
    },
    device: {
      title: "Enhet",
      description: "Lim inn IMEI eller serienummer. Én av dem holder.",
    },
    job: {
      title: "Reparasjon",
      description: "Hva som skal gjøres, og hvilken deltype du vil ha.",
    },
    delivery: {
      title: "Levering",
      description: "Hvordan telefonen kommer inn og ut.",
    },
    terms: {
      title: "Betingelser",
      description: "Les og signer før ordren opprettes.",
    },
  };

  return (
    <form ref={formRef} action={onSubmit} className="space-y-4">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <StepBar
        step={step}
        onBackTo={(next) => {
          setError(null);
          setStep(next);
        }}
      />

      <Card>
        <CardHeader
          title={stepMeta[step].title}
          description={stepMeta[step].description}
        />
        <CardBody className="space-y-4">
          <fieldset className={`space-y-3 ${step === "contact" ? "" : "hidden"}`}>
            <legend className="sr-only">Personalia</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  name="name"
                  required={step === "contact"}
                  className="mt-1"
                />
              </div>
              <div>
                <PhoneCountryField
                  value={phone}
                  onChange={setPhone}
                  required={step === "contact"}
                />
              </div>
              <div>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required={step === "contact"}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="streetAddress">Adresse</Label>
                <Input
                  id="streetAddress"
                  name="streetAddress"
                  required={step === "contact"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postnummer</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  required={step === "contact"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">Sted</Label>
                <Input
                  id="city"
                  name="city"
                  required={step === "contact"}
                  className="mt-1"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={`space-y-4 ${step === "device" ? "" : "hidden"}`}>
            <legend className="sr-only">Enhet</legend>
            <p className="text-[13px] leading-5 text-muted">
              Finn tallene på iPhonen under{" "}
              <span className="text-foreground">
                Innstillinger → Generelt → Om
              </span>
              . Lim inn ett av dem — vi henter modell automatisk når vi kan.
            </p>
            <div className="space-y-3 rounded-xl border border-border bg-white p-3 sm:p-4">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <Label htmlFor="imei">IMEI</Label>
                  <span
                    className={`text-[12px] tabular-nums ${
                      imei.replace(/\D/g, "").length === 15
                        ? "text-accent"
                        : "text-muted"
                    }`}
                  >
                    {imei.replace(/\D/g, "").length}/15
                  </span>
                </div>
                <Input
                  id="imei"
                  name="imei"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={15}
                  placeholder="15 siffer"
                  className="mt-1 h-11 font-mono text-[15px] tracking-[0.12em]"
                  value={imei}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 15);
                    setImei(next);
                    if (next.length === 15) {
                      applyLookup(false, { imei: next });
                    }
                  }}
                  onBlur={() => {
                    if (imei.replace(/\D/g, "").length === 15) applyLookup();
                  }}
                />
                <p className="mt-1 text-[12px] text-muted">
                  Står som IMEI i Om. Best til å treffe riktig modell.
                </p>
              </div>
              <p className="text-center text-[12px] font-medium uppercase tracking-wide text-muted">
                eller
              </p>
              <div>
                <div className="flex items-end justify-between gap-3">
                  <Label htmlFor="serialNumber">Serienummer</Label>
                  <span className="text-[12px] tabular-nums text-muted">
                    {compactSerial(serialNumber).length
                      ? `${compactSerial(serialNumber).length} tegn`
                      : "10–12 tegn"}
                  </span>
                </div>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="characters"
                  placeholder="F.eks. F2LX1234Q6L7"
                  className="mt-1 h-11 font-mono text-[15px] tracking-[0.08em] uppercase"
                  value={serialNumber}
                  onChange={(e) => {
                    const next = compactSerial(e.target.value).slice(0, 14);
                    setSerialNumber(next);
                    if (next.length >= 10) {
                      applyLookup(false, { serialNumber: next });
                    }
                  }}
                  onBlur={() => {
                    if (compactSerial(serialNumber).length >= 8) applyLookup();
                  }}
                />
                <p className="mt-1 text-[12px] text-muted">
                  Står som serienummer i Om. Treffer hvis telefonen har vært her
                  før.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={
                    lookupPending ||
                    (imei.replace(/\D/g, "").length < 8 &&
                      compactSerial(serialNumber).length < 8)
                  }
                  onClick={() => applyLookup(true)}
                >
                  {lookupPending ? "Slår opp…" : "Slå opp"}
                </Button>
                {lookupPending ? (
                  <p className="text-[13px] text-muted">Henter modell…</p>
                ) : lookupMsg ? (
                  <p
                    className={`text-[13px] ${
                      lookupKind === "ok"
                        ? "font-medium text-foreground"
                        : "text-muted"
                    }`}
                    role="status"
                  >
                    {lookupMsg}
                  </p>
                ) : (
                  <p className="text-[13px] text-muted">
                    Oppslag skjer når IMEI er 15 siffer, eller når
                    serienummeret er ferdig.
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="model">Modell</Label>
                <Select
                  id="model"
                  name="model"
                  required={step === "device"}
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
            </div>
          </fieldset>

          <fieldset className={`space-y-3 ${step === "job" ? "" : "hidden"}`}>
            <legend className="sr-only">Reparasjon</legend>
            <div>
              <Label htmlFor="jobType">Hva skal gjøres?</Label>
              <Select
                id="jobType"
                className="mt-1"
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value as PublicJobType);
                }}
              >
                <option value="screen">{JOB_TYPE_LABELS.screen}</option>
                <option value="battery">{JOB_TYPE_LABELS.battery}</option>
                <option value="other">{JOB_TYPE_LABELS.other}</option>
              </Select>
              {jobType !== "other" ? (
                <p className="mt-1 text-[13px] text-muted">
                  Ferdig-neste-virkedag gjelder bare skjerm- og batteribytte.
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-muted">
                  Annet arbeid har ikke neste-virkedag-fristen. Vi gir pris etter
                  diagnose.
                </p>
              )}
            </div>
            {jobType !== "other" ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Deltype</p>
                <div className="grid gap-2">
                  {partGradeOptionsForJob(jobType).map((option) => {
                    const optionQuote = model
                      ? quotePublicPart({
                          deviceLabel: model,
                          jobType,
                          partGrade: option.id,
                        })
                      : null;
                    return (
                      <label
                        key={option.id}
                        className="flex cursor-pointer gap-3 rounded-xl border border-border bg-white px-3 py-2.5"
                      >
                        <input
                          type="radio"
                          name="partGrade"
                          className="mt-1"
                          checked={partGrade === option.id}
                          onChange={() => setPartGrade(option.id)}
                        />
                        <span>
                          <span className="block text-[15px] text-foreground">
                            {option.label}
                            {optionQuote ? ` · ${optionQuote.priceLabel}` : ""}
                          </span>
                          <span className="block text-[13px] text-muted">
                            {option.help}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {partQuote ? (
                  <p className="text-[15px] font-semibold text-foreground">
                    Estimert pris: {partQuote.priceLabel}{" "}
                    {customerPriceWithLabor(chargeVat)}
                  </p>
                ) : (
                  <p className="text-[13px] text-muted">
                    Velg modell for å se pris.
                  </p>
                )}
              </div>
            ) : null}
            <div>
              <Label htmlFor="customerProblem">
                {jobType === "other" ? "Hva er feil?" : "Merknad (valgfritt)"}
              </Label>
              <Textarea
                id="customerProblem"
                name="customerProblem"
                required={step === "job" && jobType === "other"}
                minLength={jobType === "other" ? 8 : undefined}
                className="mt-1"
                placeholder={
                  jobType === "other"
                    ? "Beskriv feilen, når den oppsto, og om telefonen har vært i vann, falt, osv."
                    : "Noe vi bør vite? Fall, væske, tidligere reparasjon…"
                }
              />
            </div>
          </fieldset>

          <fieldset className={`space-y-3 ${step === "delivery" ? "" : "hidden"}`}>
            <legend className="sr-only">Innlevering og utlevering</legend>
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
              <legend className="sr-only">Reparasjonsbetingelser</legend>
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
              <div className="max-h-[360px] space-y-3 overflow-y-auto rounded border border-border bg-white p-3 text-[13px] leading-5">
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

          <div className="flex flex-wrap gap-2 pt-1">
            {step !== "contact" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const index = ORDER_STEPS.findIndex((row) => row.id === step);
                  const previous = ORDER_STEPS[index - 1];
                  if (previous) {
                    setError(null);
                    setStep(previous.id);
                  }
                }}
                disabled={pending}
              >
                Tilbake
              </Button>
            ) : null}
            {step !== "terms" ? (
              <Button type="button" onClick={nextStep} disabled={pending}>
                Fortsett
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? "Oppretter…" : "Signer og opprett serviceordre"}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
