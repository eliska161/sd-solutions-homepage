import type { ActivityEvent, LockerBay, RepairRow } from "@/lib/kiosk/types";

export const CUSTOMER_PIN = "123456";
export const ADMIN_PIN = "999999";
export const MOCK_PHONE = "41234567";
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
  { id: "1047", device: "iPhone 13", status: "Klar for henting", phone: MOCK_PHONE },
  { id: "1048", device: "iPhone 11", status: "Under reparasjon", phone: MOCK_PHONE },
];

export const dropoffRepairs: RepairRow[] = [
  { id: "1049", device: "iPhone 14", status: "Klar for innlevering", phone: MOCK_PHONE },
  { id: "1050", device: "iPad Air", status: "Klar for innlevering", phone: MOCK_PHONE },
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

export async function findDropoffsByPhone(phone: string, fail?: boolean) {
  await wait(450);
  if (fail) return { ok: false as const, reason: "network" as const, repairs: [] };
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("47") && digits.length > 8 ? digits.slice(-8) : digits;
  const repairs = dropoffRepairs.filter((row) => row.phone === normalized);
  return { ok: true as const, repairs };
}

export const KIOSK_DEVICES = [
  "iPhone 16 Pro",
  "iPhone 16",
  "iPhone 15",
  "iPhone 14",
  "iPhone 13",
  "iPhone 12",
  "iPhone SE",
  "Annet",
] as const;

export const KIOSK_ISSUES = [
  "Skjerm",
  "Batteri",
  "Ladeport",
  "Kamera",
  "Vil ikke slå på",
  "Annet",
] as const;

export async function createKioskServiceOrder(input: {
  phone: string;
  device: string;
  issue: string;
  fail?: boolean;
}) {
  await wait(500);
  if (input.fail) return { ok: false as const, reason: "network" as const };
  const n = Math.floor(Math.random() * 100000);
  const id = `REP${String(n).padStart(5, "0")}`;
  const repair: RepairRow = {
    id,
    device: `${input.device} · ${input.issue}`,
    status: "Klar for innlevering",
    phone: input.phone.replace(/\D/g, "").slice(-8),
  };
  return { ok: true as const, repair };
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

export function formatNoMobile(digits: string) {
  const clean = digits.replace(/\D/g, "").slice(0, 8);
  const parts = [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6), clean.slice(6, 8)].filter(
    Boolean,
  );
  return `+47 ${parts.join(" ")}`.trim();
}
