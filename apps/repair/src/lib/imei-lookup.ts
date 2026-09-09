import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

export type TacHit = {
  tac: string;
  brand: string;
  specs: string;
  model: string;
  aNumber: string | null;
  year: string | null;
};

export type IosSupplement = {
  generation: string | null;
  identifier: string | null;
  colors: string[];
  storages: string[];
  aNumbers: string[];
  models: string[];
};

export type ImeiCatalogResult = {
  imei: string;
  tac: string;
  tacHit: TacHit | null;
  ios: IosSupplement | null;
  brand: string | null;
  model: string | null;
  colorOptions: string[];
  storageOptions: string[];
  sourceNote: string;
};

type TacIndex = Record<string, [string, string]>;

type AppleGenerationOptions = {
  identifier: string | null;
  colors: string[];
  storages: string[];
};

type AppleOptionsFile = {
  generations: Record<string, AppleGenerationOptions>;
};

let cachedIndex: TacIndex | null = null;
let cachedAppleOptions: AppleOptionsFile | null = null;

/** Common Apple fallbacks when generation match is incomplete. */
const FALLBACK_IPHONE_STORAGE = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];
const FALLBACK_IPAD_STORAGE = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB"];
const FALLBACK_IPHONE_COLORS = [
  "Black",
  "White",
  "Blue",
  "Green",
  "Pink",
  "Yellow",
  "Purple",
  "Midnight",
  "Starlight",
  "Product Red",
  "Space Black",
  "Space Gray",
  "Silver",
  "Gold",
  "Natural Titanium",
  "Blue Titanium",
  "White Titanium",
  "Black Titanium",
  "Desert Titanium",
];

