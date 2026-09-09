/** All money in the DB is integer øre (1 kr = 100 øre). */

export function krToOre(kr: number): number {
  return Math.round(kr * 100);
}

export function oreToKr(ore: number): number {
  return ore / 100;
}

export function formatNokFromOre(ore: number): string {
  return `${oreToKr(ore).toLocaleString("nb-NO")} kr`;
}

export function grossProfitOre(input: {
  customerPriceOre: number;
  partsCostOre: number;
  otherCostsOre: number;
}): number {
  return input.customerPriceOre - input.partsCostOre - input.otherCostsOre;
}

/** ROI in basis points (8490 = 84.90%). */
export function roiBps(profitOre: number, investmentOre: number): number {
  if (investmentOre <= 0) return 0;
  return Math.round((profitOre / investmentOre) * 10_000);
}

export function formatRoiBps(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export type DealRisk = "GREEN" | "YELLOW" | "RED";

/** Defaults; override via settings in later phases. */
export const DEFAULT_RISK_THRESHOLDS = {
  greenProfitOre: 100_000,
  greenRoiBps: 3000,
  yellowProfitOre: 50_000,
  yellowRoiBps: 2000,
} as const;

export function dealRisk(
  profitOre: number,
  roi: number,
  thresholds = DEFAULT_RISK_THRESHOLDS,
): DealRisk {
  if (profitOre >= thresholds.greenProfitOre && roi >= thresholds.greenRoiBps) {
    return "GREEN";
  }
  if (profitOre >= thresholds.yellowProfitOre || roi >= thresholds.yellowRoiBps) {
    return "YELLOW";
  }
  return "RED";
}
