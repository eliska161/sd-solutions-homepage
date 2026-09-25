/**
 * Kundevendt prisliste (NOK, inkl. mva og arbeid).
 * Skjerm og batteri er «fra»-priser for kopi (iPhone 13-anker:
 * Soft OLED 1099 / kopi premium 549). Høyere modell koster mer.
 *
 * Mobilesentrix har ikke et åpent API. Innlogget grossistpriser derfra
 * kan du lime inn som USD og bruke suggestCustomerPriceKr() for å få et
 * forslag; publisert liste redigeres her.
 */

export const REPAIR_SERVICE_IDS = [
  "screen",
  "battery",
  "charging_port",
  "rear_camera",
  "front_camera",
  "speaker",
  "microphone",
  "diagnostics",
] as const;

export type RepairServiceId = (typeof REPAIR_SERVICE_IDS)[number];

export const REPAIR_SERVICE_LABELS: Record<RepairServiceId, string> = {
  screen: "Skjermbytte",
  battery: "Batteribytte",
  charging_port: "Ladeport",
  rear_camera: "Bakamera",
  front_camera: "Frontkamera",
  speaker: "Høyttaler",
  microphone: "Mikrofon",
  diagnostics: "Diagnostikk",
};

type ServicePrices = Record<RepairServiceId, number>;

export type RepairModel = {
  id: string;
  label: string;
  prices: ServicePrices;
};

