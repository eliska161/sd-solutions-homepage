/**
 * ESC/POS for 58 mm labels. Height is compact (~12 mm) with small type.
 * Logo and CODE128 are raster so native GS k cannot print as garbage.
 */

import { LEGAL_VERSION } from "@/lib/legal";

const ESC = 0x1b;
const GS = 0x1d;

/** Usual 58 mm printable width at 203 DPI. */
export const LABEL_WIDTH_DOTS = 384;
export const LABEL_HEIGHT_DOTS = 96;

function concat(...parts: Uint8Array[]) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function cmd(...bytes: number[]) {
  return Uint8Array.from(bytes);
}

export type StickerInput = {
  ticket: string;
  device: string;
  model?: string;
  storage?: string;
  color?: string;
  phone?: string;
  issue?: string;
  parts?: string[];
  locker?: number | string;
  version?: string;
};

export function formatStickerPhone(raw?: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  const eight =
    digits.startsWith("47") && digits.length > 8 ? digits.slice(-8) : digits.slice(-8);
  if (eight.length !== 8) return raw?.trim() || "";
  return `+47 ${eight.slice(0, 2)} ${eight.slice(2, 4)} ${eight.slice(4, 6)} ${eight.slice(6, 8)}`;
}

/** 5×7 glyphs, bit 0 = left. */
const FONT: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0],
  "-": [0, 0, 14, 0, 0],
  ".": [0, 0, 0, 0, 4],
  "+": [4, 4, 31, 4, 4],
  "/": [1, 2, 4, 8, 16],
  0: [14, 17, 19, 21, 14],
  1: [0, 9, 31, 1, 0],
  2: [9, 19, 21, 9, 0],
  3: [17, 21, 21, 10, 0],
  4: [6, 10, 31, 2, 0],
  5: [29, 21, 21, 18, 0],
  6: [14, 21, 21, 2, 0],
  7: [16, 16, 19, 28, 0],
  8: [10, 21, 21, 10, 0],
  9: [8, 21, 21, 14, 0],
  A: [15, 20, 20, 15, 0],
  B: [31, 21, 21, 10, 0],
  C: [14, 17, 17, 10, 0],
  D: [31, 17, 17, 14, 0],
  E: [31, 21, 21, 17, 0],
  F: [31, 20, 20, 16, 0],
  G: [14, 17, 21, 6, 0],
  H: [31, 4, 4, 31, 0],
  I: [17, 31, 17, 0, 0],
  J: [2, 1, 17, 30, 0],
  K: [31, 4, 10, 17, 0],
  L: [31, 1, 1, 1, 0],
  M: [31, 8, 4, 8, 31],
  N: [31, 8, 4, 2, 31],
  O: [14, 17, 17, 14, 0],
  P: [31, 20, 20, 8, 0],
  Q: [14, 17, 19, 15, 0],
  R: [31, 20, 22, 9, 0],
  S: [9, 21, 21, 18, 0],
  T: [16, 16, 31, 16, 16],
  U: [30, 1, 1, 30, 0],
  V: [28, 2, 1, 2, 28],
  W: [31, 2, 4, 2, 31],
  X: [17, 10, 4, 10, 17],
  Y: [16, 8, 7, 8, 16],
  Z: [17, 19, 21, 25, 17],
};

class Bitmap {
  readonly width: number;
  readonly height: number;
  private readonly bits: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bits = new Uint8Array(width * height);
  }

  set(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.bits[y * this.width + x] = 1;
  }

  fillRect(x: number, y: number, w: number, h: number) {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy);
    }
  }

  textWidth(value: string, scale = 1) {
    return value.length * 6 * scale;
  }

  text(value: string, x: number, y: number, scale = 1) {
    let cx = x;
    for (const ch of value.toUpperCase()) {
      const cols = FONT[ch] ?? FONT["-"];
      for (let col = 0; col < 5; col++) {
        const bits = cols[col] ?? 0;
        for (let row = 0; row < 7; row++) {
          if (bits & (1 << row)) this.fillRect(cx + col * scale, y + row * scale, scale, scale);
        }
      }
      cx += 6 * scale;
    }
    return cx;
  }

  textRight(value: string, right: number, y: number, scale = 1) {
    const w = this.textWidth(value.toUpperCase(), scale);
    return this.text(value, Math.max(0, right - w), y, scale);
  }

  toRaster(): Uint8Array {
    const byteWidth = Math.ceil(this.width / 8);
    const data = new Uint8Array(byteWidth * this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.bits[y * this.width + x]) continue;
        data[y * byteWidth + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    return data;
  }
}

