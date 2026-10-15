"use client";

import { buildLockerSticker, buildLockerReceipt, type StickerInput, type ReceiptPrintInput } from "@/lib/kiosk/escpos";

type UsbHandle = { kind: "usb"; device: USBDevice; endpoint: number };
type SerialHandle = { kind: "serial"; port: SerialPort; baudRate: number; bluetooth: boolean };
type Handle = UsbHandle | SerialHandle;

/** STMicroelectronics USB ID used by POS80 / POS-8360-L. */
export const STM_VENDOR_ID = 0x0483;
const STM_ENDPOINTS = [1, 2] as const;

export const USB_SERIAL_BAUD = 115200;
export const BT_SERIAL_BAUD = 9600;
export const SERIAL_BAUDS = [115200, 9600, 19200, 38400] as const;

let handle: Handle | null = null;
let lastSerialBaud = USB_SERIAL_BAUD;

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

async function transferOutChunked(device: USBDevice, endpoint: number, bytes: Uint8Array) {
  const payload = copyBytes(bytes);
  const chunk = 4096;
  for (let i = 0; i < payload.length; i += chunk) {
    const slice = payload.subarray(i, i + chunk);
    const result = await device.transferOut(endpoint, slice);
    if (result.status && result.status !== "ok") {
      throw new Error(`USB ${result.status}`);
    }
    const written = result.bytesWritten ?? slice.length;
    if (written < slice.length) {
      await transferOutChunked(device, endpoint, slice.subarray(written));
    }
  }
}

