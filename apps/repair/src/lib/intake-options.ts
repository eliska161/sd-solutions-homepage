/** Intake catalogs: grades, cosmetic faults, repair faults. */

export type CatalogOption = {
  key: string;
  label: string;
  group?: string;
};

/** Overall condition grade — pick one first. */
export const CONDITION_GRADES: CatalogOption[] = [
  { key: "cond_mint", label: "Som ny" },
  { key: "cond_good", label: "God" },
  { key: "cond_fair", label: "Bruksspor" },
  { key: "cond_poor", label: "Sterkt slitt / skadet" },
];

/** Cosmetic faults — add as many as needed. */
export const COSMETIC_FAULTS: CatalogOption[] = [
  { key: "front_clean", label: "Forside: Ren / uten synlige riper", group: "Forside" },
  { key: "front_micro", label: "Forside: Mikroriper", group: "Forside" },
  { key: "front_deep", label: "Forside: Dype riper", group: "Forside" },
  { key: "front_crack", label: "Forside: Sprekk / knust", group: "Forside" },
  { key: "back_clean", label: "Bakside: Uten skader", group: "Bakside" },
  { key: "back_scuff", label: "Bakside: Skraper", group: "Bakside" },
  { key: "back_crack", label: "Bakside: Sprekk / knust", group: "Bakside" },
  { key: "frame_ok", label: "Ramme: OK", group: "Ramme" },
  { key: "frame_dent", label: "Ramme: Bulker", group: "Ramme" },
  { key: "frame_bend", label: "Ramme: Bøyd", group: "Ramme" },
  { key: "frame_chip", label: "Ramme: Hakk / flis", group: "Ramme" },
  { key: "ports_ok", label: "Porter/knapper: OK", group: "Porter" },
  { key: "ports_dirty", label: "Porter/knapper: Skitt / støv", group: "Porter" },
  { key: "ports_damage", label: "Porter/knapper: Synlig skade", group: "Porter" },
];

/** Repair faults to fix — add as many as needed at intake (internal). */
export const REPAIR_FAULTS: CatalogOption[] = [
  // Knust glass = always full screen assembly replacement (no glass-only jobs).
  {
    key: "screen_cracked_glass",
    label: "Skjerm: Knust / sprekk (skjermbytte)",
    group: "Skjerm",
  },
  {
    key: "screen_cracked_lcd",
    label: "Skjerm: LCD/OLED skadet (skjermbytte)",
    group: "Skjerm",
  },
  { key: "screen_cracked_touch", label: "Skjerm: Touch feiler", group: "Skjerm" },
  { key: "screen_flicker", label: "Skjerm: Flimrer", group: "Skjerm" },
  { key: "screen_lines", label: "Skjerm: Streker / flekker", group: "Skjerm" },
  { key: "screen_black", label: "Skjerm: Svart skjerm", group: "Skjerm" },
  { key: "battery_drain", label: "Batteri: Tømmes raskt", group: "Batteri" },
  { key: "battery_swollen", label: "Batteri: Oppsvulmet", group: "Batteri" },
  { key: "battery_health_low", label: "Batteri: Lav batterihelse", group: "Batteri" },
  { key: "charge_port", label: "Lading: Ladeport", group: "Lading" },
  { key: "charge_wireless", label: "Lading: Trådløs", group: "Lading" },
  { key: "charge_intermittent", label: "Lading: Av og til", group: "Lading" },
  { key: "camera_rear_blur", label: "Bakamera: Uskarpt / flekk", group: "Kamera" },
  { key: "camera_rear_crash", label: "Bakamera: App kræsjer", group: "Kamera" },
  { key: "camera_rear_broken", label: "Bakamera: Linse/glass knust", group: "Kamera" },
  { key: "camera_front_blur", label: "Frontkamera: Uskarpt", group: "Kamera" },
  { key: "camera_front_fail", label: "Frontkamera: Fungerer ikke", group: "Kamera" },
  { key: "speaker_weak", label: "Høyttaler: Svak lyd", group: "Lyd" },
  { key: "speaker_distort", label: "Høyttaler: Forvrengt", group: "Lyd" },
  { key: "speaker_dead", label: "Høyttaler: Ingen lyd", group: "Lyd" },
  { key: "mic_call", label: "Mikrofon: Samtale", group: "Lyd" },
  { key: "mic_video", label: "Mikrofon: Video / Siri", group: "Lyd" },
  { key: "btn_power", label: "Knapp: Av/på", group: "Knapper" },
  { key: "btn_volume", label: "Knapp: Volum", group: "Knapper" },
  { key: "btn_mute", label: "Knapp: Mute", group: "Knapper" },
  { key: "face_id_fail", label: "Face ID feiler", group: "Biometri" },
  { key: "touch_id_fail", label: "Touch ID feiler", group: "Biometri" },
  { key: "liquid_recent", label: "Væskeskade (nylig)", group: "Skade" },
  { key: "liquid_unknown", label: "Væskeskade (ukjent omfang)", group: "Skade" },
  { key: "drop_frame", label: "Fallskade: Ramme / chassis", group: "Skade" },
  { key: "drop_internal", label: "Fallskade: Mulig intern skade", group: "Skade" },
  { key: "sw_boot", label: "Programvare: Starter ikke", group: "Programvare" },
  { key: "sw_slow", label: "Programvare: Treg / henger", group: "Programvare" },
  { key: "sw_update", label: "Programvare: Etter oppdatering", group: "Programvare" },
  { key: "other_custom", label: "Annet (se kommentar)", group: "Annet" },
];

export function labelForOption(
  options: CatalogOption[],
  key: string,
): string {
  return options.find((o) => o.key === key)?.label ?? key;
}

export function formatConditionSummary(
  gradeKey: string,
  faultKeys: string[],
  comment?: string | null,
): string {
  const grade = labelForOption(CONDITION_GRADES, gradeKey);
  const lines = [`Karakter: ${grade}`];
  const faults = faultKeys
    .map((k) => labelForOption(COSMETIC_FAULTS, k))
    .filter(Boolean);
  if (faults.length) {
    lines.push("Kosmetiske feil:");
    for (const f of faults) lines.push(`- ${f}`);
  }
  const note = comment?.trim();
  if (note) lines.push(`Kommentar: ${note}`);
  return lines.join("\n");
}

export function formatProblemSummary(
  faultKeys: string[],
  comment?: string | null,
): string {
  const faults = faultKeys
    .map((k) => labelForOption(REPAIR_FAULTS, k))
    .filter(Boolean);
  const lines: string[] = [];
  if (faults.length) {
    lines.push("Feil som må utbedres:");
    for (const f of faults) lines.push(`- ${f}`);
  }
  const note = comment?.trim();
  if (note) lines.push(`Kommentar: ${note}`);
  return lines.join("\n") || "Ingen feil registrert ved mottak";
}

/** @deprecated kept for older imports — prefer flat option lists above */
export type CatalogNode = {
  key: string;
  label: string;
  children?: CatalogNode[];
};

export const PROBLEM_CATALOG: CatalogNode[] = [];
export const CONDITION_CATALOG: CatalogNode[] = [];

export function findCatalogPath(): null {
  return null;
}

export function formatCatalogSelection(
  _catalog: CatalogNode[],
  leafKey: string,
  comment?: string | null,
): string {
  const note = comment?.trim();
  return note ? `${leafKey}\nKommentar: ${note}` : leafKey;
}
