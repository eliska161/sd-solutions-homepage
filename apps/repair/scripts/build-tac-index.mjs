#!/usr/bin/env node
/**
 * Download MoazEb/tac-database CSV and build a compact gzipped TAC → [brand, specs] index.
 * Usage: npm run data:tac
 */
import { mkdir, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const CSV_URL =
  "https://raw.githubusercontent.com/MoazEb/tac-database/main/tac_full.csv";

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

async function main() {
  console.log("Downloading", CSV_URL);
  const res = await fetch(CSV_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const map = Object.create(null);
  const rl = createInterface({
    input: Readable.fromWeb(res.body),
    crlfDelay: Infinity,
  });

  let header = true;
  let brandIdx = 0;
  let tacIdx = 1;
  let specsIdx = 2;
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (header) {
      header = false;
      brandIdx = cols.findIndex((c) => c.toLowerCase() === "brand");
      tacIdx = cols.findIndex((c) => c.toLowerCase() === "tac");
      specsIdx = cols.findIndex((c) => c.toLowerCase() === "specs");
      if (brandIdx < 0 || tacIdx < 0 || specsIdx < 0) {
        throw new Error(`Unexpected CSV header: ${cols.join(",")}`);
      }
      continue;
    }
    const brand = (cols[brandIdx] || "").trim();
    let tac = (cols[tacIdx] || "").trim();
    const specs = (cols[specsIdx] || "").trim();
    if (!tac || !brand) continue;
    tac = tac.replace(/\D/g, "").slice(0, 8);
    if (tac.length !== 8) continue;
    if (!(tac in map)) {
      map[tac] = [brand, specs];
      count++;
    }
  }

  await mkdir(outDir, { recursive: true });
  const gzPath = path.join(outDir, "tac-index.json.gz");
  await writeFile(
    gzPath,
    gzipSync(Buffer.from(JSON.stringify(map), "utf8"), { level: 9 }),
  );
  await writeFile(
    path.join(outDir, "tac-index.meta.json"),
    JSON.stringify(
      {
        source: "https://github.com/MoazEb/tac-database",
        supplement: "https://github.com/pbakondy/ios-device-list",
        entries: count,
        builtAt: new Date().toISOString(),
        format: "gzipped JSON object: { tac: [brand, specs] }",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Wrote ${gzPath} (${count} TAC entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