async function writeUsb(device: USBDevice, endpoint: number, bytes: Uint8Array) {
  const order = [endpoint, ...STM_ENDPOINTS.filter((n) => n !== endpoint)];
  let lastErr: unknown;
  for (const ep of order) {
    try {
      await transferOutChunked(device, ep, bytes);
      if (handle?.kind === "usb") handle = { ...handle, endpoint: ep };
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("USB transferOut feilet på endepunkt 1 og 2.");
}

async function claimStmPrinter(device: USBDevice): Promise<UsbHandle> {
  if (!device.opened) await device.open();
  try {
    await device.selectConfiguration(1);
  } catch {
    /* already selected */
  }
  try {
    await device.claimInterface(0);
    return { kind: "usb", device, endpoint: 1 };
  } catch {
    return claimUsb(device);
  }
}

function serialIsOpen(port: SerialPort) {
  return Boolean(port.readable && port.writable);
}

async function writeSerial(port: SerialPort, bytes: Uint8Array) {
  const writable = port.writable;
  if (!writable) throw new Error("USB-serial er lukket. Koble til USB på nytt.");
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

function serialFailMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const blob = `${name} ${msg}`.toLowerCase();
  if (/security|not allowed|blocklist|permission/i.test(blob)) {
    return "Chrome blocklist. Lukk Chrome og start: google-chrome --disable-serial-blocklist — så Koble til USB og velg POS-8360-L.";
  }
  if (/network|failed to open|open serial/i.test(blob)) {
    return "USB-serial åpnet ikke. Start Chrome med --disable-serial-blocklist og velg POS-8360-L i serial-listen.";
  }
  if (/already open|invalidstate/i.test(blob)) {
    return msg || "Serial-porten er allerede åpen.";
  }
  return `Klarte ikke åpne serial${name ? ` (${name})` : ""}: ${msg || "ukjent feil"}`;
}

function isBluetoothSerial(port: SerialPort) {
  try {
    return Boolean(port.getInfo?.().bluetoothServiceClassId);
  } catch {
    return false;
  }
}

function serialOpenOptions(baudRate: number) {
  return {
    baudRate,
    dataBits: 8 as const,
    stopBits: 1 as const,
    parity: "none" as const,
    flowControl: "none" as const,
    bufferSize: 16_384,
  };
}

function baudForPort(port: SerialPort, requested: number) {
  if (isBluetoothSerial(port)) {
    return requested === USB_SERIAL_BAUD ? BT_SERIAL_BAUD : requested;
  }
  return requested || USB_SERIAL_BAUD;
}

async function openSerialPort(port: SerialPort, baudRate: number) {
  if (serialIsOpen(port)) return;
  const baud = baudForPort(port, baudRate);
  try {
    await port.open(serialOpenOptions(baud));
  } catch (err) {
    if (serialIsOpen(port)) return;
    const blob = `${err instanceof DOMException ? err.name : ""} ${err instanceof Error ? err.message : ""}`;
    if (/already open|invalidstate/i.test(blob)) return;
    throw new Error(serialFailMessage(err));
  }
  lastSerialBaud = baud;
}

async function armSerial(port: SerialPort, baudRate: number): Promise<SerialHandle> {
  await openSerialPort(port, baudRate);
  const next: SerialHandle = {
    kind: "serial",
    port,
    baudRate: lastSerialBaud || baudRate,
    bluetooth: isBluetoothSerial(port),
  };
  handle = next;
  return next;
}

async function pickGrantedUsb() {
  const api = usbApi();
  if (!api) return null;
  const devices = [...(await api.getDevices())].sort((a, b) => {
    const stm = Number(b.vendorId === STM_VENDOR_ID) - Number(a.vendorId === STM_VENDOR_ID);
    if (stm) return stm;
    return printerScore(b) - printerScore(a);
  });
  for (const device of devices) {
    try {
      return await claimStmPrinter(device);
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
  if (handle.kind === "usb") {
    const name = handle.device.productName || handle.device.manufacturerName || "STMicroelectronics POS80";
    return `WebUSB ${name}`;
  }
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
  if (!api) throw new Error("Denne nettleseren støtter ikke serial.");
  return api.requestPort({
    filters: [],
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
  if (handle?.kind === "usb" && handle.device.opened) return handle;
  handle = null;
  const granted = await pickGrantedUsb();
  if (granted) {
    handle = granted;
    return granted;
  }
  const api = usbApi();
  if (!api) throw new Error("Chrome WebUSB kreves. Åpne i Chrome og koble til USB.");
  let device: USBDevice;
  try {
    device = await api.requestDevice({
      filters: [{ vendorId: STM_VENDOR_ID }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    if (/not found|no device|chooser/i.test(msg)) {
      throw new Error("Ingen STMicroelectronics POS80 (0x0483) valgt. Koble til USB og velg den i listen.");
    }
    throw err instanceof Error ? err : new Error(msg || "WebUSB avbrutt");
  }
  const claimed = await claimStmPrinter(device);
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

async function ensurePrinter() {
  if (handle?.kind === "usb" && handle.device.opened) return;
  if (handle?.kind === "serial" && serialIsOpen(handle.port)) return;
  try {
    await connectUsbPrinter();
  } catch {
    await connectSerialPrinter();
  }
}

export async function printUsbReceipt(input: ReceiptPrintInput) {
  if (!usbApi() && !serialApi()) {
    return { ok: false as const, reason: "printer" as const };
  }
  const payload = await buildLockerReceipt(input);
  try {
    await ensurePrinter();
    await writeAll(payload);
    return { ok: true as const };
  } catch {
    try {
      await connectUsbPrinter();
      await writeAll(payload);
      return { ok: true as const };
    } catch {
      return { ok: false as const, reason: "printer" as const };
    }
  }
}

export async function printUsbSticker(input: StickerInput) {
  if (!usbApi() && !serialApi()) {
    return { ok: false as const, reason: "printer" as const };
  }
  const payload = await buildLockerSticker(input);
  try {
    await ensurePrinter();
    await writeAll(payload);
    return { ok: true as const };
  } catch {
    try {
      await connectUsbPrinter();
      await writeAll(payload);
      return { ok: true as const };
    } catch {
      return { ok: false as const, reason: "printer" as const };
    }
  }
}
