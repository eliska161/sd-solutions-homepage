import { osloClock, type OsloClock } from "@/lib/dropoff";

export const NEXT_DAY_CUTOFF_HOUR = 18;
export const NEXT_DAY_CUTOFF_MINUTE = 30;
export const NEXT_DAY_CUTOFF_MINUTES =
  NEXT_DAY_CUTOFF_HOUR * 60 + NEXT_DAY_CUTOFF_MINUTE;

const WEEKDAY_NB = [
  "søndag",
  "mandag",
  "tirsdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lørdag",
] as const;

const MONTH_NB = [
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
] as const;

export type NextDayOffer = {
  /** True when an order created now can be delivered today for next-workshop-day finish. */
  active: boolean;
  cutoffAt: Date;
  cutoffClock: OsloClock;
  readyOn: OsloClock;
  readyLabel: string;
  cutoffDayLabel: string;
};

export function isWorkshopWeekday(weekday: number) {
  return weekday >= 1 && weekday <= 6;
}

export function addOsloDays(clock: OsloClock, days: number): OsloClock {
  const utc = Date.UTC(clock.year, clock.month - 1, clock.day + days, 12, 0, 0);
  return osloClock(new Date(utc));
}

export function nextWorkshopDay(from: OsloClock): OsloClock {
  let day = addOsloDays(from, 1);
  while (!isWorkshopWeekday(day.weekday)) {
    day = addOsloDays(day, 1);
  }
  return day;
}

export function formatOsloDateLabel(clock: OsloClock) {
  const weekday = WEEKDAY_NB[clock.weekday] ?? "";
  const name = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : "";
  return `${name} ${clock.day}. ${MONTH_NB[clock.month]}`;
}

/** Instant for a civil Oslo date + clock, including DST. */
export function osloWallTime(
  parts: Pick<OsloClock, "year" | "month" | "day">,
  hour: number,
  minute: number,
  second = 0,
): Date {
  let utc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const shown = osloClock(new Date(utc));
    const shownDay = Date.UTC(shown.year, shown.month - 1, shown.day);
    const wantDay = Date.UTC(parts.year, parts.month - 1, parts.day);
    const shownMin = shown.hour * 60 + shown.minute;
    const wantMin = hour * 60 + minute;
    utc += (wantMin - shownMin) * 60_000 + (wantDay - shownDay);
  }
  const aligned = new Date(utc);
  return aligned;
}

function cutoffOn(day: OsloClock) {
  return osloWallTime(day, NEXT_DAY_CUTOFF_HOUR, NEXT_DAY_CUTOFF_MINUTE, 0);
}

export function isBeforeNextDayCutoff(at: Date = new Date()) {
  const clock = osloClock(at);
  if (!isWorkshopWeekday(clock.weekday)) return false;
  return clock.hour * 60 + clock.minute < NEXT_DAY_CUTOFF_MINUTES;
}

export function nextDayOffer(at: Date = new Date()): NextDayOffer {
  const clock = osloClock(at);
  if (isBeforeNextDayCutoff(at)) {
    const readyOn = nextWorkshopDay(clock);
    return {
      active: true,
      cutoffAt: cutoffOn(clock),
      cutoffClock: clock,
      readyOn,
      readyLabel: formatOsloDateLabel(readyOn),
      cutoffDayLabel: "i dag",
    };
  }
  const nextCutoffDay = nextWorkshopDay(clock);
  const readyOn = nextWorkshopDay(nextCutoffDay);
  return {
    active: false,
    cutoffAt: cutoffOn(nextCutoffDay),
    cutoffClock: nextCutoffDay,
    readyOn,
    readyLabel: formatOsloDateLabel(readyOn),
    cutoffDayLabel: formatOsloDateLabel(nextCutoffDay).toLowerCase(),
  };
}

export function estimatedCompletionAt(at: Date = new Date()): Date | null {
  const offer = nextDayOffer(at);
  if (!offer.active) return null;
  return osloWallTime(offer.readyOn, 12, 0, 0);
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
