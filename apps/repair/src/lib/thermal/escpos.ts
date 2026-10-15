/**
 * ESC/POS for 80 mm thermal (576 dots / Font A 42 columns).
 * Workshop receipts are a character grid (ESC t 5 / OEM865 Nordic)
 * plus small bitmaps (logo, CODE128, QR).
 */

import { LEGAL_VERSION, LEGAL_PARTY } from "@/lib/legal-catalog";
import { PORTAL_MARK_DATA_URL, PORTAL_MARK_SRC } from "@/lib/thermal/portal-mark";
import type { WorkshopReceiptInput } from "@/lib/thermal/types";

export type { WorkshopReceiptInput, WorkshopReceiptKind } from "@/lib/thermal/types";

const ESC = 0x1b;
const GS = 0x1d;

/** Standard 80 mm printable width at 203 DPI. */
export const LABEL_WIDTH_DOTS = 576;
export const LABEL_HEIGHT_DOTS = 240;

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

export type ReceiptPrintInput = {
  ticket: string;
  device: string;
  phone?: string;
  customerName?: string;
  issuedAt?: Date | string;
  paymentLabel?: string;
  paymentDetail?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  authCode?: string | null;
  transactionId?: string | null;
  totalLabel: string;
  netLabel?: string;
  vatLabel?: string;
  statusUrl?: string | null;
  statusQr?: string | null;
  lines: { name: string; amountLabel: string }[];
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

  hasRow(y: number) {
    if (y < 0 || y >= this.height) return false;
    const row = y * this.width;
    for (let x = 0; x < this.width; x++) {
      if (this.bits[row + x]) return true;
    }
    return false;
  }

  copyRows(y0: number, y1: number) {
    const height = Math.max(0, y1 - y0);
    const next = new Bitmap(this.width, height);
    for (let y = 0; y < height; y++) {
      const srcY = y0 + y;
      if (srcY < 0 || srcY >= this.height) continue;
      for (let x = 0; x < this.width; x++) {
        if (this.bits[srcY * this.width + x]) next.set(x, y);
      }
    }
    return next;
  }

  inkX(y0: number, y1: number) {
    let x0 = this.width;
    let x1 = 0;
    for (let y = y0; y < y1 && y < this.height; y++) {
      const row = y * this.width;
      for (let x = 0; x < this.width; x++) {
        if (!this.bits[row + x]) continue;
        if (x < x0) x0 = x;
        if (x + 1 > x1) x1 = x + 1;
      }
    }
    if (x1 <= x0) return { x0: 0, x1: this.width };
    x0 = x0 & ~7;
    x1 = Math.min(this.width, (x1 + 7) & ~7);
    return { x0, x1 };
  }

  copyRect(x0: number, y0: number, x1: number, y1: number) {
    const width = Math.max(0, x1 - x0);
    const height = Math.max(0, y1 - y0);
    const next = new Bitmap(width, height);
    for (let y = 0; y < height; y++) {
      const srcY = y0 + y;
      if (srcY < 0 || srcY >= this.height) continue;
      for (let x = 0; x < width; x++) {
        const srcX = x0 + x;
        if (srcX < 0 || srcX >= this.width) continue;
        if (this.bits[srcY * this.width + srcX]) next.set(x, y);
      }
    }
    return next;
  }

  cropBottom(pad = 8) {
    let last = this.height - 1;
    while (last > 0) {
      let ink = false;
      for (let x = 0; x < this.width; x++) {
        if (this.bits[last * this.width + x]) {
          ink = true;
          break;
        }
      }
      if (ink) break;
      last -= 1;
    }
    const height = Math.min(this.height, last + 1 + pad);
    if (height === this.height) return this;
    const next = new Bitmap(this.width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.bits[y * this.width + x]) next.set(x, y);
      }
    }
    return next;
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
  const quiet = 10;
  const total = modules.length + quiet * 2;
  const moduleW = Math.max(1, Math.floor(maxWidth / total));
  return { modules, quiet, moduleW, width: total * moduleW };
}