const C128 = [
  "11011001100","11001101100","11001100110","10010011000","10010001100",
  "10001001100","10011001000","10011000100","10001100100","11001001000",
  "11001000100","11000100100","10110011100","10011011100","10011001110",
  "10111001100","10011101100","10011100110","11001110010","11001011100",
  "11001001110","11011100100","11001110100","11101101110","11101001100",
  "11100101100","11100100110","11101100100","11100110100","11100110010",
  "11011011000","11011000110","11000110110","10100011000","10001011000",
  "10001000110","10110001000","10001101000","10001100010","11010001000",
  "11000101000","11000100010","10110111000","10110001110","10001101110",
  "10111011000","10111000110","10001110110","11101110110","11010001110",
  "11000101110","11011101000","11011100010","11011101110","11101011000",
  "11101000110","11100010110","11101101000","11101100010","11100011010",
  "11101111010","11001000010","11110001010","10100110000","10100001100",
  "10010110000","10010000110","10000101100","10000100110","10110010000",
  "10110000100","10011010000","10011000010","10000110100","10000110010",
  "11000010010","11001010000","11110111010","11000010100","10001111010",
  "10100111100","10010111100","10010011110","10111100100","10011110100",
  "10011110010","11110100100","11110010100","11110010010","11011011110",
  "11011110110","11101110110","10101111000","10100011110","10001011110",
  "10111101000","10111100010","11110101000","11110100010","10111011110",
  "10111101110","11101011110","11110101110","11010000100","11010010000",
  "11010011100","1100011101011",
];

const START_B = 104;

function code128Modules(text: string) {
  const chars = [...text].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 127) return 32;
    return c - 32;
  });
  const codes = [START_B, ...chars];
  let sum = START_B;
  chars.forEach((code, i) => {
    sum += code * (i + 1);
  });
  codes.push(sum % 103);
  codes.push(106);
  return codes.map((code) => C128[code]).join("");
}

function barcodePixelWidth(data: string, maxWidth: number) {
  const modules = code128Modules(data);
  const quiet = 8;
  const total = modules.length + quiet * 2;
  const moduleW = Math.max(1, Math.floor(maxWidth / total));
  return { modules, quiet, moduleW, width: total * moduleW };
}

function drawBarcode(map: Bitmap, data: string, x: number, y: number, maxWidth: number, height: number) {
  const { modules, quiet, moduleW } = barcodePixelWidth(data, maxWidth);
  let cx = x + quiet * moduleW;
  for (const bit of modules) {
    if (bit === "1") map.fillRect(cx, y, moduleW, height);
    cx += moduleW;
  }
}

function drawSdMark(map: Bitmap, x: number, y: number, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(8, Math.round(w));
  canvas.height = Math.max(8, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sx = canvas.width / 56;
  const sy = canvas.height / 40;
  ctx.scale(sx, sy);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(8.2, 15.1);
  ctx.bezierCurveTo(8.2, 11.2, 11.6, 8.6, 16, 8.6);
  ctx.bezierCurveTo(20.3, 8.6, 23.5, 10.8, 23.5, 14.1);
  ctx.bezierCurveTo(23.5, 21.1, 8.1, 19.1, 8.1, 28.6);
  ctx.bezierCurveTo(8.1, 32.9, 11.8, 35.6, 16.5, 35.6);
  ctx.bezierCurveTo(21.3, 35.6, 24.7, 33, 25, 29);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(33.2, 8.6);
  ctx.lineTo(33.2, 31.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(33.2, 8.6);
  ctx.lineTo(36.8, 8.6);
  ctx.bezierCurveTo(43.8, 8.6, 48.3, 13.7, 48.3, 20);
  ctx.bezierCurveTo(48.3, 26.3, 43.8, 31.4, 36.8, 31.4);
  ctx.lineTo(33.2, 31.4);
  ctx.stroke();

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const i = (py * canvas.width + px) * 4;
      if (pixels[i] < 140) map.set(x + px, y + py);
    }
  }
}