export const REPAIR_MODELS: RepairModel[] = [
  {
    id: "iphone-11",
    label: "iPhone 11",
    prices: {
      screen: 799,
      battery: 440,
      charging_port: 999,
      rear_camera: 1199,
      front_camera: 999,
      speaker: 799,
      microphone: 799,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-11-pro",
    label: "iPhone 11 Pro",
    prices: {
      screen: 1049,
      battery: 490,
      charging_port: 1099,
      rear_camera: 1399,
      front_camera: 999,
      speaker: 799,
      microphone: 799,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-11-pro-max",
    label: "iPhone 11 Pro Max",
    prices: {
      screen: 1199,
      battery: 520,
      charging_port: 1099,
      rear_camera: 1399,
      front_camera: 999,
      speaker: 799,
      microphone: 799,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-12",
    label: "iPhone 12",
    prices: {
      screen: 949,
      battery: 490,
      charging_port: 1099,
      rear_camera: 1399,
      front_camera: 1099,
      speaker: 899,
      microphone: 899,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-12-pro",
    label: "iPhone 12 Pro",
    prices: {
      screen: 1199,
      battery: 540,
      charging_port: 1199,
      rear_camera: 1499,
      front_camera: 1099,
      speaker: 899,
      microphone: 899,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-12-pro-max",
    label: "iPhone 12 Pro Max",
    prices: {
      screen: 1349,
      battery: 570,
      charging_port: 1199,
      rear_camera: 1599,
      front_camera: 1099,
      speaker: 899,
      microphone: 899,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-13",
    label: "iPhone 13",
    prices: {
      screen: 1099,
      battery: 549,
      charging_port: 1199,
      rear_camera: 1499,
      front_camera: 1199,
      speaker: 899,
      microphone: 899,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-13-pro",
    label: "iPhone 13 Pro",
    prices: {
      screen: 1349,
      battery: 599,
      charging_port: 1299,
      rear_camera: 1699,
      front_camera: 1199,
      speaker: 899,
      microphone: 899,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-13-pro-max",
    label: "iPhone 13 Pro Max",
    prices: {
      screen: 1499,
      battery: 629,
      charging_port: 1299,
      rear_camera: 1799,
      front_camera: 1199,
      speaker: 899,
      microphone: 899,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-14",
    label: "iPhone 14",
    prices: {
      screen: 1299,
      battery: 620,
      charging_port: 1399,
      rear_camera: 1699,
      front_camera: 1299,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-14-pro",
    label: "iPhone 14 Pro",
    prices: {
      screen: 1549,
      battery: 670,
      charging_port: 1499,
      rear_camera: 1999,
      front_camera: 1299,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-14-pro-max",
    label: "iPhone 14 Pro Max",
    prices: {
      screen: 1699,
      battery: 700,
      charging_port: 1499,
      rear_camera: 2099,
      front_camera: 1299,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-15",
    label: "iPhone 15",
    prices: {
      screen: 1499,
      battery: 690,
      charging_port: 1499,
      rear_camera: 1799,
      front_camera: 1399,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-15-plus",
    label: "iPhone 15 Plus",
    prices: {
      screen: 1649,
      battery: 720,
      charging_port: 1499,
      rear_camera: 1899,
      front_camera: 1399,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-15-pro",
    label: "iPhone 15 Pro",
    prices: {
      screen: 1749,
      battery: 740,
      charging_port: 1599,
      rear_camera: 1999,
      front_camera: 1399,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-15-pro-max",
    label: "iPhone 15 Pro Max",
    prices: {
      screen: 1899,
      battery: 770,
      charging_port: 1599,
      rear_camera: 2099,
      front_camera: 1399,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-16e",
    label: "iPhone 16e",
    prices: {
      screen: 1549,
      battery: 710,
      charging_port: 1399,
      rear_camera: 1699,
      front_camera: 1299,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-16",
    label: "iPhone 16",
    prices: {
      screen: 1699,
      battery: 760,
      charging_port: 1599,
      rear_camera: 1899,
      front_camera: 1499,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-16-plus",
    label: "iPhone 16 Plus",
    prices: {
      screen: 1849,
      battery: 790,
      charging_port: 1599,
      rear_camera: 1999,
      front_camera: 1499,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-16-pro",
    label: "iPhone 16 Pro",
    prices: {
      screen: 1949,
      battery: 810,
      charging_port: 1699,
      rear_camera: 2199,
      front_camera: 1499,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-16-pro-max",
    label: "iPhone 16 Pro Max",
    prices: {
      screen: 2099,
      battery: 840,
      charging_port: 1699,
      rear_camera: 2299,
      front_camera: 1499,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-17e",
    label: "iPhone 17e",
    prices: {
      screen: 1749,
      battery: 780,
      charging_port: 1499,
      rear_camera: 1799,
      front_camera: 1399,
      speaker: 999,
      microphone: 999,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-17",
    label: "iPhone 17",
    prices: {
      screen: 1899,
      battery: 830,
      charging_port: 1699,
      rear_camera: 2099,
      front_camera: 1599,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-air",
    label: "iPhone Air",
    prices: {
      screen: 2099,
      battery: 870,
      charging_port: 1699,
      rear_camera: 2199,
      front_camera: 1599,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-17-pro",
    label: "iPhone 17 Pro",
    prices: {
      screen: 2149,
      battery: 880,
      charging_port: 1799,
      rear_camera: 2399,
      front_camera: 1599,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
  {
    id: "iphone-17-pro-max",
    label: "iPhone 17 Pro Max",
    prices: {
      screen: 2299,
      battery: 910,
      charging_port: 1799,
      rear_camera: 2499,
      front_camera: 1599,
      speaker: 1099,
      microphone: 1099,
      diagnostics: 399,
    },
  },
];

export function getRepairModel(id: string): RepairModel | undefined {
  return REPAIR_MODELS.find((model) => model.id === id);
}

export function isRepairServiceId(value: string): value is RepairServiceId {
  return (REPAIR_SERVICE_IDS as readonly string[]).includes(value);
}

/** Sum selected repair prices. No automatic discount. */
export function estimateRepairTotal(
  modelId: string,
  serviceIds: RepairServiceId[],
): number {
  const model = getRepairModel(modelId);
  if (!model || serviceIds.length === 0) return 0;
  return serviceIds.reduce((sum, id) => sum + model.prices[id], 0);
}

export function formatNok(amount: number): string {
  return `${amount.toLocaleString("nb-NO")} kr`;
}

export function formatFromNok(amount: number): string {
  return `fra ${formatNok(amount)}`;
}

export function formatListPrice(serviceId: RepairServiceId, amount: number): string {
  if (serviceId === "diagnostics") return formatNok(amount);
  return formatFromNok(amount);
}

export const PRICE_LIST_DISCLAIMER =
  "Fra-priser for billigste delvalg: skjerm Kopi (Soft OLED), batteri Kopi premium. iPhone 13 er ankeret; nyere modeller koster mer. Original fra annen telefon eller ny original koster mer. Alle beløp inkl. mva og arbeid. Endelig pris etter det vi finner. Diagnose 399 kr hvis vi ikke finner feil, eller hvis du takker nei etter diagnose. Utført reparasjon: diagnosen inngår.";

/** Match «Apple iPhone 14 128 GB» to a row in the list. Longer names first. */
export function matchRepairModel(deviceLabel: string): RepairModel | undefined {
  const hay = ` ${deviceLabel.toLowerCase().replace(/\s+/g, " ")} `;
  const ranked = [...REPAIR_MODELS].sort(
    (a, b) => b.label.length - a.label.length,
  );
  return ranked.find((model) => {
    const needle = model.label.toLowerCase();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i").test(hay);
  });
}

export function estimateLinesForModel(model: RepairModel): {
  label: string;
  value: string;
}[] {
  return REPAIR_SERVICE_IDS.map((id) => ({
    label: REPAIR_SERVICE_LABELS[id],
    value: formatListPrice(id, model.prices[id]),
  }));
}

/**
 * Forslag til utpris fra innkjøp (f.eks. Mobilesentrix i USD).
 * Rundes til nærmeste 50 kr. Brukes manuelt — ikke live-oppslag.
 */
export function suggestCustomerPriceKr(input: {
  wholesaleUsd: number;
  usdToNok: number;
  laborKr: number;
  markup: number;
}): number {
  const partKr = input.wholesaleUsd * input.usdToNok * input.markup;
  const raw = partKr + input.laborKr;
  return Math.max(0, Math.round(raw / 50) * 50);
}
