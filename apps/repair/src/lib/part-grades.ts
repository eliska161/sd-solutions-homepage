import { krToOre } from "@/lib/money";
import { formatNok, matchRepairModel } from "@/lib/repair-prices";

/**
 * Utpriser i NOK (inkl. mva og arbeid).
 * Anker: iPhone 13. Høyere generasjon koster mer, lavere mindre.
 * Ikke live Mobilesentrix — de har ikke åpent API.
 */
export const WHOLESALE_USD_TO_NOK = 10.7;
export const WHOLESALE_MARKUP = 2.15;

export const PUBLIC_JOB_TYPES = ["screen", "battery", "other"] as const;
export type PublicJobType = (typeof PUBLIC_JOB_TYPES)[number];

export const PART_GRADES = ["copy", "oem_pull", "original"] as const;
export type PartGrade = (typeof PART_GRADES)[number];

export const BATTERY_HEALTH_BANDS = ["90_94", "95_98", "99_100"] as const;
export type BatteryHealthBand = (typeof BATTERY_HEALTH_BANDS)[number];

type ScreenBand = {
  copy: number;
  oemPull: number;
  original: number;
};

type BatteryBand = {
  copy: number;
  oemPull90: number;
  oemPull95: number;
  oemPull99: number;
  original: number;
};

/** iPhone 13: kopi Soft OLED 1099, OEM-pull 1499, original 3990. */
const SCREEN_NOK: Record<string, ScreenBand> = {
  "11": { copy: 799, oemPull: 1099, original: 2990 },
  "12": { copy: 949, oemPull: 1299, original: 3490 },
  "13": { copy: 1099, oemPull: 1499, original: 3990 },
  "14": { copy: 1299, oemPull: 1799, original: 4490 },
  "15": { copy: 1499, oemPull: 2099, original: 4990 },
  "16": { copy: 1699, oemPull: 2399, original: 5490 },
  "17": { copy: 1899, oemPull: 2699, original: 5990 },
};

/**
 * iPhone 13: kopi premium 610, OEM-pull 90–94 / 95–98 / 99–100: 699 / 799 / 899,
 * original 1190.
 */
const BATTERY_NOK: Record<string, BatteryBand> = {
  "11": { copy: 490, oemPull90: 549, oemPull95: 649, oemPull99: 749, original: 990 },
  "12": { copy: 550, oemPull90: 629, oemPull95: 729, oemPull99: 829, original: 1090 },
  "13": { copy: 610, oemPull90: 699, oemPull95: 799, oemPull99: 899, original: 1190 },
  "14": { copy: 690, oemPull90: 779, oemPull95: 879, oemPull99: 979, original: 1290 },
  "15": { copy: 770, oemPull90: 859, oemPull95: 959, oemPull99: 1059, original: 1390 },
  "16": { copy: 850, oemPull90: 939, oemPull95: 1039, oemPull99: 1139, original: 1490 },
  "17": { copy: 930, oemPull90: 1019, oemPull95: 1119, oemPull99: 1219, original: 1590 },
};

type ModelVariant = "e" | "base" | "plus" | "air" | "pro" | "pro_max";

const SCREEN_VARIANT: Record<ModelVariant, number> = {
  e: -150,
  base: 0,
  plus: 150,
  air: 200,
  pro: 250,
  pro_max: 400,
};

const BATTERY_VARIANT: Record<ModelVariant, number> = {
  e: -50,
  base: 0,
  plus: 30,
  air: 40,
  pro: 50,
  pro_max: 80,
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
    label: "Kopi (Soft OLED)",
    help: "Samme type og kvalitet, men ikke original Apple-del.",
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

export function partGradeOptionsForJob(jobType: PublicJobType) {
  if (jobType === "battery") {
    return PART_GRADE_OPTIONS.map((row) =>
      row.id === "copy"
        ? {
            ...row,
            label: "Kopi premium",
            help: "Ny kompatibel premium-del, ikke original Apple-del.",
          }
        : row,
    );
  }
  return PART_GRADE_OPTIONS;
}

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

function modelKey(deviceLabel: string): string {
  return (matchRepairModel(deviceLabel)?.id ?? deviceLabel).toLowerCase();
}

function generationFromModel(deviceLabel: string): string {
  const id = modelKey(deviceLabel);
  if (id.includes("17") || id.includes("air")) return "17";
  if (id.includes("16")) return "16";
  if (id.includes("15")) return "15";
  if (id.includes("14")) return "14";
  if (id.includes("13")) return "13";
  if (id.includes("12")) return "12";
  return "11";
}

function variantFromModel(deviceLabel: string): ModelVariant {
  const id = modelKey(deviceLabel).replace(/\s+/g, "-");
  if (id.includes("pro-max") || id.includes("promax")) return "pro_max";
  if (id.includes("pro")) return "pro";
  if (id.includes("plus")) return "plus";
  if (id.includes("air")) return "air";
  if (/(?:^|-)(?:16e|17e)$/.test(id) || /e$/.test(id.replace(/^iphone-/, ""))) {
    if (id.includes("16e") || id.includes("17e")) return "e";
  }
  return "base";
}

export function listCopyPriceKr(
  deviceLabel: string,
  job: "screen" | "battery",
): number {
  const gen = generationFromModel(deviceLabel);
  const variant = variantFromModel(deviceLabel);
  if (job === "screen") {
    const row = SCREEN_NOK[gen] ?? SCREEN_NOK["13"];
    return row.copy + SCREEN_VARIANT[variant];
  }
  const row = BATTERY_NOK[gen] ?? BATTERY_NOK["13"];
  return row.copy + BATTERY_VARIANT[variant];
}

function gradePriceKr(input: {
  deviceLabel: string;
  jobType: Exclude<PublicJobType, "other">;
  partGrade: PartGrade;
  health: BatteryHealthBand | null;
}): number {
  const gen = generationFromModel(input.deviceLabel);
  const variant = variantFromModel(input.deviceLabel);
  if (input.jobType === "screen") {
    const row = SCREEN_NOK[gen] ?? SCREEN_NOK["13"];
    const extra = SCREEN_VARIANT[variant];
    if (input.partGrade === "copy") return row.copy + extra;
    if (input.partGrade === "original") return row.original + extra;
    return row.oemPull + extra;
  }
  const row = BATTERY_NOK[gen] ?? BATTERY_NOK["13"];
  const extra = BATTERY_VARIANT[variant];
  if (input.partGrade === "copy") return row.copy + extra;
  if (input.partGrade === "original") return row.original + extra;
  if (input.health === "95_98") return row.oemPull95 + extra;
  if (input.health === "99_100") return row.oemPull99 + extra;
  return row.oemPull90 + extra;
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
  const health =
    input.jobType === "battery" && input.partGrade === "oem_pull"
      ? input.batteryHealth ?? "90_94"
      : null;
  const priceKr = gradePriceKr({
    deviceLabel: input.deviceLabel,
    jobType: input.jobType,
    partGrade: input.partGrade,
    health,
  });
  const partsKr = priceKr / WHOLESALE_MARKUP;
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
    wholesaleUsd: Math.round((partsKr / WHOLESALE_USD_TO_NOK) * 10) / 10,
    partsCostOre: krToOre(Math.round(partsKr)),
  };
}

export function publicJobChoiceLabel(input: {
  jobType: PublicJobType;
  partGrade?: PartGrade | null;
  batteryHealth?: BatteryHealthBand | null;
}): string {
  if (input.jobType === "other") return JOB_TYPE_LABELS.other;
  const grade = partGradeOptionsForJob(input.jobType).find(
    (row) => row.id === input.partGrade,
  );
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
