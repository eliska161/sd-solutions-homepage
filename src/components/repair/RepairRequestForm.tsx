"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ContactPayload } from "@/lib/contact";
import {
  REPAIR_MODELS,
  REPAIR_SERVICE_IDS,
  REPAIR_SERVICE_LABELS,
  estimateRepairTotal,
  formatNok,
  getRepairModel,
  type RepairServiceId,
} from "@/lib/repair-prices";

const inputClass =
  "w-full rounded-xl border border-border bg-[#111111] px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-white/25";

const selectClass = `${inputClass} appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10`;

const labelClass = "mb-2 block text-[13px] text-muted";

const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

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

function buildRepairMessage(input: {
  modelLabel: string;
  serviceLabels: string[];
  estimatedTotal: number;
  comment: string;
}) {
  const lines = [
    `Modell: ${input.modelLabel}`,
    `Reparasjoner: ${input.serviceLabels.join(", ")}`,
    `Estimert pris: ${formatNok(input.estimatedTotal)}`,
    "Merk: Estimert pris. Endelig pris bekreftes etter inspeksjon. Pristilbud sendes etter forespørsel.",
  ];
  if (input.comment) {
    lines.push("", "Kommentar:", input.comment);
  }
  return lines.join("\n");
}

export function RepairRequestForm() {
  const [modelId, setModelId] = useState("");
  const [services, setServices] = useState<RepairServiceId[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const model = useMemo(() => getRepairModel(modelId), [modelId]);

  const lineItems = useMemo(() => {
    if (!model) return [];
    return services.map((id) => ({
      id,
      label: REPAIR_SERVICE_LABELS[id],
      price: model.prices[id],
    }));
  }, [model, services]);

  const estimatedTotal = useMemo(
    () => estimateRepairTotal(modelId, services),
    [modelId, services],
  );

  const canSubmit = Boolean(model && services.length > 0 && name.trim() && email.trim());

  function toggleService(id: RepairServiceId) {
    setServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function resetForm() {
    setModelId("");
    setServices([]);
    setName("");
    setEmail("");
    setPhone("");
    setComment("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model || services.length === 0) {
      setErrorMessage("Velg modell og minst én reparasjon.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const serviceLabels = services.map((id) => REPAIR_SERVICE_LABELS[id]);
    const message = buildRepairMessage({
      modelLabel: model.label,
      serviceLabels,
      estimatedTotal,
      comment: comment.trim(),
    });

    const payload: ContactPayload = {
      inquiryType: "repair",
      name: name.trim(),
      email: email.trim(),
      message,
      phone: phone.trim() || undefined,
      repair: {
        modelId: model.id,
        modelLabel: model.label,
        serviceIds: services,
        serviceLabels,
        estimatedTotal,
        comment: comment.trim() || undefined,
      },
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
        setErrorMessage(data.error || "Kunne ikke sende forespørselen.");
        return;
      }

      setStatus("success");
      resetForm();
    } catch {
      setStatus("error");
      setErrorMessage("Noe gikk galt. Sjekk tilkoblingen og prøv igjen.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border px-6 py-10 text-center sm:px-8">
        <p className="text-lg font-medium tracking-[-0.02em] text-foreground">
          Forespørselen er sendt.
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Vi går gjennom saken og sender deg et pristilbud. Estimert pris i
          kalkulatoren er ikke et endelig tilbud.
        </p>
        <button
          type="button"
          className="mt-8 text-sm text-muted transition-colors hover:text-foreground"
          onClick={() => setStatus("idle")}
        >
          Ny forespørsel
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <div className="space-y-6">
        <Field label="Modell *">
          <select
            required
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setServices([]);
            }}
            className={selectClass}
            style={{ backgroundImage: selectChevron, colorScheme: "dark" }}
          >
            <option value="">Velg iPhone-modell</option>
            {REPAIR_MODELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <fieldset disabled={!model}>
          <legend className={labelClass}>Hva skal repareres? *</legend>
          <ul className="mt-1 space-y-2">
            {REPAIR_SERVICE_IDS.map((id) => {
              const checked = services.includes(id);
              const price = model?.prices[id];
              return (
                <li key={id}>
                  <label
                    className={[
                      "flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors",
                      !model
                        ? "cursor-not-allowed border-border opacity-50"
                        : checked
                          ? "border-white/25 bg-white/[0.04]"
                          : "border-border hover:border-white/16",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-3 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border bg-[#111111] accent-white"
                        checked={checked}
                        disabled={!model}
                        onChange={() => toggleService(id)}
                      />
                      {REPAIR_SERVICE_LABELS[id]}
                    </span>
                    <span className="shrink-0 text-sm text-muted">
                      {price != null ? formatNok(price) : "—"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="border-t border-border pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[13px] text-muted">Estimert pris</p>
            <p className="text-2xl font-medium tracking-[-0.03em] text-foreground">
              {estimatedTotal > 0 ? formatNok(estimatedTotal) : "—"}
            </p>
          </div>
          {lineItems.length > 1 && (
            <ul className="mt-4 space-y-2">
              {lineItems.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 text-[13px] text-muted"
                >
                  <span>{item.label}</span>
                  <span>{formatNok(item.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            Dette er et estimat. Endelig pris bekreftes etter inspeksjon. Når du
            sender forespørselen, får du et pristilbud tilbake — ikke et
            bindende tilbud herfra.
          </p>
        </div>
      </div>

      <div className="space-y-5 border-t border-border pt-10">
        <p className="text-[13px] font-medium text-foreground/80">Dine opplysninger</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Navn *">
            <input
              required
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="navn@epost.no"
            />
          </Field>
        </div>
        <Field label="Telefon">
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="Valgfritt"
          />
        </Field>
        <Field label="Kommentar">
          <textarea
            name="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="F.eks. sprekk i hjørnet, når du kan levere inn, annet vi bør vite."
          />
        </Field>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-relaxed text-muted">
          Vi svarer med pristilbud på e-post.
        </p>
        <Button type="submit" size="lg" disabled={status === "loading" || !canSubmit}>
          {status === "loading" ? "Sender…" : "Send forespørsel"}
        </Button>
      </div>
    </form>
  );
}