function gsRaster(map: Bitmap) {
  const byteWidth = Math.ceil(map.width / 8);
  const raw = map.toRaster();
  const pad = map.height % 8 === 0 ? 0 : 8 - (map.height % 8);
  const height = map.height + pad;
  const data = pad ? new Uint8Array(byteWidth * height) : raw;
  if (pad) data.set(raw);
  return concat(
    cmd(
      GS,
      0x76,
      0x30,
      0,
      byteWidth & 0xff,
      (byteWidth >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff,
    ),
    data,
  );
}

function canvasToBitmap(canvas: HTMLCanvasElement, rotate180: boolean) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Bitmap(w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const map = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      if (pixels[i + 3] < 40 || lum >= 230) continue;
      if (rotate180) map.set(w - 1 - x, h - 1 - y);
      else map.set(x, y);
    }
  }
  return map;
}

function paintBarcode(
  ctx: CanvasRenderingContext2D,
  data: string,
  x: number,
  y: number,
  maxWidth: number,
  height: number,
) {
  const { modules, quiet, moduleW, width } = barcodePixelWidth(data, maxWidth);
  const drawnX = x + Math.max(0, Math.floor((maxWidth - width) / 2));
  let cx = drawnX + quiet * moduleW;
  const barLeft = cx;
  ctx.fillStyle = "#000000";
  for (const bit of modules) {
    if (bit === "1") ctx.fillRect(cx, y, moduleW, height);
    cx += moduleW;
  }
  const barWidth = cx - barLeft;
  return { left: barLeft, width: barWidth, center: barLeft + barWidth / 2 };
}

async function loadPortalMark() {
  const img = new Image();
  img.decoding = "sync";
  img.src = PORTAL_MARK_DATA_URL;
  try {
    await img.decode();
    return img;
  } catch {
    img.src = PORTAL_MARK_SRC;
    await img.decode();
    return img;
  }
}

async function paintLogo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const img = await loadPortalMark();
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  if (!tctx) return;
  tctx.fillStyle = "#000000";
  tctx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  tctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const pixels = tctx.getImageData(0, 0, w, h);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const lum = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    const ink = pixels.data[i + 3] > 40 && lum > 80;
    pixels.data[i] = ink ? 0 : 255;
    pixels.data[i + 1] = ink ? 0 : 255;
    pixels.data[i + 2] = ink ? 0 : 255;
    pixels.data[i + 3] = 255;
  }
  tctx.putImageData(pixels, 0, 0);
  ctx.drawImage(tmp, x, y);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: "left" | "right" | "center" = "left",
) {
  if (!text) return;
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > maxWidth) t = t.slice(0, -1);
  const px = align === "right" ? x + maxWidth : align === "center" ? x + maxWidth / 2 : x;
  ctx.textAlign = align;
  ctx.fillText(t, px, y);
  ctx.textAlign = "left";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function partialCut() {
  return concat(cmd(ESC, 0x4a, 40), cmd(GS, 0x56, 0x41, 0x10));
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
  const h = LABEL_HEIGHT_DOTS;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne etikett");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const pad = 8;
  const logo = { x: pad, y: pad, w: 92, h: 92 };
  const bar = { x: 108, y: pad, w: w - pad - 108, h: 96 };
  const ticketY = bar.y + bar.h + 4;
  const modelY = ticketY + 30;
  const specY = modelY + 32;
  const lineY = specY + 32;
  const footY = lineY + 10;

  await paintLogo(ctx, logo.x, logo.y, logo.w, logo.h);
  const bars = paintBarcode(ctx, ticket, bar.x, bar.y, bar.w, bar.h);
  ctx.font = "700 26px sans-serif";
  fitText(ctx, ticket, bars.left, ticketY, bars.width, "center");

  ctx.font = "700 30px sans-serif";
  fitText(ctx, model, pad, modelY, 300);
  ctx.font = "700 26px sans-serif";
  if (phone) fitText(ctx, phone, 308, modelY, w - pad - 308, "right");

  ctx.font = "600 24px sans-serif";
  const spec = [storage, color].filter(Boolean).join("  ");
  if (spec) fitText(ctx, spec, pad, specY, 280);

  ctx.fillRect(pad, lineY, w - pad * 2, 3);

  ctx.font = "600 22px sans-serif";
  if (grade) fitText(ctx, grade, pad, footY, 300);
  if (version) fitText(ctx, version, 320, footY, w - pad - 320, "right");

  const map = canvasToBitmap(canvas, true).cropBottom(8);

  return concat(
    cmd(ESC, 0x40),
    cmd(ESC, 0x7b, 0),
    cmd(ESC, 0x61, 0),
    cmd(GS, 0x4c, 0, 0),
    cmd(GS, 0x57, w & 0xff, (w >> 8) & 0xff),
    cmd(ESC, 0x33, 0),
    gsRaster(map),
    partialCut(),
  );
}

