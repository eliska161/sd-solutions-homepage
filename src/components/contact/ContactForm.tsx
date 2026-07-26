"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  INQUIRY_TYPES,
  type ContactPayload,
  type InquiryTypeId,
} from "@/lib/contact";

const inputClass =
  "w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-white/25";

const labelClass = "mb-2 block text-[13px] text-muted";

type FormState = {
  inquiryType: InquiryTypeId;
  name: string;
  email: string;
  organization: string;
  message: string;
  clubName: string;
  mapVolume: string;
  currentStorage: string;
  desiredStart: string;
  timingComputers: string;
  usesEventor: string;
  nextEvent: string;
  timeline: string;
  budget: string;
};

const initialState: FormState = {
  inquiryType: "kartarkiv",
  name: "",
  email: "",
  organization: "",
  message: "",
  clubName: "",
  mapVolume: "",
  currentStorage: "",
  desiredStart: "",
  timingComputers: "",
  usesEventor: "",
  nextEvent: "",
  timeline: "",
  budget: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const selected = useMemo(
    () => INQUIRY_TYPES.find((t) => t.id === form.inquiryType),
    [form.inquiryType],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const payload: ContactPayload = {
      inquiryType: form.inquiryType,
      name: form.name.trim(),
      email: form.email.trim(),
      organization: form.organization.trim() || undefined,
      message: form.message.trim(),
      clubName: form.clubName.trim() || undefined,
      mapVolume: form.mapVolume.trim() || undefined,
      currentStorage: form.currentStorage.trim() || undefined,
      desiredStart: form.desiredStart.trim() || undefined,
      timingComputers: form.timingComputers.trim() || undefined,
      usesEventor: form.usesEventor || undefined,
      nextEvent: form.nextEvent.trim() || undefined,
      timeline: form.timeline.trim() || undefined,
      budget: form.budget || undefined,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Kunne ikke sende henvendelsen.");
        return;
      }

      setStatus("success");
      setForm({ ...initialState, inquiryType: form.inquiryType });
    } catch {
      setStatus("error");
      setErrorMessage("Noe gikk galt. Sjekk tilkoblingen og prøv igjen.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border px-6 py-10 text-center sm:px-8">
        <p className="text-lg font-medium tracking-[-0.02em] text-foreground">
          Takk for henvendelsen.
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Vi har mottatt meldingen din og tar kontakt så snart vi kan.
        </p>
        <button
          type="button"
          className="mt-8 text-sm text-muted transition-colors hover:text-foreground"
          onClick={() => setStatus("idle")}
        >
          Send en ny henvendelse
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset>
        <legend className={labelClass}>Hva gjelder henvendelsen?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INQUIRY_TYPES.map((type) => {
            const active = form.inquiryType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => update("inquiryType", type.id)}
                className={[
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-white/25 bg-white/[0.04]"
                    : "border-border hover:border-white/16",
                ].join(" ")}
              >
                <span className="block text-sm text-foreground">{type.label}</span>
                <span className="mt-1 block text-[12px] leading-snug text-muted">
                  {type.description}
                </span>
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="mt-3 text-[13px] text-muted/80">
            Fyll ut feltene under, så får vi riktig grunnlag for å hjelpe deg.
          </p>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Navn *">
          <input
            required
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="Ditt navn"
          />
        </Field>
        <Field label="E-post *">
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
            placeholder="navn@klubb.no"
          />
        </Field>
      </div>

      <Field label="Organisasjon / klubb">
        <input
          name="organization"
          value={form.organization}
          onChange={(e) => update("organization", e.target.value)}
          className={inputClass}
          placeholder="Valgfritt"
        />
      </Field>

      {form.inquiryType === "kartarkiv" && (
        <div className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
          <p className="text-[13px] font-medium text-foreground/80">
            Om Kartarkiv-behovet
          </p>
          <Field label="Klubbnavn">
            <input
              value={form.clubName}
              onChange={(e) => update("clubName", e.target.value)}
              className={inputClass}
              placeholder="F.eks. Eiker OK"
            />
          </Field>
          <Field label="Omtrentlig kartmengde / omfang">
            <input
              value={form.mapVolume}
              onChange={(e) => update("mapVolume", e.target.value)}
              className={inputClass}
              placeholder="F.eks. 80 kart, flere klubber"
            />
          </Field>
          <Field label="Hvordan lagrer dere kart i dag?">
            <input
              value={form.currentStorage}
              onChange={(e) => update("currentStorage", e.target.value)}
              className={inputClass}
              placeholder="F.eks. Dropbox, lokal disk, e-post"
            />
          </Field>
          <Field label="Ønsket oppstart">
            <input
              value={form.desiredStart}
              onChange={(e) => update("desiredStart", e.target.value)}
              className={inputClass}
              placeholder="F.eks. før sesongstart"
            />
          </Field>
        </div>
      )}

      {form.inquiryType === "eok-kiosk" && (
        <div className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
          <p className="text-[13px] font-medium text-foreground/80">
            Om EOK Kiosk
          </p>
          <Field label="Klubbnavn">
            <input
              value={form.clubName}
              onChange={(e) => update("clubName", e.target.value)}
              className={inputClass}
              placeholder="F.eks. Eiker OK"
            />
          </Field>
          <Field label="Antall tidtakingsmaskiner">
            <input
              value={form.timingComputers}
              onChange={(e) => update("timingComputers", e.target.value)}
              className={inputClass}
              placeholder="F.eks. 2"
            />
          </Field>
          <Field label="Bruker dere Eventor i dag?">
            <select
              value={form.usesEventor}
              onChange={(e) => update("usesEventor", e.target.value)}
              className={inputClass}
            >
              <option value="">Velg</option>
              <option value="Ja">Ja</option>
              <option value="Nei">Nei</option>
              <option value="Usikker">Usikker</option>
            </select>
          </Field>
          <Field label="Neste arrangement / tidspunkt">
            <input
              value={form.nextEvent}
              onChange={(e) => update("nextEvent", e.target.value)}
              className={inputClass}
              placeholder="F.eks. klubbløp i april"
            />
          </Field>
        </div>
      )}

      {form.inquiryType === "custom" && (
        <div className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
          <p className="text-[13px] font-medium text-foreground/80">
            Om prosjektet
          </p>
          <Field label="Ønsket tidslinje">
            <input
              value={form.timeline}
              onChange={(e) => update("timeline", e.target.value)}
              className={inputClass}
              placeholder="F.eks. Q3 2026, eller fleksibel"
            />
          </Field>
          <Field label="Omtrentlig budsjett">
            <select
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
              className={inputClass}
            >
              <option value="">Velg (valgfritt)</option>
              <option value="Under 50 000 kr">Under 50 000 kr</option>
              <option value="50–150 000 kr">50–150 000 kr</option>
              <option value="150–500 000 kr">150–500 000 kr</option>
              <option value="Over 500 000 kr">Over 500 000 kr</option>
              <option value="Usikker / ønsker estimat">
                Usikker / ønsker estimat
              </option>
            </select>
          </Field>
        </div>
      )}

      <Field
        label={
          form.inquiryType === "custom"
            ? "Beskriv prosjektet *"
            : form.inquiryType === "general"
              ? "Melding *"
              : "Hva trenger du hjelp til? *"
        }
      >
        <textarea
          required
          name="message"
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className={`${inputClass} resize-y min-h-[120px]`}
          placeholder={
            form.inquiryType === "kartarkiv"
              ? "Fortell kort om klubben og hva dere ønsker å løse med Kartarkiv."
              : form.inquiryType === "eok-kiosk"
                ? "Beskriv oppsett, utfordringer på løpsdag, eller hva dere ønsker fra kiosken."
                : form.inquiryType === "custom"
                  ? "Beskriv problemet, brukerne og hva en god løsning ville gjort for dere."
                  : "Skriv kort hva henvendelsen gjelder."
          }
        />
      </Field>

      {status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-relaxed text-muted">
          Vi svarer på e-postadressen du oppgir.
        </p>
        <Button type="submit" size="lg" disabled={status === "loading"}>
          {status === "loading" ? "Sender…" : "Send henvendelse"}
        </Button>
      </div>
    </form>
  );
}
