"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DIAGNOSTIC_CHECKS } from "@/lib/diagnostics-catalog";
import { Select } from "@/components/ui/Select";
import { upsertDiagnosticResult } from "@/server/diagnostics";

const RESULTS = [
  { value: "PASS", label: "OK" },
  { value: "FAIL", label: "Feil" },
  { value: "NOT_TESTED", label: "Ikke testet" },
  { value: "NOT_APPLICABLE", label: "N/A" },
  { value: "UNKNOWN", label: "Ukjent" },
] as const;

export function FlipDiagnosticsPanel({
  refurbishmentId,
  results,
}: {
  refurbishmentId: string;
  results: { checkKey: string; result: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const map = new Map(results.map((r) => [r.checkKey, r.result]));

  return (
    <div className="space-y-2">
      {DIAGNOSTIC_CHECKS.map((check) => (
        <div
          key={check.key}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
        >
          <div>
            <p className="text-sm text-foreground">{check.label}</p>
            <p className="text-[11px] text-muted">{check.group}</p>
          </div>
          <Select
            className="w-36"
            disabled={pending}
            value={map.get(check.key) ?? "NOT_TESTED"}
            onChange={(e) => {
              const result = e.target.value as (typeof RESULTS)[number]["value"];
              startTransition(async () => {
                await upsertDiagnosticResult({
                  refurbishmentId,
                  checkKey: check.key,
                  result,
                });
                router.refresh();
              });
            }}
          >
            {RESULTS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  );
}