async function stampPngLogo(map: Bitmap, x: number, y: number, size: number) {
  if (typeof document === "undefined") {
    drawSdMark(map, x, y, size, Math.round(size * 0.72));
    return;
  }
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = "/sd-solutions-mark.png";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const i = (py * size + px) * 4;
        const a = pixels[i + 3];
        const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (a > 40 && lum < 200) map.set(x + px, y + py);
      }
    }
  } catch {
    drawSdMark(map, x, y, size, Math.round(size * 0.72));
  }
}

function gsRaster(map: Bitmap) {
  const data = map.toRaster();
  const byteWidth = Math.ceil(map.width / 8);
  return concat(
    cmd(
      GS,
      0x76,
      0x30,
      0,
      byteWidth & 0xff,
      (byteWidth >> 8) & 0xff,
      map.height & 0xff,
      (map.height >> 8) & 0xff,
    ),
    data,
  );
}

function labelGrade(parts?: string[]) {
  for (const row of parts ?? []) {
    const blob = row.toLowerCase();
    if (blob.includes("service pack") || blob.includes("original")) return "Apple Service Pack";
    if (blob.includes("oem pull") || blob.includes("oem-pull") || /\bpull\b/.test(blob)) {
      return "OEM Pull";
    }
    if (blob.includes("aftermarket") || blob.includes("kompatibel")) return "Aftermarket";
  }
  return "";
}

function guessStorage(device: string) {
  return device.match(/\d+\s*GB/i)?.[0]?.replace(/\s+/g, "") ?? "";
}

function guessColor(device: string) {
  const without = device.replace(/\d+\s*GB/i, "").trim();
  const parts = without.split(/\s+/);
  if (parts.length < 2) return "";
  const last = parts[parts.length - 1];
  if (/^iphone|^ipad|^apple/i.test(last)) return "";
  if (/^\d/.test(last)) return "";
  return last;
}

function guessModel(device: string) {
  return device
    .replace(/\d+\s*GB/i, "")
    .trim()
    .split(/\s+/)
    .filter((word, i, all) => {
      if (i === all.length - 1 && guessColor(device) === word) return false;
      return true;
    })
    .join(" ");
}

export async function buildLockerSticker(input: StickerInput) {
  const ticket = input.ticket.replace(/[^A-Za-z0-9-]/g, "") || "SD";
  const phone = formatStickerPhone(input.phone);
  const model = (input.model || guessModel(input.device) || input.device).trim() || "iPhone";
  const storage = (input.storage || guessStorage(input.device)).trim();
  const color = (input.color || guessColor(input.device)).trim();
  const grade = labelGrade(input.parts);
  const version = (input.version || LEGAL_VERSION).trim();
  const w = LABEL_WIDTH_DOTS;
  const map = new Bitmap(w, LABEL_HEIGHT_DOTS);
  const pad = 4;
  const logo = 32;
  const top = 2;

  await stampPngLogo(map, pad, top, logo);
  const barcodeMax = 200;
  const barW = barcodePixelWidth(ticket, barcodeMax).width;
  drawBarcode(map, ticket, w - pad - barW, top + 1, barcodeMax, 30);

  const mid = 40;
  map.text(model.slice(0, 16), pad, mid, 1);
  const specX = Math.min(170, pad + map.textWidth(model.slice(0, 16), 1) + 8);
  if (storage) map.text(storage.slice(0, 10), specX, mid, 1);
  if (color) map.text(color.slice(0, 12), specX, mid + 10, 1);
  if (phone) map.textRight(phone, w - pad, mid, 1);

  const lineY = 64;
  for (let x = pad; x < w - pad; x++) map.set(x, lineY);

  if (grade) map.text(grade, pad, 72, 1);
  if (version) map.textRight(version, w - pad, 72, 1);

  return concat(
    cmd(ESC, 0x40),
    cmd(ESC, 0x61, 0),
    cmd(GS, 0x4c, 0, 0),
    cmd(GS, 0x57, w & 0xff, (w >> 8) & 0xff),
    cmd(ESC, 0x33, 0),
    gsRaster(map),
    cmd(ESC, 0x4a, 12),
  );
}
