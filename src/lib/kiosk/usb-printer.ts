"use client";

import { buildLockerSticker, type StickerInput } from "@/lib/kiosk/escpos";

type UsbDevice = USBDevice;

let claimed: UsbDevice | null = null;
let outEndpoint = 1;

function usb(): USB | null {
  if (typeof navigator === "undefined") return null;
  return navigator.usb ?? null;
}

function bulkOut(iface: USBInterface) {
  return iface.alternate.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
}

async function claim(device: UsbDevice) {
  if (!device.opened) await device.open();
  if (device.configuration == null) {
    await device.selectConfiguration(1);
  }
  const config = device.configuration;
  if (!config) throw new Error("Ingen USB-konfigurasjon");

  const ranked = [...config.interfaces].sort((a, b) => {
    const score = (iface: USBInterface) => (bulkOut(iface) ? 1 : 0);
    return score(b) - score(a);
  });

  for (const iface of ranked) {
    if (!iface.claimed) {
      try {
        await device.claimInterface(iface.interfaceNumber);
      } catch {
        continue;
      }
    }
    const endpoint = bulkOut(iface);
    if (endpoint) {
      claimed = device;
      outEndpoint = endpoint.endpointNumber;
      return;
    }
  }
  throw new Error("Fant ingen USB-utgang til skriveren");
}

export async function connectUsbPrinter() {
  const api = usb();
  if (!api) {
    throw new Error("Nettleseren støtter ikke USB-skriver (bruk Chrome).");
  }
  const allowed = await api.getDevices();
  if (allowed[0]) {
    await claim(allowed[0]);
    return allowed[0];
  }
  try {
    const device = await api.requestDevice({
      filters: [
        { classCode: 7 },
        { vendorId: 0x04b8 },
        { vendorId: 0x0519 },
        { vendorId: 0x0416 },
        { vendorId: 0x0483 },
        { vendorId: 0x0fe6 },
        { vendorId: 0x1fc9 },
        { vendorId: 0x28e9 },
        { vendorId: 0x6868 },
        { vendorId: 0x20d1 },
      ],
    });
    await claim(device);
    return device;
  } catch {
    const device = await api.requestDevice({ filters: [] });
    await claim(device);
    return device;
  }
}

export async function printUsbSticker(input: StickerInput) {
  const api = usb();
  if (!api) {
    return { ok: false as const, reason: "generic" as const };
  }
  try {
    if (!claimed || !claimed.opened) {
      const allowed = await api.getDevices();
      if (allowed[0]) await claim(allowed[0]);
      else await connectUsbPrinter();
    }
    if (!claimed) {
      return { ok: false as const, reason: "generic" as const };
    }
    const payload = buildLockerSticker(input);
    const CHUNK = 512;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.subarray(i, i + CHUNK);
      await claimed.transferOut(outEndpoint, slice);
    }
    return { ok: true as const };
  } catch {
    claimed = null;
    return { ok: false as const, reason: "generic" as const };
  }
}
