"use client";

import { buildLockerSticker, type StickerInput } from "@/lib/kiosk/escpos";

type UsbHandle = { kind: "usb"; device: USBDevice; endpoint: number };
type SerialHandle = { kind: "serial"; port: SerialPort; baudRate: number; bluetooth: boolean };
type Handle = UsbHandle | SerialHandle;

export const SERIAL_BAUDS = [9600, 19200, 38400, 115200] as const;

let handle: Handle | null = null;
let lastSerialBaud = 115200;

function usbApi(): USB | null {
  if (typeof navigator === "undefined") return null;
  return navigator.usb ?? null;
}

function serialApi(): Serial | null {
  if (typeof navigator === "undefined") return null;
  return navigator.serial ?? null;
}

function bulkOut(alternate: USBAlternateInterface) {
  return alternate.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
}

function scoreInterface(iface: USBInterface) {
  const alts = iface.alternates?.length ? iface.alternates : [iface.alternate];
  let best = 0;
  for (const alt of alts) {
    if (!bulkOut(alt)) continue;
    if (alt.interfaceClass === 7) best = Math.max(best, 3);
    else if (alt.interfaceClass === 10) best = Math.max(best, 2);
    else best = Math.max(best, 1);
  }
  return best;
}

function printerScore(device: USBDevice) {
  const configs = device.configurations?.length
    ? device.configurations
    : device.configuration
      ? [device.configuration]
      : [];
  let best = 0;
  for (const config of configs) {
    for (const iface of config.interfaces) {
      best = Math.max(best, scoreInterface(iface));
    }
  }
  return best;
}

async function claimUsb(device: USBDevice): Promise<UsbHandle> {
  if (!device.opened) await device.open();
  const configs = device.configurations?.length
    ? device.configurations
    : device.configuration
      ? [device.configuration]
      : [];
  if (!device.configuration && configs[0]) {
    await device.selectConfiguration(configs[0].configurationValue ?? 1);
  }
  const config = device.configuration;
  if (!config) throw new Error("Ingen USB-konfigurasjon");

  const ranked = [...config.interfaces].sort(
    (a, b) => scoreInterface(b) - scoreInterface(a),
  );

  for (const iface of ranked) {
    if (scoreInterface(iface) === 0) continue;
    try {
      if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
    } catch {
      continue;
    }
    const alts = iface.alternates?.length ? iface.alternates : [iface.alternate];
    for (const alt of alts) {
      const endpoint = bulkOut(alt);
      if (endpoint) {
        return { kind: "usb", device, endpoint: endpoint.endpointNumber };
      }
    }
  }
  throw new Error(
    "USB-skriveren er opptatt. Lukk kiosk-OS-skriveren, eller bruk TTY/OTID.",
  );
}

function copyBytes(bytes: Uint8Array) {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out;
}

async function writeUsb(device: USBDevice, endpoint: number, bytes: Uint8Array) {
  const payload = copyBytes(bytes);
  const result = await device.transferOut(endpoint, payload);
  if (result.status && result.status !== "ok") {
    throw new Error(`USB ${result.status}`);
  }
  const written = result.bytesWritten ?? payload.length;
  if (written < payload.length) {
    await writeUsb(device, endpoint, payload.subarray(written));
  }
}

function serialIsOpen(port: SerialPort) {
  return Boolean(port.readable && port.writable);
}

async function writeSerial(port: SerialPort, bytes: Uint8Array) {
  const writable = port.writable;
  if (!writable) throw new Error("Bluetooth-serial er lukket. Koble til Bluetooth på nytt.");
  const writer = writable.getWriter();
  try {
    await writer.write(copyBytes(bytes));
  } finally {
    try {
      writer.releaseLock();
    } catch {
      /* already released */
    }
  }
}

async function writeAll(bytes: Uint8Array) {
  if (!handle) throw new Error("Ingen skriver");
  if (handle.kind === "usb") {
    await writeUsb(handle.device, handle.endpoint, bytes);
    return;
  }
  await writeSerial(handle.port, bytes);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serialFailMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const blob = `${name} ${msg}`.toLowerCase();
  if (/security|not allowed|blocklist|permission/i.test(blob)) {
    return "Chrome serial-blocklist stopper open(). Flagget er borte fra chrome://flags. Start Chrome med: google-chrome --disable-serial-blocklist";
  }
  if (/network|failed to open|open serial/i.test(blob)) {
    return "Bluetooth er valgt, men SPP åpnet ikke. OTID må være Connected i Linux-Bluetooth. Start Chrome med: google-chrome --disable-serial-blocklist";
  }
  if (/already open|invalidstate/i.test(blob)) {
    return msg || "Serial-porten er allerede åpen.";
  }
  return `Klarte ikke åpne Bluetooth-serial${name ? ` (${name})` : ""}: ${msg || "ukjent feil"}`;
}

