/** ESC/POS bytes for an 80 mm / 203 DPI locker sticker (Font A 12×24, WPC1252). */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const WIDTH = 32;

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

/** Map Unicode to WPC1252 (ESC t 16) for Nordic letters. */
function wpc1252(text: string) {
  const bytes: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 32;
    if (c >= 0x20 && c <= 0x7e) bytes.push(c);
    else if (c === 0x20ac) bytes.push(0x80);
    else if (c === 0x201a) bytes.push(0x82);
    else if (c === 0x201e) bytes.push(0x84);
    else if (c === 0x2026) bytes.push(0x85);
    else if (c === 0x2018) bytes.push(0x91);
    else if (c === 0x2019) bytes.push(0x92);
    else if (c === 0x201c) bytes.push(0x93);
    else if (c === 0x201d) bytes.push(0x94);
    else if (c === 0x2013) bytes.push(0x96);
    else if (c === 0x2014) bytes.push(0x97);
    else if (c === 0xc6 || c === 0xd8 || c === 0xc5 || c === 0xe6 || c === 0xf8 || c === 0xe5) {
      bytes.push(c);
    } else if (c === 0xc4 || c === 0xd6 || c === 0xdc || c === 0xe4 || c === 0xf6 || c === 0xfc) {
      bytes.push(c);
    } else if (c === 0xa0) bytes.push(0x20);
    else bytes.push(0x3f);
  }
  return Uint8Array.from(bytes);
}

function cmd(...bytes: number[]) {
  return Uint8Array.from(bytes);
}

function line(text = "") {
  return concat(wpc1252(text), cmd(LF));
}

function align(n: 0 | 1 | 2) {
  return cmd(ESC, 0x61, n);
}

function emphasis(on: boolean) {
  return cmd(ESC, 0x45, on ? 1 : 0);
}

function size(width: 1 | 2, height: 1 | 2) {
  return cmd(GS, 0x21, ((width - 1) << 4) | (height - 1));
}

function rule() {
  return line("-".repeat(WIDTH));
}

function wrap(text: string, width = WIDTH): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= width) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (word.length <= width) {
      cur = word;
    } else {
      for (let i = 0; i < word.length; i += width) {
        const chunk = word.slice(i, i + width);
        if (chunk.length === width) lines.push(chunk);
        else cur = chunk;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 6);
}

function field(label: string, value: string) {
  const body = value.trim() || "—";
  const first = `${label}: ${body}`;
  if (first.length <= WIDTH) return line(first);
  return concat(line(`${label}:`), ...wrap(body, WIDTH).map((row) => line(row)));
}

function code128(data: string) {
  const payload = `{B${data}`;
  const n = payload.length;
  return concat(
    cmd(GS, 0x68, 80),
    cmd(GS, 0x77, 2),
    cmd(GS, 0x48, 2),
    cmd(GS, 0x66, 0),
    cmd(GS, 0x6b, 73, n),
    wpc1252(payload),
    cmd(LF),
  );
}

function partialCut() {
  return concat(cmd(LF, LF, LF), cmd(GS, 0x56, 66, 3));
}

export type StickerInput = {
  ticket: string;
  device: string;
  phone?: string;
  issue?: string;
  parts?: string[];
  locker?: number | string;
};

export function formatStickerPhone(raw?: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  const eight =
    digits.startsWith("47") && digits.length > 8 ? digits.slice(-8) : digits.slice(-8);
  if (eight.length !== 8) return raw?.trim() || "";
  return `+47 ${eight.slice(0, 2)} ${eight.slice(2, 4)} ${eight.slice(4, 6)} ${eight.slice(6, 8)}`;
}

export function buildLockerSticker(input: StickerInput) {
  const ticket = input.ticket.replace(/[^A-Za-z0-9-]/g, "") || "SD";
  const device = input.device.trim();
  const issue = (input.issue ?? "").trim();
  const phone = formatStickerPhone(input.phone);
  const parts = (input.parts ?? []).map((row) => row.trim()).filter(Boolean);
  const locker = input.locker != null ? String(input.locker) : "";

  return concat(
    cmd(ESC, 0x40),
    cmd(ESC, 0x74, 16),
    cmd(ESC, 0x33, 28),
    align(1),
    size(2, 2),
    emphasis(true),
    line("SD SOLUTIONS"),
    size(1, 1),
    emphasis(false),
    line("LOCKER"),
    cmd(LF),
    code128(ticket),
    size(2, 2),
    emphasis(true),
    line(ticket),
    size(1, 1),
    emphasis(false),
    rule(),
    align(0),
    field("Kunde", phone),
    field("Enhet", device),
    field("Feil", issue),
    locker ? field("Luke", locker) : cmd(),
    rule(),
    emphasis(true),
    line("DELER"),
    emphasis(false),
    ...(parts.length
      ? parts.flatMap((row) => wrap(row, WIDTH).map((chunk) => line(chunk)))
      : [line("Ikke valgt ennå")]),
    rule(),
    align(1),
    line("Fest på konvolutten"),
    partialCut(),
  );
}
