import type { RepairRow } from "@/lib/kiosk/types";

export type KioskLookupResult =
  | { ok: true; repairs: RepairRow[] }
  | { ok: false; error: string };

export async function lookupLiveDropoffs(phone: string): Promise<KioskLookupResult> {
  try {
    const res = await fetch("/api/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lookup", phone }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!data?.ok) return { ok: false, error: data?.error || "Kunne ikke hente saker" };
    return { ok: true, repairs: data.repairs ?? [] };
  } catch {
    return { ok: false, error: "Ingen nettverk" };
  }
}

export async function createLiveLockerOrder(input: {
  phone: string;
  device: string;
  issue: string;
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
