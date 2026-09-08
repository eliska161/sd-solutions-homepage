/**
 * Customer-facing repair prices (NOK).
 * Includes parts and labor. Edit this file to update site prices.
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
      screen: 1299,
      battery: 899,
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
      screen: 1499,
      battery: 899,
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
      screen: 1599,
      battery: 899,
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
      screen: 1499,
      battery: 999,
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
      screen: 1699,
      battery: 999,
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
      screen: 1799,
      battery: 999,
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
      screen: 1699,
      battery: 1099,
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
      screen: 2199,
      battery: 1099,
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
      screen: 2299,
      battery: 1099,
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
      screen: 1999,
      battery: 1199,
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
      screen: 2499,
      battery: 1199,
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
      screen: 2699,
      battery: 1199,
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
      screen: 2199,
      battery: 1299,
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
      screen: 2399,
      battery: 1299,
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
      screen: 2599,
      battery: 1299,
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
      screen: 2799,
      battery: 1299,
      charging_port: 1599,
      rear_camera: 2099,
      front_camera: 1399,
      speaker: 999,
      microphone: 999,
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