function resolveDataPath(filename: string) {
  const candidates = [
    path.join(process.cwd(), "data", filename),
    path.join(process.cwd(), "apps/repair/data", filename),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

function loadTacIndex(): TacIndex {
  if (cachedIndex) return cachedIndex;
  const file = resolveDataPath("tac-index.json.gz");
  const buf = readFileSync(file);
  const json = gunzipSync(buf).toString("utf8");
  cachedIndex = JSON.parse(json) as TacIndex;
  return cachedIndex;
}

function loadAppleOptions(): AppleOptionsFile {
  if (cachedAppleOptions) return cachedAppleOptions;
  const file = resolveDataPath("apple-device-options.json");
  cachedAppleOptions = JSON.parse(
    readFileSync(file, "utf8"),
  ) as AppleOptionsFile;
  return cachedAppleOptions;
}

/** Digits only; IMEI is typically 15 digits (14 + check). */
export function normalizeImei(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function extractTac(imeiDigits: string): string | null {
  if (imeiDigits.length < 8) return null;
  return imeiDigits.slice(0, 8);
}

function titleCaseBrand(brand: string): string {
  const upper = brand.trim().toUpperCase();
  const known: Record<string, string> = {
    APPLE: "Apple",
    SAMSUNG: "Samsung",
    XIAOMI: "Xiaomi",
    HUAWEI: "Huawei",
    GOOGLE: "Google",
    ONEPLUS: "OnePlus",
    NOTHING: "Nothing",
    MOTOROLA: "Motorola",
    NOKIA: "Nokia",
    SONY: "Sony",
    OPPO: "OPPO",
    VIVO: "vivo",
    REALME: "realme",
    HONOR: "Honor",
    ASUS: "ASUS",
    LG: "LG",
    HTC: "HTC",
    TCL: "TCL",
    TECNO: "TECNO",
    REDMI: "Redmi",
  };
  if (known[upper]) return known[upper];
  return brand
    .toLowerCase()
    .split(/([\s_-]+)/)
    .map((p) =>
      /^[\s_-]+$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join("");
}

function parseSpecs(brand: string, specs: string): Omit<TacHit, "tac" | "brand" | "specs"> {
  const parts = specs
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let aNumber: string | null = null;
  let year: string | null = null;
  const nameParts: string[] = [];

  for (const part of parts) {
    if (/^A\d{4}[A-Z]?$/i.test(part)) {
      aNumber = part.toUpperCase();
      continue;
    }
    if (/^N\/A$/i.test(part)) continue;
    if (/^(19|20)\d{2}$/.test(part)) {
      year = part;
      continue;
    }
    nameParts.push(part);
  }

  const preferred =
    nameParts.find(
      (p) => /Apple\s+(iPhone|iPad)/i.test(p) && p !== p.toUpperCase(),
    ) ??
    nameParts.find(
      (p) => /iPhone|iPad|Galaxy|Pixel/i.test(p) && p !== p.toUpperCase(),
    ) ??
    nameParts.find((p) => /iPhone|iPad|Galaxy|Pixel/i.test(p)) ??
    nameParts.find((p) => {
      const stripped = p.replace(new RegExp(`^${brand}\\s+`, "i"), "").trim();
      return /\s/.test(stripped) || stripped.length > 12;
    }) ??
    nameParts[0] ??
    specs;

  let model = preferred
    .replace(new RegExp(`^${brand}\\s+`, "i"), "")
    .replace(/^APPLE\s+/i, "")
    .replace(/^IPHONE\s+/i, "iPhone ")
    .replace(/^IPAD\s+/i, "iPad ")
    .replace(/\s+/g, " ")
    .trim();

  if (model === model.toUpperCase() && /[A-Z]/.test(model)) {
    if (/IPHONE|IPAD/.test(model)) {
      model = model
        .toLowerCase()
        .replace(/^iphone/, "iPhone")
        .replace(/^ipad/, "iPad")
        .replace(/\bpro\b/g, "Pro")
        .replace(/\bmax\b/g, "Max")
        .replace(/\bplus\b/g, "Plus")
        .replace(/\bmini\b/g, "mini")
        .replace(/\bair\b/g, "Air")
        .replace(/\bse\b/g, "SE");
    } else {
      model = model
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  return { model, aNumber, year };
}

export function lookupTac(tac: string): TacHit | null {
  const index = loadTacIndex();
  const row = index[tac];
  if (!row) return null;
  const brandRaw = row[0];
  const specs = row[1] || "";
  const brand = titleCaseBrand(brandRaw);
  const parsed = parseSpecs(brandRaw, specs);
  return { tac, brand, specs, ...parsed };
}

function uniq(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const key = v.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/^apple\s+/, "")
    .replace(/^(iphone|ipad)(\d)/, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function deviceSeries(s: string): { kind: string; num: string } | null {
  const m = normalizeKey(s).match(/\b(iphone|ipad)\s+(\d+)\b/);
  if (!m) return null;
  return { kind: m[1]!, num: m[2]! };
}

function scoreGeneration(query: string, generation: string): number {
  const q = normalizeKey(query);
  const g = normalizeKey(generation);
  if (!q || !g) return -1;

  const qs = deviceSeries(q);
  const gs = deviceSeries(g);
  if (qs && gs) {
    if (qs.kind !== gs.kind) return -1;
    if (qs.num !== gs.num) return -1;
  }

  if (q === g) return 100;

  // Prefer exact-ish containment only within same series
  if (g.startsWith(q + " ")) return 40;
  if (q.startsWith(g + " ")) return 35;
  if (g.includes(q)) return 25;
  if (q.includes(g)) return 20;

  const qTokens = new Set(q.split(" "));
  const gTokens = new Set(g.split(" "));
  let overlap = 0;
  for (const t of qTokens) if (gTokens.has(t)) overlap++;
  let score = overlap * 8;
  for (const flag of ["pro", "max", "plus", "mini", "air"]) {
    if (qTokens.has(flag) === gTokens.has(flag)) score += 3;
    else score -= 8;
  }
  return score;
}

function findAppleGeneration(model: string): {
  generation: string;
  options: AppleGenerationOptions;
} | null {
  let file: AppleOptionsFile;
  try {
    file = loadAppleOptions();
  } catch {
    return null;
  }

  let best: { generation: string; score: number } | null = null;
  for (const generation of Object.keys(file.generations)) {
    const score = scoreGeneration(model, generation);
    if (!best || score > best.score) best = { generation, score };
  }
  // Require a confident match (same series + decent score)
  if (!best || best.score < 40) return null;
  return {
    generation: best.generation,
    options: file.generations[best.generation]!,
  };
}

export function supplementWithAppleOptions(hit: TacHit): IosSupplement | null {
  if (hit.brand.toLowerCase() !== "apple") return null;

  const isIpad = /ipad/i.test(hit.model);
  const match = findAppleGeneration(hit.model);
  if (!match) {
    return {
      generation: hit.model,
      identifier: null,
      colors: isIpad ? [] : FALLBACK_IPHONE_COLORS,
      storages: isIpad ? FALLBACK_IPAD_STORAGE : FALLBACK_IPHONE_STORAGE,
      aNumbers: hit.aNumber ? [hit.aNumber] : [],
      models: [],
    };
  }

  const colors =
    match.options.colors.length > 0
      ? match.options.colors
      : isIpad || /ipad/i.test(match.generation)
        ? []
        : FALLBACK_IPHONE_COLORS;

  return {
    generation: match.generation,
    identifier: match.options.identifier,
    colors,
    storages:
      match.options.storages.length > 0
        ? match.options.storages
        : /ipad/i.test(match.generation)
          ? FALLBACK_IPAD_STORAGE
          : FALLBACK_IPHONE_STORAGE,
    aNumbers: hit.aNumber ? [hit.aNumber] : [],
    models: [],
  };
}

/** @deprecated use supplementWithAppleOptions */
export function supplementWithIosDeviceList(hit: TacHit): IosSupplement | null {
  return supplementWithAppleOptions(hit);
}

/**
 * Lookup device marketing info from IMEI via local TAC DB (+ Apple options JSON).
 */
export function lookupImeiCatalog(imeiRaw: string): ImeiCatalogResult | null {
  const imei = normalizeImei(imeiRaw);
  if (imei.length < 8) return null;
  const tac = extractTac(imei)!;
  let tacHit: TacHit | null = null;
  try {
    tacHit = lookupTac(tac);
  } catch (err) {
    return {
      imei,
      tac,
      tacHit: null,
      ios: null,
      brand: null,
      model: null,
      colorOptions: [],
      storageOptions: [],
      sourceNote: `TAC-database mangler på serveren (${err instanceof Error ? err.message : "ukjent feil"}).`,
    };
  }

  if (!tacHit) {
    return {
      imei,
      tac,
      tacHit: null,
      ios: null,
      brand: null,
      model: null,
      colorOptions: [],
      storageOptions: [],
      sourceNote: `Ingen TAC-treff for ${tac}.`,
    };
  }

  const ios = supplementWithAppleOptions(tacHit);
  const model = ios?.generation || tacHit.model;

  return {
    imei,
    tac,
    tacHit,
    ios,
    brand: tacHit.brand,
    model,
    colorOptions: ios?.colors ?? [],
    storageOptions: ios?.storages ?? [],
    sourceNote: ios?.colors?.length
      ? `TAC ${tac} → ${tacHit.brand} ${model} (farge/lagring fra ios-device-list)`
      : ios?.storages?.length
        ? `TAC ${tac} → ${tacHit.brand} ${model} (velg farge manuelt)`
        : `TAC ${tac} → ${tacHit.brand} ${model}`,
  };
}
