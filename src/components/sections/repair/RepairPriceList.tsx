"use client";

import { useMemo, useState } from "react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import {
  PRICE_LIST_DISCLAIMER,
  REPAIR_MODELS,
  REPAIR_SERVICE_IDS,
  REPAIR_SERVICE_LABELS,
  formatListPrice,
} from "@/lib/repair-prices";

export function RepairPriceList() {
  const [modelId, setModelId] = useState(REPAIR_MODELS[0]?.id ?? "");
  const model = useMemo(
    () => REPAIR_MODELS.find((row) => row.id === modelId) ?? REPAIR_MODELS[0],
    [modelId],
  );

  if (!model) return null;

  return (
    <Section id="priser" className="border-t border-border py-20 md:py-28 lg:py-32">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Prisliste
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Fra-priser for kopi (skjerm Soft OLED, batteri kopi premium). Velg
          modell — nyere iPhone koster mer. Original fra annen telefon eller ny
          original koster mer; du får et mer presist tall etter diagnose.
        </p>
      </FadeIn>

      <FadeIn delay={0.06}>
        <label className="mt-10 block max-w-sm text-[13px] text-muted">
          Modell
          <select
            className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-[15px] text-foreground"
            value={model.id}
            onChange={(e) => setModelId(e.target.value)}
          >
            {REPAIR_MODELS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      </FadeIn>

      <FadeIn delay={0.1}>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {REPAIR_SERVICE_IDS.map((id) => (
            <li
              key={id}
              className="flex items-baseline justify-between gap-6 py-3.5 text-[15px]"
            >
              <span className="text-foreground">{REPAIR_SERVICE_LABELS[id]}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatListPrice(id, model.prices[id])}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-muted">
          {PRICE_LIST_DISCLAIMER}
        </p>
      </FadeIn>
    </Section>
  );
}
