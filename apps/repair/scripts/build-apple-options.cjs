#!/usr/bin/env node
/**
 * Build data/apple-device-options.json from ios-device-list (dev/rebuild only).
 * Runtime reads the JSON file — no Node require of ios-device-list in production.
 */
const fs = require("node:fs");
const path = require("node:path");
const ios = require("ios-device-list");

const devices = ios.devices();
const byGen = {};

for (const d of devices) {
  const gen = d.Generation;
  if (!gen) continue;
  if (!byGen[gen]) {
    byGen[gen] = {
      identifier: d.Identifier || null,
      colors: [],
      storages: [],
    };
  }
  if (d.Identifier && !byGen[gen].identifier) {
    byGen[gen].identifier = d.Identifier;
  }
  if (d.Color && !byGen[gen].colors.includes(d.Color)) {
    byGen[gen].colors.push(d.Color);
  }
  if (d.Storage && !byGen[gen].storages.includes(d.Storage)) {
    byGen[gen].storages.push(d.Storage);
  }
}

function storageKey(s) {
  const m = String(s).match(/([\d.]+)\s*(TB|GB)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return /TB/i.test(m[2]) ? n * 1024 : n;
}

for (const g of Object.keys(byGen)) {
  byGen[g].storages.sort((a, b) => storageKey(a) - storageKey(b));
  byGen[g].colors.sort((a, b) => a.localeCompare(b));
}

const outDir = path.join(__dirname, "..", "data");
const out = path.join(outDir, "apple-device-options.json");
fs.writeFileSync(
  out,
  JSON.stringify(
    {
      source: "https://github.com/pbakondy/ios-device-list",
      builtAt: new Date().toISOString(),
      generations: byGen,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Wrote ${out} (${Object.keys(byGen).length} generations)`);