async function paintDataUrl(
  ctx: CanvasRenderingContext2D,
  dataUrl: string,
  x: number,
  y: number,
  size: number,
) {
  const img = new Image();
  img.decoding = "sync";
  img.src = dataUrl;
  try {
    await img.decode();
  } catch {
    return;
  }
  ctx.drawImage(img, x, y, size, size);
}

export async function buildLockerReceipt(input: ReceiptPrintInput) {
  const ticket = input.ticket.replace(/[^A-Za-z0-9-]/g, "") || "SD";
  const phone = formatStickerPhone(input.phone);
  const issued =
    input.issuedAt instanceof Date
      ? input.issuedAt
      : input.issuedAt
        ? new Date(input.issuedAt)
        : new Date();
  const when = Number.isNaN(issued.getTime())
    ? ""
    : issued.toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
  const lines = input.lines.slice(0, 12);
  const payRows = [
    input.paymentDetail,
    input.cardLast4 && input.cardBrand
      ? `${input.cardBrand} **** ${input.cardLast4}`
      : input.cardLast4
        ? `Kort **** ${input.cardLast4}`
        : null,
    input.authCode ? `Aut.id ${input.authCode}` : null,
    input.transactionId ? `Transaksjon ${input.transactionId}` : null,
  ].filter((row, i, all): row is string => Boolean(row) && all.indexOf(row) === i);
  const hasQr = Boolean(input.statusQr);
  const w = LABEL_WIDTH_DOTS;
  const h =
    430 +
    lines.length * 34 +
    payRows.length * 26 +
    (hasQr ? 250 : 40) +
    70;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne kvittering");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const pad = 16;
  const inner = w - pad * 2;
  await paintLogo(ctx, (w - 120) / 2, pad, 120, 120);

  let y = pad + 128;
  ctx.font = "700 28px sans-serif";
  fitText(ctx, LEGAL_PARTY.brandName.toUpperCase(), pad, y, inner, "center");
  y += 34;
  ctx.font = "600 20px sans-serif";
  fitText(ctx, LEGAL_PARTY.legalName, pad, y, inner, "center");
  y += 26;
  fitText(ctx, LEGAL_PARTY.address, pad, y, inner, "center");
  y += 26;
  fitText(ctx, LEGAL_PARTY.email, pad, y, inner, "center");
  y += 32;
  ctx.fillRect(pad, y, inner, 3);
  y += 16;
  ctx.font = "700 26px sans-serif";
  fitText(ctx, "KVITTERING", pad, y, inner, "center");
  y += 32;
  ctx.font = "600 20px sans-serif";
  if (when) {
    fitText(ctx, when, pad, y, inner, "center");
    y += 28;
  }
  ctx.fillRect(pad, y, inner, 3);
  y += 18;

  const meta = [
    input.customerName ? ["Kunde", input.customerName] : null,
    ["Rep.nr", ticket],
    input.device ? ["Enhet", input.device] : null,
    phone ? ["Telefon", phone] : null,
  ].filter(Boolean) as [string, string][];
  ctx.font = "600 20px sans-serif";
  for (const [label, value] of meta) {
    fitText(ctx, label, pad, y, 150);
    fitText(ctx, value, pad + 150, y, inner - 150, "right");
    y += 26;
  }
  y += 8;
  ctx.fillRect(pad, y, inner, 3);
  y += 16;

  ctx.font = "600 22px sans-serif";
  for (const line of lines) {
    fitText(ctx, line.name, pad, y, 340);
    fitText(ctx, line.amountLabel, pad + 340, y, inner - 340, "right");
    y += 32;
  }
  ctx.fillRect(pad, y, inner, 3);
  y += 14;
  if (input.netLabel) {
    ctx.font = "600 20px sans-serif";
    fitText(ctx, "Sum eks. mva", pad, y, 300);
    fitText(ctx, input.netLabel, pad + 300, y, inner - 300, "right");
    y += 26;
  }
  if (input.vatLabel) {
    ctx.font = "600 20px sans-serif";
    fitText(ctx, "Herav mva 25 %", pad, y, 300);
    fitText(ctx, input.vatLabel, pad + 300, y, inner - 300, "right");
    y += 28;
  }
  ctx.font = "700 30px sans-serif";
  fitText(ctx, "TOTAL", pad, y, 240);
  fitText(ctx, input.totalLabel, pad + 240, y, inner - 240, "right");
  y += 40;
  ctx.fillRect(pad, y, inner, 3);
  y += 16;
  ctx.font = "700 22px sans-serif";
  fitText(ctx, "Betaling", pad, y, inner);
  y += 28;
  ctx.font = "600 20px sans-serif";
  fitText(ctx, input.paymentLabel || "Betalt", pad, y, inner);
  y += 26;
  for (const row of payRows) {
    fitText(ctx, row, pad, y, inner);
    y += 26;
  }
  y += 10;
  ctx.fillRect(pad, y, inner, 3);
  y += 18;

  if (hasQr && input.statusQr) {
    ctx.font = "600 20px sans-serif";
    fitText(ctx, "Status", pad, y, inner, "center");
    y += 28;
    const qr = 180;
    await paintDataUrl(ctx, input.statusQr, (w - qr) / 2, y, qr);
    y += qr + 12;
    const statusLabel = (input.statusUrl || "").replace(/^https:\/\//, "");
    if (statusLabel) fitText(ctx, statusLabel, pad, y, inner, "center");
    y += 30;
  }

  ctx.font = "700 24px sans-serif";
  fitText(ctx, "Takk for handelen", pad, y, inner, "center");

  const map = canvasToBitmap(canvas, true).cropBottom(8);
  return concat(
    cmd(ESC, 0x40),
    cmd(ESC, 0x7b, 0),
    cmd(ESC, 0x61, 0),
    cmd(GS, 0x4c, 0, 0),
    cmd(GS, 0x57, w & 0xff, (w >> 8) & 0xff),
    cmd(ESC, 0x33, 0),
    gsRaster(map),
    partialCut(),
  );
}

/** Font A columns on 80 mm. 42 stays on one line even if the printer is 42 or 48. */
const RECEIPT_COLS = 42;

/** ESC t 5 = PC865 / OEM865 Nordic. */
const CP865: Record<string, number> = {
  æ: 0x91,
  Æ: 0x92,
  ø: 0x9b,
  Ø: 0x9d,
  å: 0x86,
  Å: 0x8f,
  ä: 0x84,
  Ä: 0x8e,
  ö: 0x94,
  Ö: 0x99,
  ü: 0x81,
  Ü: 0x9a,
  é: 0x82,
  É: 0x90,
};

function selectOem865() {
  return cmd(ESC, 0x74, 5);
}

function posChars(value: string) {
  return [...value.normalize("NFC")]
    .map((ch) => {
      if (ch === "–" || ch === "—") return "-";
      if (ch === "“" || ch === "”" || ch === "«" || ch === "»") return '"';
      if (ch === "’" || ch === "‘") return "'";
      const code = ch.charCodeAt(0);
      if (code >= 0x20 && code <= 0x7e) return ch;
      if (CP865[ch] != null) return ch;
      return " ";
    })
    .join("");
}

function posBytes(value: string) {
  const text = posChars(value);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    out[i] = CP865[ch] ?? ch.charCodeAt(0);
  }
  return out;
}

