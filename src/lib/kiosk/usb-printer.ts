"use client";

import { buildLockerSticker, type StickerInput } from "@/lib/kiosk/escpos";

type UsbHandle = { kind: "usb"; device: USBDevice; endpoint: number };
type SerialHandle = { kind: "serial"; port: SerialPort; baudRate: number };
type Handle = UsbHandle | SerialHandle;

export const SERIAL_BAUDS = [9600, 19200, 38400, 115200] as const;

let handle: Handle | null = null;
let lastSerialBaud = 115200;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function release() {
  const current = handle;
  handle = null;
  if (!current) return;
  try {
    if (current.kind === "usb" && current.device.opened) await current.device.close();
    if (current.kind === "serial") await current.port.close();
  } catch {
    /* already gone */
  }
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

async function writeSerial(port: SerialPort, bytes: Uint8Array) {
  const writable = port.writable;
  if (!writable) throw new Error("Serieporten kan ikke skrive");
  const writer = writable.getWriter();
  try {
    await writer.write(copyBytes(bytes));
  } finally {
    writer.releaseLock();
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

async function armSerial(port: SerialPort, baudRate: number): Promise<SerialHandle> {
  try {
    await port.close();
  } catch {
    /* was not open */
  }
  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    bufferSize: 65536,
    flowControl: "none",
  });
  try {
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });
  } catch {
    /* some adapters have no control lines */
  }
  await wait(120);
  const next: SerialHandle = { kind: "serial", port, baudRate };
  handle = next;
  lastSerialBaud = baudRate;
  await writeSerial(port, Uint8Array.from([0x1b, 0x40]));
  await wait(80);
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

async function pickGrantedSerial(baudRate = lastSerialBaud) {
  const api = serialApi();
  if (!api) return null;
  const ports = await api.getPorts();
  for (const port of ports) {
    try {
      return await armSerial(port, baudRate);
    } catch {
      try {
        await port.close();
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export function printerLinkLabel() {
  if (!handle) return "Ingen skriver";
  if (handle.kind === "usb") return "USB-skriver";
  return `TTY ${handle.baudRate}`;
}

export async function connectSerialPrinter(baudRate = lastSerialBaud) {
  await release();
  const granted = await pickGrantedSerial(baudRate);
  if (granted) return granted;
  const api = serialApi();
  if (!api) throw new Error("Denne nettleseren støtter ikke serieport.");
  const port = await api.requestPort({ filters: [] });
  return armSerial(port, baudRate);
}

export async function connectUsbPrinter() {
  await release();
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
  if (handle?.kind === "serial") {
    await armSerial(handle.port, baudRate);
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
    if (!handle) {
      const granted = (await pickGrantedSerial()) ?? (await pickGrantedUsb());
      if (granted) handle = granted;
      else await connectSerialPrinter();
    }
    await writeAll(payload);
    return { ok: true as const };
  } catch {
    try {
      if (handle?.kind === "serial") {
        await armSerial(handle.port, lastSerialBaud);
        await writeAll(payload);
        return { ok: true as const };
      }
    } catch {
      /* reopen below */
    }
    await release();
    try {
      await connectSerialPrinter();
      await writeAll(payload);
      return { ok: true as const };
    } catch {
      await release();
      return { ok: false as const, reason: "printer" as const };
    }
  }
}
