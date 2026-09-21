"use client";

import { buildLockerSticker, type StickerInput } from "@/lib/kiosk/escpos";

type UsbHandle = { kind: "usb"; device: USBDevice; endpoint: number; packetSize: number };
type SerialHandle = { kind: "serial"; port: SerialPort };
type Handle = UsbHandle | SerialHandle;

let handle: Handle | null = null;

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
  try {
    await device.reset();
  } catch {
    /* not all devices allow reset */
  }
  if (!device.opened) await device.open();
  const configs = device.configurations?.length
    ? device.configurations
    : device.configuration
      ? [device.configuration]
      : [];
  if (!device.configuration) {
    const value = configs[0]?.configurationValue ?? 1;
    await device.selectConfiguration(value);
  }
  const config = device.configuration;
  if (!config) throw new Error("Ingen USB-konfigurasjon");

  const ranked = [...config.interfaces].sort(
    (a, b) => scoreInterface(b) - scoreInterface(a),
  );

  for (const iface of ranked) {
    if (scoreInterface(iface) === 0) continue;
    try {
      await device.selectAlternateInterface(iface.interfaceNumber, 0);
    } catch {
      /* some devices have only the default alternate */
    }
    try {
      if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
    } catch {
      continue;
    }
    const alts = iface.alternates?.length ? iface.alternates : [iface.alternate];
    for (const alt of alts) {
      const endpoint = bulkOut(alt);
      if (endpoint) {
        return {
          kind: "usb",
          device,
          endpoint: endpoint.endpointNumber,
          packetSize: endpoint.packetSize || 64,
        };
      }
    }
  }
  throw new Error("Fant ingen USB-utgang til skriveren");
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

async function pickGrantedUsb() {
  const api = usbApi();
  if (!api) return null;
  const devices = [...(await api.getDevices())].sort(
    (a, b) => printerScore(b) - printerScore(a),
  );
  const preferPrinter = devices.some((device) => printerScore(device) >= 3);
  for (const device of devices) {
    if (preferPrinter && printerScore(device) < 3) continue;
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

async function requestUsb() {
  const api = usbApi();
  if (!api) return null;
  const device = await api.requestDevice({ filters: [] });
  return claimUsb(device);
}

async function openSerial(port: SerialPort, baudRate: number): Promise<SerialHandle> {
  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none", bufferSize: 4096 });
  return { kind: "serial", port };
}

async function pickGrantedSerial() {
  const api = serialApi();
  if (!api) return null;
  const ports = await api.getPorts();
  for (const port of ports) {
    for (const baud of [115200, 9600, 19200]) {
      try {
        return await openSerial(port, baud);
      } catch {
        try {
          await port.close();
        } catch {
          /* ignore */
        }
      }
    }
  }
  return null;
}

async function requestSerial() {
  const api = serialApi();
  if (!api) return null;
  const port = await api.requestPort({ filters: [] });
  for (const baud of [115200, 9600, 19200]) {
    try {
      return await openSerial(port, baud);
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

export async function connectUsbPrinter() {
  await release();
  const grantedUsb = await pickGrantedUsb();
  if (grantedUsb) {
    handle = grantedUsb;
    return;
  }
  const grantedSerial = await pickGrantedSerial();
  if (grantedSerial) {
    handle = grantedSerial;
    return;
  }
  try {
    handle = await requestUsb();
    if (handle) return;
  } catch {
    /* user cancelled USB picker or device is not USB-class */
  }
  handle = await requestSerial();
  if (!handle) {
    throw new Error("Fant ingen skriver. Bruk Chrome og velg USB-skriveren.");
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

export async function printUsbSticker(input: StickerInput) {
  if (!usbApi() && !serialApi()) {
    return { ok: false as const, reason: "printer" as const };
  }
  const payload = buildLockerSticker(input);
  try {
    if (!handle) {
      const granted = (await pickGrantedUsb()) ?? (await pickGrantedSerial());
      if (granted) handle = granted;
      else await connectUsbPrinter();
    }
    await writeAll(payload);
    return { ok: true as const };
  } catch {
    await release();
    try {
      await connectUsbPrinter();
      await writeAll(payload);
      return { ok: true as const };
    } catch {
      await release();
      return { ok: false as const, reason: "printer" as const };
    }
  }
}
