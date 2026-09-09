import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
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

let cachedIndex: TacIndex | null = null;

const nodeRequire = createRequire(
  path.join(process.cwd(), "node_modules/ios-device-list/package.json"),
);

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

  // Prefer marketing name (first segment) over internal codes like "Xiaomi 2502FRA65G"
  const preferred =
    nameParts.find((p) => /iPhone|iPad|Galaxy|Pixel|Apple /i.test(p)) ??
    nameParts.find((p) => {
      const stripped = p.replace(new RegExp(`^${brand}\\s+`, "i"), "").trim();
      // Skip short internal model codes (letters+digits, no spaces)
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

  // Normalize ALL-CAPS marketing names
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

type IosDevice = {
  Type?: string;
  Generation?: string;
  Identifier?: string;
  Color?: string;
  Storage?: string;
  Model?: string;
  ANumber?: string | string[];
};

function loadIosDeviceList(): {
  deviceByGeneration: (
    generation: string,
    type?: string | null,
    options?: { caseInsensitive?: boolean; contains?: boolean },
  ) => IosDevice[];
  deviceByANumber: (
    anumber: string,
    type?: string | null,
    options?: { caseInsensitive?: boolean; contains?: boolean },
  ) => IosDevice[];
  generationByIdentifier: (id: string, type?: string | null) => string | undefined;
  generations: (type?: string) => string[];
} {
  const candidates = [
    path.join(process.cwd(), "node_modules/ios-device-list"),
    "ios-device-list",
  ];
  let lastErr: unknown;
  for (const id of candidates) {
    try {
      return nodeRequire(id);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("ios-device-list is not installed");
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

function normalizeGenerationQuery(model: string): string[] {
  const cleaned = model
    .replace(/^Apple\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const variants = [cleaned];
  // "iPhone14 Pro" → "iPhone 14 Pro"
  variants.push(cleaned.replace(/^(iPhone|iPad)(\d)/i, "$1 $2"));
  return uniq(variants);
}

export function supplementWithIosDeviceList(hit: TacHit): IosSupplement | null {
  if (hit.brand.toLowerCase() !== "apple") return null;

  const ios = loadIosDeviceList();
  let devices: IosDevice[] = [];

  if (hit.aNumber) {
    devices = ios.deviceByANumber(hit.aNumber, null, { caseInsensitive: true });
  }

  if (devices.length === 0) {
    for (const q of normalizeGenerationQuery(hit.model)) {
      devices = ios.deviceByGeneration(q, null, {
        caseInsensitive: true,
        contains: false,
      });
      if (devices.length === 0) {
        devices = ios.deviceByGeneration(q, null, {
          caseInsensitive: true,
          contains: true,
        });
      }
      if (devices.length > 0) break;
    }
  }

  // Prefer phone/tablet generations that best match the model string
  if (devices.length > 1) {
    const lower = hit.model.toLowerCase();
    const scored = devices.map((d) => {
      const gen = (d.Generation || "").toLowerCase();
      let score = 0;
      if (gen === lower) score += 10;
      if (lower.includes(gen) || gen.includes(lower)) score += 5;
      if (/pro max/.test(lower) === /pro max/.test(gen)) score += 2;
      if (/plus/.test(lower) === /plus/.test(gen)) score += 1;
      return { d, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]?.score ?? 0;
    devices = scored.filter((s) => s.score === best).map((s) => s.d);
  }

  if (devices.length === 0) {
    return {
      generation: hit.model,
      identifier: null,
      colors: [],
      storages: [],
      aNumbers: hit.aNumber ? [hit.aNumber] : [],
      models: [],
    };
  }

  const generation = devices[0]?.Generation ?? hit.model;
  return {
    generation,
    identifier: devices[0]?.Identifier ?? null,
    colors: uniq(devices.map((d) => d.Color)),
    storages: uniq(devices.map((d) => d.Storage)),
    aNumbers: uniq(
      devices.flatMap((d) =>
        Array.isArray(d.ANumber) ? d.ANumber : d.ANumber ? [d.ANumber] : [],
      ),
    ),
    models: uniq(devices.map((d) => d.Model)),
  };
}

/**
 * Lookup device marketing info from IMEI via local TAC DB (+ ios-device-list for Apple).
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

  const ios = supplementWithIosDeviceList(tacHit);
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
    sourceNote: ios?.generation
      ? `TAC ${tac} → ${tacHit.brand} ${model} (supplert med ios-device-list)`
      : `TAC ${tac} → ${tacHit.brand} ${model}`,
  };
}
