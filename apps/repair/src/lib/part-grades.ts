import { krToOre } from "@/lib/money";
import {
  formatNok,
  matchRepairModel,
  suggestCustomerPriceKr,
} from "@/lib/repair-prices";

/** NOK per USD used when turning estimated wholesale into utpris. */
export const WHOLESALE_USD_TO_NOK = 10.7;
/** Margin on estimated Mobilesentrix-class wholesale. Not a live feed. */
export const WHOLESALE_MARKUP = 2.15;

export const PUBLIC_JOB_TYPES = ["screen", "battery", "other"] as const;
export type PublicJobType = (typeof PUBLIC_JOB_TYPES)[number];

export const PART_GRADES = ["copy", "oem_pull", "original"] as const;
export type PartGrade = (typeof PART_GRADES)[number];

export const BATTERY_HEALTH_BANDS = ["90_94", "95_98", "99_100"] as const;
export type BatteryHealthBand = (typeof BATTERY_HEALTH_BANDS)[number];

type WholesaleBand = {
  copy: number;
  oemPull: number;
  oemPull95: number;
  oemPull99: number;
  original: number;
};

/** Estimated wholesale USD by generation. Mobilesentrix has no public API. */
const SCREEN_USD: Record<string, WholesaleBand> = {
  "11": { copy: 18, oemPull: 38, oemPull95: 38, oemPull99: 38, original: 85 },
  "12": { copy: 22, oemPull: 45, oemPull95: 45, oemPull99: 45, original: 95 },
  "13": { copy: 28, oemPull: 58, oemPull95: 58, oemPull99: 58, original: 115 },
  "14": { copy: 34, oemPull: 70, oemPull95: 70, oemPull99: 70, original: 140 },
  "15": { copy: 40, oemPull: 85, oemPull95: 85, oemPull99: 85, original: 170 },
  "16": { copy: 48, oemPull: 100, oemPull95: 100, oemPull99: 100, original: 200 },
  "17": { copy: 55, oemPull: 115, oemPull95: 115, oemPull99: 115, original: 230 },
};

const BATTERY_USD: Record<string, WholesaleBand> = {
  "11": { copy: 8, oemPull: 14, oemPull95: 18, oemPull99: 24, original: 32 },
  "12": { copy: 9, oemPull: 15, oemPull95: 20, oemPull99: 26, original: 35 },
  "13": { copy: 10, oemPull: 16, oemPull95: 22, oemPull99: 28, original: 38 },
  "14": { copy: 11, oemPull: 18, oemPull95: 24, oemPull99: 32, original: 42 },
  "15": { copy: 12, oemPull: 20, oemPull95: 26, oemPull99: 35, original: 48 },
  "16": { copy: 14, oemPull: 22, oemPull95: 30, oemPull99: 40, original: 55 },
  "17": { copy: 16, oemPull: 25, oemPull95: 34, oemPull99: 45, original: 62 },
};

export const JOB_TYPE_LABELS: Record<PublicJobType, string> = {
  screen: "Skjermbytte",
  battery: "Batteribytte",
  other: "Annet",
};

export const PART_GRADE_OPTIONS: {
  id: PartGrade;
  label: string;
  help: string;
}[] = [
  {
    id: "copy",
    label: "Kopi (ny kompatibel)",
    help: "Samme type og funksjon, men ikke original Apple-del.",
  },
  {
    id: "oem_pull",
    label: "Original fra annen telefon",
    help: "Original del tatt ut av en annen iPhone (OEM-pull).",
  },
  {
    id: "original",
    label: "Ny original",
    help: "Ny original del (service pack / original).",
  },
];

export const BATTERY_HEALTH_OPTIONS: {
  id: BatteryHealthBand;
  label: string;
}[] = [
  { id: "90_94", label: "90–94 % batterihelse" },
  { id: "95_98", label: "95–98 % batterihelse" },
  { id: "99_100", label: "99–100 % batterihelse" },
];

export function isPublicJobType(value: string): value is PublicJobType {
  return (PUBLIC_JOB_TYPES as readonly string[]).includes(value);
}

export function isPartGrade(value: string): value is PartGrade {
  return (PART_GRADES as readonly string[]).includes(value);
}

export function isBatteryHealthBand(value: string): value is BatteryHealthBand {
  return (BATTERY_HEALTH_BANDS as readonly string[]).includes(value);
}