function clipCols(value: string, cols = RECEIPT_COLS) {
  const text = posChars(value);
  return [...text].slice(0, cols).join("");
}

function textLine(value = "") {
  return concat(posBytes(clipCols(value)), cmd(0x0a));
}

function pairLine(left: string, right: string) {
  const r = clipCols(right, 14);
  const l = clipCols(left, RECEIPT_COLS - r.length - 1);
  return textLine(`${l}${" ".repeat(RECEIPT_COLS - l.length - r.length)}${r}`);
}

function wrapLines(value: string) {
  const words = posChars(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= RECEIPT_COLS) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > RECEIPT_COLS ? word.slice(0, RECEIPT_COLS) : word;
  }
  if (current) lines.push(current);
  return lines.length ? concat(...lines.map((line) => textLine(line))) : textLine();
}

function ruleLine() {
  return textLine("-".repeat(RECEIPT_COLS));
}

function align(n: 0 | 1 | 2) {
  return cmd(ESC, 0x61, n);
}

function bold(on: boolean) {
  return cmd(ESC, 0x45, on ? 1 : 0);
}

function wide(on: boolean) {
  return cmd(ESC, 0x21, on ? 0x20 : 0);
}

function feedDots(n: number) {
  let dots = Math.max(0, Math.min(255, n));
  if (dots === 17 || dots === 19) dots += 1;
  return cmd(ESC, 0x4a, dots);
}

