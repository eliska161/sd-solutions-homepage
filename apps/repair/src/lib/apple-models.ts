import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Generation = {
  colors?: string[];
  storages?: string[];
};

type AppleOptions = {
  generations: Record<string, Generation>;
};

let cached: AppleOptions | null = null;

function loadAppleOptions(): AppleOptions {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "apple-device-options.json");
  if (!existsSync(file)) {
    cached = { generations: {} };
    return cached;
  }
  cached = JSON.parse(readFileSync(file, "utf8")) as AppleOptions;
  return cached;
}

export type IphoneModelOption = {
  name: string;
  colors: string[];
  storages: string[];
};

const GB = (n: string) => n;

/** Models newer than the ios-device-list dump (stops at iPhone 14). */
const NEWER_IPHONES: IphoneModelOption[] = [
  {
    name: "iPhone 17 Pro Max",
    colors: ["Cosmic Orange", "Deep Blue", "Silver"],
    storages: ["256 GB", "512 GB", "1 TB", "2 TB"],
  },
  {
    name: "iPhone 17 Pro",
    colors: ["Cosmic Orange", "Deep Blue", "Silver"],
    storages: ["256 GB", "512 GB", "1 TB"],
  },
  {
    name: "iPhone Air",
    colors: ["Sky Blue", "Light Gold", "Cloud White", "Space Black"],
    storages: ["256 GB", "512 GB", "1 TB"],
  },
  {
    name: "iPhone 17",
    colors: ["Lavender", "Sage", "Mist Blue", "White", "Black"],
    storages: ["256 GB", "512 GB"],
  },
  {
    name: "iPhone 17e",
    colors: ["Black", "White", "Soft Pink"],
    storages: ["256 GB", "512 GB"],
  },
  {
    name: "iPhone 16 Pro Max",
    colors: [
      "Black Titanium",
      "White Titanium",
      "Natural Titanium",
      "Desert Titanium",
    ],
    storages: ["256 GB", "512 GB", "1 TB"],
  },
  {
    name: "iPhone 16 Pro",
    colors: [
      "Black Titanium",
      "White Titanium",
      "Natural Titanium",
      "Desert Titanium",
    ],
    storages: ["256 GB", "512 GB", "1 TB"],
  },
  {
    name: "iPhone 16 Plus",
    colors: ["Black", "White", "Pink", "Teal", "Ultramarine"],
    storages: ["128 GB", "256 GB", "512 GB"],
  },
  {
    name: "iPhone 16",
    colors: ["Black", "White", "Pink", "Teal", "Ultramarine"],
    storages: ["128 GB", "256 GB", "512 GB"],
  },
  {
    name: "iPhone 16e",
    colors: ["Black", "White"],
    storages: ["128 GB", "256 GB", "512 GB"],
  },
  {
    name: "iPhone 15 Pro Max",
    colors: [
      "Black Titanium",
      "White Titanium",
      "Natural Titanium",
      "Blue Titanium",
    ],
    storages: ["256 GB", "512 GB", "1 TB"],
  },
  {
    name: "iPhone 15 Pro",
    colors: [
      "Black Titanium",
      "White Titanium",
      "Natural Titanium",
      "Blue Titanium",
    ],
    storages: ["128 GB", "256 GB", "512 GB", "1 TB"],
  },
  {
    name: "iPhone 15 Plus",
    colors: ["Black", "Blue", "Green", "Yellow", "Pink"],
    storages: ["128 GB", "256 GB", "512 GB"],
  },
  {
    name: "iPhone 15",
    colors: ["Black", "Blue", "Green", "Yellow", "Pink"],
    storages: ["128 GB", "256 GB", "512 GB"],
  },
];

const PRE_X = new Set([
  "iPhone",
  "iPhone 3G",
  "iPhone 3GS",
  "iPhone 4",
  "iPhone 4S",
  "iPhone 5",
  "iPhone 5c",
  "iPhone 5s",
  "iPhone SE (1st generation)",
  "iPhone 6",
  "iPhone 6 Plus",
  "iPhone 6s",
  "iPhone 6s Plus",
  "iPhone 7",
  "iPhone 7 Plus",
  "iPhone 8",
  "iPhone 8 Plus",
]);

/** Newest first so 17-series sits at the top of the service-order dropdown. */
const SORT_INDEX: Record<string, number> = {
  "iPhone 17 Pro Max": 10,
  "iPhone 17 Pro": 20,
  "iPhone Air": 30,
  "iPhone 17": 40,
  "iPhone 17e": 50,
  "iPhone 16 Pro Max": 60,
  "iPhone 16 Pro": 70,
  "iPhone 16 Plus": 80,
  "iPhone 16": 90,
  "iPhone 16e": 100,
  "iPhone 15 Pro Max": 110,
  "iPhone 15 Pro": 120,
  "iPhone 15 Plus": 130,
  "iPhone 15": 140,
  "iPhone 14 Pro Max": 150,
  "iPhone 14 Pro": 160,
  "iPhone 14 Plus": 170,
  "iPhone 14": 180,
  "iPhone 13 Pro Max": 190,
  "iPhone 13 Pro": 200,
  "iPhone 13": 210,
  "iPhone 13 mini": 220,
  "iPhone SE (3rd generation)": 230,
  "iPhone 12 Pro Max": 240,
  "iPhone 12 Pro": 250,
  "iPhone 12": 260,
  "iPhone 12 mini": 270,
  "iPhone SE (2nd generation)": 280,
  "iPhone 11 Pro Max": 290,
  "iPhone 11 Pro": 300,
  "iPhone 11": 310,
  "iPhone XS Max": 320,
  "iPhone XS": 330,
  "iPhone XR": 340,
  "iPhone X": 350,
};

function fromCatalog(name: string, gen: Generation | undefined): IphoneModelOption {
  return {
    name,
    colors: gen?.colors?.filter(Boolean) ?? [],
    storages: (gen?.storages ?? []).map((s) =>
      s.endsWith("GB") || s.endsWith("TB") || s.endsWith("T") ? GB(s.replace(/ T$/, " TB")) : s,
    ),
  };
}

export function listIphoneModels(): IphoneModelOption[] {
  const gens = loadAppleOptions().generations;
  const byName = new Map<string, IphoneModelOption>();

  for (const [name, gen] of Object.entries(gens)) {
    if (!name.startsWith("iPhone")) continue;
    if (PRE_X.has(name)) continue;
    byName.set(name, fromCatalog(name, gen));
  }

  for (const extra of NEWER_IPHONES) {
    byName.set(extra.name, extra);
  }

  return [...byName.values()].sort((a, b) => {
    const ai = SORT_INDEX[a.name] ?? 900;
    const bi = SORT_INDEX[b.name] ?? 900;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}
