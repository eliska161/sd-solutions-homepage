import { osloClock, type OsloClock } from "@/lib/dropoff";

export const WORKSHOP = {
  name: "SD Solutions",
  streetAddress: "Slåttmyrvegen 49",
  postalCode: "2406",
  city: "Elverum",
  hoursLabel: "Mandag-lørdag 12:00-18:00",
} as const;

/** Phone / IVR: same as the workshop door. Sunday closed. */
export const WORKSHOP_PHONE = {
  timezone: "Europe/Oslo",
  openHour: 12,
  closeHour: 18,
} as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function isWorkshopOpenForPhone(
  at: Date = new Date(),
  clock: OsloClock = osloClock(at),
) {
  if (clock.weekday === 0) return false;
  const minutes = clock.hour * 60 + clock.minute;
  return (
    minutes >= WORKSHOP_PHONE.openHour * 60 &&
    minutes < WORKSHOP_PHONE.closeHour * 60
  );
}

export function workshopPhoneHours(at: Date = new Date()) {
  const clock = osloClock(at);
  const open = isWorkshopOpenForPhone(at, clock);
  return {
    Is_open: open,
    open,
    timezone: WORKSHOP_PHONE.timezone,
    hours: WORKSHOP.hoursLabel,
    date: clock.date,
    time: `${pad2(clock.hour)}:${pad2(clock.minute)}`,
    weekday: clock.weekday,
  };
}

export function workshopAddressLines() {
  return [
    WORKSHOP.streetAddress,
    `${WORKSHOP.postalCode} ${WORKSHOP.city}`,
  ] as const;
}

export function workshopAddressOneLine() {
  return `${WORKSHOP.streetAddress}, ${WORKSHOP.postalCode} ${WORKSHOP.city}`;
}
