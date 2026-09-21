import type { ActivityEvent, LockerBay, RepairRow } from "@/lib/kiosk/types";

export const CUSTOMER_PIN = "123456";
export const ADMIN_PIN = "999999";
export const MOCK_PHONE = "41234567";
export const MOCK_TICKET = "REP10471";
export const MOCK_DEVICE = "iPhone 13";
export const MOCK_LOCKER: 1 | 2 | 3 | 4 = 3;

export const initialLockers: LockerBay[] = [
  { id: 1, status: "empty" },
  { id: 2, status: "empty" },
  { id: 3, status: "occupied", ticket: MOCK_TICKET },
  { id: 4, status: "empty" },
];

export const initialRepairs: RepairRow[] = [
  {
    id: "REP10471",
    device: "iPhone 13 128GB",
    status: "Klar for henting",
    phone: MOCK_PHONE,
    issue: "Skjerm",
    parts: ["Skjerm (Aftermarket)"],
  },
  {
    id: "REP10482",
    device: "iPhone 11",
    status: "Under reparasjon",
    phone: MOCK_PHONE,
    issue: "Batteri",
    parts: ["Batteri (OEM Pull)"],
  },
];

export const dropoffRepairs: RepairRow[] = [
  {
    id: "REP10493",
    device: "iPhone 14",
    status: "Klar for innlevering",
    phone: MOCK_PHONE,
    issue: "Skjerm",
    parts: ["Skjerm (Aftermarket)"],
    serial: "F2LX1234Q6L7",
  },
  {
    id: "REP10504",
    device: "iPad Air",
    status: "Klar for innlevering",
    phone: MOCK_PHONE,
    issue: "Ladeport",
    parts: ["Ladeport (Original service pack)"],
  },
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

export const SAMPLE_STICKER = {
  ticket: MOCK_TICKET,
  device: MOCK_DEVICE,
  phone: MOCK_PHONE,
  issue: "Skjerm",
  parts: ["Skjerm (Aftermarket)", "Batteri (OEM Pull)"],
  locker: MOCK_LOCKER,
};

export async function printLabel(
  input:
    | {
        ticket: string;
        device: string;
        phone?: string;
        issue?: string;
        parts?: string[];
        locker?: number;
      }
    | boolean = SAMPLE_STICKER,
  fail?: boolean,
) {
  const demoFail = typeof input === "boolean" ? input : fail;
  if (demoFail) {
    await wait(400);
    return { ok: false as const, reason: "generic" as const };
  }
  const payload =
    typeof input === "boolean"
      ? SAMPLE_STICKER
      : {
          ticket: input.ticket,
          device: input.device,
          phone: input.phone ?? MOCK_PHONE,
          issue: input.issue ?? "",
          parts: input.parts ?? [],
          locker: input.locker ?? MOCK_LOCKER,
        };

  if (typeof window !== "undefined") {
    const { printUsbSticker } = await import("@/lib/kiosk/usb-printer");
    return printUsbSticker(payload);
  }
  await wait(400);
  return { ok: true as const };
}

export async function findDropoffsByPhone(query: string, fail?: boolean) {
  await wait(450);
  if (fail) return { ok: false as const, reason: "network" as const, repairs: [] };
  const compact = query.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const digits = query.replace(/\D/g, "");
  const phone =
    digits.startsWith("47") && digits.length > 8 ? digits.slice(-8) : digits.slice(-8);
  const repairs = dropoffRepairs.filter((row) => {
    if (phone.length === 8 && row.phone === phone) return true;
    const serial = row.serial?.toUpperCase();
    return Boolean(serial && serial === compact);
  });
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
  comment?: string;
  imei?: string | null;
  serialNumber?: string | null;
  fail?: boolean;
}) {
  await wait(500);
  if (input.fail) return { ok: false as const, reason: "network" as const };
  const n = Math.floor(Math.random() * 100000);
  const id = `REP${String(n).padStart(5, "0")}`;
  const issue = input.comment?.trim()
    ? `${input.issue}. ${input.comment.trim()}`
    : input.issue;
  const repair: RepairRow = {
    id,
    device: input.device,
    status: "Klar for innlevering",
    phone: input.phone.replace(/\D/g, "").slice(-8),
    issue,
    parts: [],
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
