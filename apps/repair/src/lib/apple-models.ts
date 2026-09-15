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

export function listIphoneModels(): IphoneModelOption[] {
  const gens = loadAppleOptions().generations;
  return Object.entries(gens)
    .filter(([name]) => name.startsWith("iPhone"))
    .map(([name, gen]) => ({
      name,
      colors: gen.colors ?? [],
      storages: gen.storages ?? [],
    }));
}
