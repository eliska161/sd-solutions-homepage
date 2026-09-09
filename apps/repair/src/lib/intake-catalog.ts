/** Intake mottakskontroll catalog — shared by admin UI and server validation. */

export const INTAKE_PHYSICAL_ZONES = [
  { key: "front", label: "Forside" },
  { key: "back", label: "Bakside" },
  { key: "left", label: "Venstre side" },
  { key: "right", label: "Høyre side" },
  { key: "top", label: "Topp" },
  { key: "bottom", label: "Bunn" },
  { key: "screen", label: "Skjerm" },
  { key: "frame", label: "Ramme" },
  { key: "back_glass", label: "Bakglass" },
  { key: "camera", label: "Kameraområde" },
] as const;

export type IntakeZoneKey = (typeof INTAKE_PHYSICAL_ZONES)[number]["key"];

export const INTAKE_CHECKLIST = [
  { key: "photos_taken", label: "Bilder tatt" },
  { key: "physical_condition", label: "Fysisk tilstand registrert" },
  { key: "damage_documented", label: "Skader registrert" },
  { key: "screen", label: "Skjerm kontrollert" },
  { key: "touch", label: "Touch kontrollert" },
  { key: "camera", label: "Kamera kontrollert" },
  { key: "biometrics", label: "Face ID / biometri kontrollert" },
  { key: "speaker", label: "Høyttaler kontrollert" },
  { key: "microphone", label: "Mikrofon kontrollert" },
  { key: "charging", label: "Lading kontrollert" },
  { key: "buttons", label: "Knapper kontrollert" },
  { key: "wireless_charging", label: "Trådløs lading kontrollert" },
  { key: "other", label: "Annet registrert" },
] as const;

export type IntakeCheckKey = (typeof INTAKE_CHECKLIST)[number]["key"];

/** Extra receive checks for flip phones (plus shared INTAKE_CHECKLIST). */
export const FLIP_INTAKE_EXTRA_CHECKS = [
  { key: "matches_listing", label: "Stemmer med annonse / beskrivelse" },
  { key: "activation_lock", label: "Activation Lock / Find My sjekket" },
  { key: "package_contents", label: "Innhold / tilbehør sjekket" },
  { key: "imei_serial_recorded", label: "IMEI / serienummer registrert" },
  { key: "battery_health_recorded", label: "Batterihelse registrert" },
] as const;

export const FLIP_INTAKE_CHECKLIST = [
  ...INTAKE_CHECKLIST,
  ...FLIP_INTAKE_EXTRA_CHECKS,
] as const;

export const INTAKE_PHOTO_CATEGORIES = [
  { key: "INTAKE_FRONT", label: "Forside" },
  { key: "INTAKE_BACK", label: "Bakside" },
  { key: "INTAKE_LEFT", label: "Venstre side" },
  { key: "INTAKE_RIGHT", label: "Høyre side" },
  { key: "INTAKE_TOP", label: "Topp" },
  { key: "INTAKE_BOTTOM", label: "Bunn" },
  { key: "DAMAGE", label: "Skade (nærbilde)" },
  { key: "SERIAL_NUMBER", label: "Serienummer / IMEI" },
  { key: "OTHER", label: "Annet" },
] as const;

/** Customer-facing progress steps (ordered). */
export const CUSTOMER_PROGRESS_STEPS = [
  { key: "RECEIVED", label: "Mottatt", statuses: ["NEW"] },
  {
    key: "DIAGNOSTICS",
    label: "Diagnostikk",
    statuses: ["DIAGNOSTICS"],
  },
  {
    key: "WAITING",
    label: "Venter på del / kunde",
    statuses: ["WAITING_FOR_PART", "WAITING_FOR_CUSTOMER", "APPROVED"],
  },
  { key: "IN_REPAIR", label: "Under reparasjon", statuses: ["IN_REPAIR"] },
  { key: "TESTING", label: "Testing", statuses: ["TESTING"] },
  {
    key: "READY",
    label: "Klar for henting",
    statuses: ["READY_FOR_PICKUP", "COMPLETED"],
  },
] as const;