function blankLines(n: number) {
  return concat(...Array.from({ length: n }, () => cmd(0x0a)));
}

function graphicBand(map: Bitmap) {
  return concat(align(0), gsRaster(map), feedDots(24), selectOem865(), cmd(ESC, 0x33, 48));
}

async function logoBand() {
  const w = LABEL_WIDTH_DOTS;
  const h = 120;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne logo");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  await paintLogo(ctx, (w - 96) / 2, 12, 96, 96);
  return graphicBand(canvasToBitmap(canvas, false));
}

function barcodeBand(ticket: string) {
  const w = LABEL_WIDTH_DOTS;
  const h = 80;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne strekkode");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  paintBarcode(ctx, ticket, 24, 8, w - 48, 64);
  return graphicBand(canvasToBitmap(canvas, false));
}

async function qrBand(dataUrl: string) {
  const w = LABEL_WIDTH_DOTS;
  const qr = 192;
  const pad = 24;
  const h = qr + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne QR");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  await paintDataUrl(ctx, dataUrl, (w - qr) / 2, pad, qr);
  return graphicBand(canvasToBitmap(canvas, false));
}

function receiptInit() {
  const w = LABEL_WIDTH_DOTS;
  return concat(
    cmd(ESC, 0x40),
    cmd(ESC, 0x7b, 0),
    align(0),
    cmd(GS, 0x4c, 0, 0),
    cmd(GS, 0x57, w & 0xff, (w >> 8) & 0xff),
    cmd(ESC, 0x33, 48),
    selectOem865(),
  );
}

