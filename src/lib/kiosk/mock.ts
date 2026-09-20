import type { ActivityEvent, LockerBay, RepairRow } from "@/lib/kiosk/types";

export const CUSTOMER_PIN = "123456";
export const ADMIN_PIN = "999999";
export const MOCK_TICKET = "1047";
export const MOCK_DEVICE = "iPhone 13";
export const MOCK_LOCKER: 1 | 2 | 3 | 4 = 3;

export const initialLockers: LockerBay[] = [
  { id: 1, status: "empty" },
  { id: 2, status: "empty" },
  { id: 3, status: "occupied", ticket: MOCK_TICKET },
  { id: 4, status: "empty" },
];

export const initialRepairs: RepairRow[] = [
  { id: "1047", device: "iPhone 13", status: "Klar for henting" },
  { id: "1048", device: "iPhone 11", status: "Under reparasjon" },
];

export const initialActivity: ActivityEvent[] = [
  { id: "a1", time: "20:43", message: "Locker 3 opened" },
  { id: "a2", time: "20:44", message: "Repair #1047 deposited" },
  { id: "a3", time: "20:44", message: "Locker 3 closed" },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function openLocker(_id: number, fail?: boolean) {
  await wait(900);
  if (fail) return { ok: false as const, reason: "locker" as const };
  return { ok: true as const };
}

export async function closeLocker(_id: number, fail?: boolean) {
  await wait(700);
  if (fail) return { ok: false as const, reason: "generic" as const };
  return { ok: true as const };
}

export async function printLabel(fail?: boolean) {
  await wait(1100);
  if (fail) return { ok: false as const, reason: "generic" as const };
  return { ok: true as const };
}

export function verifyPin(pin: string, kind: "customer" | "admin") {
  const expected = kind === "admin" ? ADMIN_PIN : CUSTOMER_PIN;
  return pin === expected;
}

export async function submitRating(stars: number) {
  void stars;
  await wait(350);
  return { ok: true as const };
}

export function nowTime() {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function clockLabel() {
  return new Intl.DateTimeFormat("nb-NO", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