function generationFromModel(deviceLabel: string): string {
  const model = matchRepairModel(deviceLabel);
  const id = model?.id ?? deviceLabel.toLowerCase();
  if (id.includes("17") || id.includes("air")) return "17";
  if (id.includes("16")) return "16";
  if (id.includes("15")) return "15";
  if (id.includes("14")) return "14";
  if (id.includes("13")) return "13";
  if (id.includes("12")) return "12";
  return "11";
}

function wholesaleUsd(
  job: PublicJobType,
  grade: PartGrade,
  health: BatteryHealthBand | null,
  gen: string,
): number {
  const table = job === "battery" ? BATTERY_USD : SCREEN_USD;
  const row = table[gen] ?? table["13"];
  if (grade === "copy") return row.copy;
  if (grade === "original") return row.original;
  if (job === "battery") {
    if (health === "95_98") return row.oemPull95;
    if (health === "99_100") return row.oemPull99;
    return row.oemPull;
  }
  return row.oemPull;
}

function extraKr(copyUsd: number, chosenUsd: number) {
  const copyPart = suggestCustomerPriceKr({
    wholesaleUsd: copyUsd,
    usdToNok: WHOLESALE_USD_TO_NOK,
    laborKr: 0,
    markup: WHOLESALE_MARKUP,
  });
  const chosenPart = suggestCustomerPriceKr({
    wholesaleUsd: chosenUsd,
    usdToNok: WHOLESALE_USD_TO_NOK,
    laborKr: 0,
    markup: WHOLESALE_MARKUP,
  });
  return Math.max(0, chosenPart - copyPart);
}

export type PartQuote = {
  jobType: PublicJobType;
  partGrade: PartGrade;
  batteryHealth: BatteryHealthBand | null;
  label: string;
  priceKr: number;
  priceLabel: string;
  wholesaleUsd: number;
  partsCostOre: number;
};

export function quotePublicPart(input: {
  deviceLabel: string;
  jobType: PublicJobType;
  partGrade: PartGrade;
  batteryHealth?: BatteryHealthBand | null;
}): PartQuote | null {
  if (input.jobType === "other") return null;
  const model = matchRepairModel(input.deviceLabel);
  const fromKr =
    input.jobType === "screen"
      ? (model?.prices.screen ?? 1499)
      : (model?.prices.battery ?? 799);
  const gen = generationFromModel(input.deviceLabel);
  const health =
    input.jobType === "battery" && input.partGrade === "oem_pull"
      ? input.batteryHealth ?? "90_94"
      : null;
  const table = input.jobType === "battery" ? BATTERY_USD : SCREEN_USD;
  const row = table[gen] ?? table["13"];
  const usd = wholesaleUsd(input.jobType, input.partGrade, health, gen);
  const priceKr = fromKr + extraKr(row.copy, usd);
  const label = publicJobChoiceLabel({
    jobType: input.jobType,
    partGrade: input.partGrade,
    batteryHealth: health,
  });
  return {
    jobType: input.jobType,
    partGrade: input.partGrade,
    batteryHealth: health,
    label,
    priceKr,
    priceLabel: formatNok(priceKr),
    wholesaleUsd: usd,
    partsCostOre: Math.round(usd * WHOLESALE_USD_TO_NOK * 100),
  };
}

export function publicJobChoiceLabel(input: {
  jobType: PublicJobType;
  partGrade?: PartGrade | null;
  batteryHealth?: BatteryHealthBand | null;
}): string {
  if (input.jobType === "other") return JOB_TYPE_LABELS.other;
  const grade = PART_GRADE_OPTIONS.find((row) => row.id === input.partGrade);
  const health =
    input.jobType === "battery" && input.partGrade === "oem_pull"
      ? BATTERY_HEALTH_OPTIONS.find((row) => row.id === input.batteryHealth)?.label
      : null;
  return [JOB_TYPE_LABELS[input.jobType], grade?.label, health]
    .filter(Boolean)
    .join(" · ");
}

export function describePublicJob(input: {
  jobType: PublicJobType;
  partGrade?: PartGrade | null;
  batteryHealth?: BatteryHealthBand | null;
  comment?: string;
}): string {
  if (input.jobType === "other") {
    return (input.comment || "").trim();
  }
  const head = publicJobChoiceLabel(input);
  const comment = (input.comment || "").trim();
  return comment ? `${head}. ${comment}` : head;
}