export async function buildWorkshopReceipt(input: WorkshopReceiptInput) {
  const ticket = input.ticket.replace(/[^A-Za-z0-9-]/g, "") || "SD";
  const issued =
    input.issuedAt instanceof Date
      ? input.issuedAt
      : input.issuedAt
        ? new Date(input.issuedAt)
        : new Date();
  const when = Number.isNaN(issued.getTime())
    ? ""
    : issued.toLocaleString("nb-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const tx = (input.transactionId || "").replace(/\s+/g, "");
  const payRows = [
    input.paymentDetail,
    input.cardLast4 && input.cardBrand
      ? `${input.cardBrand} **** ${input.cardLast4}`
      : input.cardLast4
        ? `Kort **** ${input.cardLast4}`
        : null,
    input.authCode ? `Aut ${input.authCode}` : null,
    tx ? `Trans ${tx.slice(-12)}` : null,
    input.paidAt ? `Betalt ${input.paidAt}` : null,
  ].filter((row, i, all): row is string => Boolean(row) && all.indexOf(row) === i);
  const notes = (input.workNotes ?? []).filter(Boolean);
  const footer = input.footer.filter(Boolean);
  const lines = input.lines;
  const parts: Uint8Array[] = [receiptInit(), await logoBand()];

  parts.push(
    align(1),
    wide(true),
    bold(true),
    textLine(clipCols(LEGAL_PARTY.brandName.toUpperCase(), 21)),
    wide(false),
    bold(false),
    textLine(LEGAL_PARTY.legalName),
    textLine(LEGAL_PARTY.address),
    textLine(LEGAL_PARTY.phone),
    textLine(LEGAL_PARTY.email),
    textLine(LEGAL_PARTY.hours),
    blankLines(1),
    ruleLine(),
    blankLines(1),
    bold(true),
    textLine(input.heading),
    bold(false),
  );
  if (when) parts.push(textLine(when));
  parts.push(blankLines(1), barcodeBand(ticket), bold(true), textLine(ticket), bold(false), blankLines(1), ruleLine(), blankLines(1), align(0));

  const kv = (label: string, value?: string | null) => {
    if (!value) return;
    parts.push(pairLine(label, value));
  };
  kv("Kunde", input.customerName || "-");
  kv("Telefon", input.customerPhone);
  kv("E-post", input.customerEmail);
  kv("Adresse", input.customerAddress);
  kv("Enhet", input.device || "-");
  if (input.kind === "repair") {
    kv("IMEI", input.imei);
    kv("Serienr", input.serialNumber);
  } else {
    kv("Ekspeditør", input.cashier);
  }
  parts.push(blankLines(1), ruleLine(), blankLines(1));

  if (input.kind === "repair") {
    parts.push(bold(true), textLine("Reparasjon"), bold(false), blankLines(1));
    kv("Status", input.status);
    kv("Tekniker", input.technician);
    kv("Mottatt", input.receivedAt);
    kv("Ferdig", input.completedAt);
    kv("Inn", input.inbound);
    kv("Ut", input.outbound);
    kv("Garanti", input.warranty);
    if (input.problem) {
      parts.push(blankLines(1), bold(true), textLine("Feil beskrevet"), bold(false), wrapLines(input.problem));
    }
    if (notes.length) {
      parts.push(blankLines(1), bold(true), textLine("Arbeid utført"), bold(false));
      for (const note of notes) parts.push(wrapLines(note));
    }
    parts.push(blankLines(1), ruleLine(), blankLines(1));
  }

  parts.push(bold(true), textLine(input.kind === "repair" ? "Tjenester" : "Kjøp"), bold(false), blankLines(1));
  if (lines.length) {
    for (const line of lines) parts.push(pairLine(line.name, line.amountLabel));
  } else {
    parts.push(textLine("Ingen linjer"));
  }
  parts.push(blankLines(1), ruleLine());
  kv("Sum eks. mva", input.netLabel);
  kv("Mva 25 %", input.vatLabel);
  if (input.vatNote) parts.push(wrapLines(input.vatNote));
  parts.push(blankLines(1), bold(true), pairLine("TOTAL", input.totalLabel), bold(false), blankLines(1), ruleLine(), blankLines(1));
  parts.push(bold(true), textLine("Betaling"), bold(false), blankLines(1), wrapLines(input.paymentLabel || "Betaling"));
  for (const row of payRows) parts.push(wrapLines(row));
  parts.push(blankLines(1), ruleLine(), blankLines(1));

  if (input.statusQr) {
    parts.push(align(1), textLine("Status"), await qrBand(input.statusQr));
    const statusLabel = (input.statusUrl || "").replace(/^https:\/\//, "");
    if (statusLabel) parts.push(align(1), wrapLines(statusLabel));
  }

  parts.push(align(1), blankLines(1), bold(true), textLine(input.thanks), bold(false));
  for (const line of footer) parts.push(wrapLines(line));
  parts.push(blankLines(2), partialCut());
  return concat(...parts);
}
