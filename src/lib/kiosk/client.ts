import type { RepairRow } from "@/lib/kiosk/types";

export type KioskLookupResult =
  | { ok: true; repairs: RepairRow[] }
  | { ok: false; error: string };

export async function lookupLiveDropoffs(query: string): Promise<KioskLookupResult> {
  try {
    const res = await fetch("/api/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lookup", q: query }),
      cache: "no-store",
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!data?.ok) return { ok: false, error: data?.error || "Kunne ikke hente saker" };
      return { ok: true, repairs: data.repairs ?? [] };
    } catch {
      return { ok: false, error: "Kunne ikke hente saker" };
    }
  } catch {
    return { ok: false, error: "Ingen nettverk" };
  }
}

export async function lookupLiveDevice(query: string): Promise<
  | { ok: true; model: string | null; imei: string | null; serialNumber: string | null; note: string }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "device", q: query }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!data?.ok) return { ok: false, error: data?.error || "Kunne ikke hente modell" };
    return {
      ok: true,
      model: data.model ?? null,
      imei: data.imei ?? null,
      serialNumber: data.serialNumber ?? null,
      note: data.note ?? "",
    };
  } catch {
    return { ok: false, error: "Ingen nettverk" };
  }
}

export async function createLiveLockerOrder(input: {
  phone: string;
  device: string;
  issue: string;
  comment?: string;
  imei?: string | null;
  serialNumber?: string | null;
  termsAccepted?: boolean;
  termsVersion?: string;
  signaturePng?: string | null;
  termsSignerName?: string;
}): Promise<{ ok: true; repair: RepairRow } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...input }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!data?.ok) return { ok: false, error: data?.error || "Kunne ikke opprette" };
    return { ok: true, repair: data.repair };
  } catch {
    return { ok: false, error: "Ingen nettverk" };
  }
}

export async function lookupLivePickup(pin: string): Promise<
  | { ok: true; repair: RepairRow }
  | { ok: false; error: string; notfound?: boolean }
> {
  try {
    const res = await fetch("/api/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pickup", pin }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (data?.ok && data.repair) return { ok: true, repair: data.repair };
    if (res.status === 404) {
      return { ok: false, error: data?.error || "Ugyldig PIN", notfound: true };
    }
    return { ok: false, error: data?.error || "Kunne ikke hente sak" };
  } catch {
    return { ok: false, error: "Ingen nettverk" };
  }
}
export async function receiveLiveTicket(ticketNumber: string) {
  try {
    await fetch("/api/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive", ticketNumber }),
      cache: "no-store",
    });
  } catch {
    /* locker hardware flow continues */
  }
}

export async function fetchKioskBoard(): Promise<{
  dropoffs: RepairRow[];
  pickups: RepairRow[];
}> {
  try {
    const res = await fetch("/api/kiosk", { cache: "no-store" });
    const data = await res.json();
    return {
      dropoffs: data.dropoffs ?? [],
      pickups: data.pickups ?? [],
    };
  } catch {
    return { dropoffs: [], pickups: [] };
  }
}
