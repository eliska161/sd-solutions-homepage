export const DROPOFF_TIME_ZONE = "Europe/Oslo";

/** One-hour windows while the workshop is open 12:00–18:00. */
export const DROPOFF_SLOTS = [
  "12:00–13:00",
  "13:00–14:00",
  "14:00–15:00",
  "15:00–16:00",
  "16:00–17:00",
  "17:00–18:00",
] as const;

export type DropoffSlot = (typeof DROPOFF_SLOTS)[number];

export type OsloClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  date: string;
};

const WEEKDAY_NB = [
  "søndag",
  "mandag",
  "tirsdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lørdag",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function isDropoffSlot(value: string): value is DropoffSlot {
  return (DROPOFF_SLOTS as readonly string[]).includes(value);
}

export function osloClock(at: Date = new Date()): OsloClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DROPOFF_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekdayName = get("weekday");
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  return {
    year,
    month,
    day,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdayMap[weekdayName] ?? 0,
    date: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

export function isOpenDropoffDate(date: string, clock = osloClock()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const weekday = weekdayOfDate(date);
  if (weekday == null || weekday === 0) return false;
  return date >= clock.date;
}

function weekdayOfDate(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcNoon = Date.UTC(year, month - 1, day, 12, 0, 0);
  return osloClock(new Date(utcNoon)).weekday;
}

function slotEndMinutes(slot: string) {
  const match = /^(\d{2}):(\d{2})–(\d{2}):(\d{2})$/.exec(slot);
  if (!match) return null;
  return Number(match[3]) * 60 + Number(match[4]);
}

export function isDropoffSlotOpen(
  date: string,
  slot: string,
  clock = osloClock(),
) {
  if (!isDropoffSlot(slot)) return false;
  if (!isOpenDropoffDate(date, clock)) return false;
  if (date > clock.date) return true;
  const end = slotEndMinutes(slot);
  if (end == null) return false;
  return clock.hour * 60 + clock.minute < end;
}

export function listDropoffDates(daysAhead = 21, clock = osloClock()) {
  const dates: { value: string; label: string }[] = [];
  const start = Date.UTC(clock.year, clock.month - 1, clock.day, 12, 0, 0);
  for (let i = 0; i < daysAhead + 8 && dates.length < daysAhead; i++) {
    const d = new Date(start + i * 24 * 60 * 60 * 1000);
    const parts = osloClock(d);
    if (parts.weekday === 0) continue;
    if (parts.date < clock.date) continue;
    const openSlots = DROPOFF_SLOTS.filter((slot) =>
      isDropoffSlotOpen(parts.date, slot, clock),
    );
    if (openSlots.length === 0) continue;
    const weekday = WEEKDAY_NB[parts.weekday] ?? "";
    dates.push({
      value: parts.date,
      label: `${capitalize(weekday)} ${parts.day}. ${monthNb(parts.month)}`,
    });
  }
  return dates;
}

export function listOpenSlotsForDate(date: string, clock = osloClock()) {
  return DROPOFF_SLOTS.filter((slot) => isDropoffSlotOpen(date, slot, clock));
}

export function formatDropoffAppointment(date: string, slot: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return `${date} · ${slot}`;
  const weekday = weekdayOfDate(date);
  const day = Number(match[3]);
  const month = Number(match[2]);
  const name = weekday != null ? WEEKDAY_NB[weekday] : "";
  return `${capitalize(name)} ${day}. ${monthNb(month)} · ${slot}`;
}

function monthNb(month: number) {
  return [
    "",
    "januar",
    "februar",
    "mars",
    "april",
    "mai",
    "juni",
    "juli",
    "august",
    "september",
    "oktober",
    "november",
    "desember",
  ][month] ?? "";
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