async function openSerialPort(port: SerialPort, baudRate: number) {
  if (serialIsOpen(port)) return;
  await wait(300);
  if (serialIsOpen(port)) return;
  const bauds = [baudRate, 9600, 115200, 19200].filter((value, i, all) => all.indexOf(value) === i);
  let lastErr: unknown;
  for (const baud of bauds) {
    try {
      await port.open({ baudRate: baud });
      lastSerialBaud = baud;
      return;
    } catch (err) {
      lastErr = err;
      if (serialIsOpen(port)) return;
      const blob = `${err instanceof DOMException ? err.name : ""} ${err instanceof Error ? err.message : ""}`;
      if (/already open|invalidstate/i.test(blob)) return;
      await wait(500);
      if (serialIsOpen(port)) return;
    }
  }
  throw new Error(serialFailMessage(lastErr));
}

async function armSerial(port: SerialPort, baudRate: number): Promise<SerialHandle> {
  await openSerialPort(port, baudRate);
  const next: SerialHandle = {
    kind: "serial",
    port,
    baudRate,
    bluetooth: true,
  };
  handle = next;
  lastSerialBaud = baudRate;
  return next;
}

async function pickGrantedUsb() {
  const api = usbApi();
  if (!api) return null;
  const devices = [...(await api.getDevices())].sort(
    (a, b) => printerScore(b) - printerScore(a),
  );
  for (const device of devices) {
    try {
      return await claimUsb(device);
    } catch {
      try {
        if (device.opened) await device.close();
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function pickOpenSerial() {
  const api = serialApi();
  if (!api) return null;
  for (const port of await api.getPorts()) {
    if (!serialIsOpen(port)) continue;
    return armSerial(port, lastSerialBaud);
  }
  return null;
}

export function printerLinkLabel() {
  if (!handle) return "Ingen skriver";
  if (handle.kind === "usb") return "USB-skriver";
  if (handle.bluetooth) return `Bluetooth ${handle.baudRate}`;
  return `TTY ${handle.baudRate}`;
}

const SPP = 0x1101;
const SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb";
const CUSTOM_RFCOMM = [
  SPP,
  SPP_UUID,
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-43b1-a8be-d42ae65acc3b",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
];

async function pickSerialPort() {
  const api = serialApi();
  if (!api) throw new Error("Denne nettleseren støtter ikke Bluetooth-serial.");
  return api.requestPort({
    allowedBluetoothServiceClassIds: CUSTOM_RFCOMM,
  });
}

export async function connectSerialPrinter(baudRate = lastSerialBaud) {
  if (handle?.kind === "serial" && serialIsOpen(handle.port)) return handle;
  const already = await pickOpenSerial();
  if (already) return already;
  const port = await pickSerialPort();
  try {
    return await armSerial(port, baudRate);
  } catch (err) {
    if (serialIsOpen(port)) return armSerial(port, baudRate);
    throw err instanceof Error ? err : new Error(serialFailMessage(err));
  }
}

export async function connectBluetoothPrinter(baudRate = lastSerialBaud) {
  return connectSerialPrinter(baudRate);
}

export async function connectUsbPrinter() {
  if (handle?.kind === "serial" && serialIsOpen(handle.port)) {
    throw new Error("Bluetooth-serial er allerede åpen. Bruk den, ikke USB.");
  }
  const granted = await pickGrantedUsb();
  if (granted) {
    handle = granted;
    return granted;
  }
  const api = usbApi();
  if (!api) throw new Error("Denne nettleseren støtter ikke WebUSB.");
  const device = await api.requestDevice({ filters: [] });
  const claimed = await claimUsb(device);
  handle = claimed;
  return claimed;
}

export async function setSerialBaud(baudRate: number) {
  lastSerialBaud = baudRate;
  if (handle?.kind === "serial" && serialIsOpen(handle.port)) {
    handle = { ...handle, baudRate };
    return;
  }
  await connectSerialPrinter(baudRate);
}

export async function printUsbSticker(input: StickerInput) {
  if (!usbApi() && !serialApi()) {
    return { ok: false as const, reason: "printer" as const };
  }
  const payload = await buildLockerSticker(input);
  try {
    if (!(handle?.kind === "serial" && serialIsOpen(handle.port))) {
      const open = await pickOpenSerial();
      if (open) handle = open;
      else await connectBluetoothPrinter();
    }
    await writeAll(payload);
    return { ok: true as const };
  } catch {
    try {
      if (handle?.kind === "serial" && serialIsOpen(handle.port)) {
        await writeAll(payload);
        return { ok: true as const };
      }
    } catch {
      /* picker below */
    }
    try {
      await connectBluetoothPrinter();
      await writeAll(payload);
      return { ok: true as const };
    } catch {
      return { ok: false as const, reason: "printer" as const };
    }
  }
}
