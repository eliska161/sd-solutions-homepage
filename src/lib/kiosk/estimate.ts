import {
  estimateRepairTotal,
  formatNok,
  matchRepairModel,
  type RepairServiceId,
} from "@/lib/repair-prices";

const ISSUE_SERVICE: Record<string, RepairServiceId> = {
  Skjerm: "screen",
  Batteri: "battery",
  Ladeport: "charging_port",
  Kamera: "rear_camera",
  "Vil ikke slå på": "diagnostics",
  Annet: "diagnostics",
};

export function kioskIssueEstimate(device: string, issue: string) {
  const service = ISSUE_SERVICE[issue];
  if (!service) return null;
  const model = matchRepairModel(device);
  if (!model) {
    if (service === "diagnostics") {
      return { kr: 399, text: formatNok(399), modelLabel: null as string | null };
    }
    return null;
  }
  const kr = estimateRepairTotal(model.id, [service]);
  if (!kr) return null;
  return { kr, text: formatNok(kr), modelLabel: model.label };
}

export function kioskEstimateDisclaimer() {
  return "Estimat inkl. mva og arbeid. Endelig pris etter inspeksjon.";
}
