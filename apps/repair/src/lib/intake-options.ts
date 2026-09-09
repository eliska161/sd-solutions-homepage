/** Cascading catalogs for intake problem + physical condition. */

export type CatalogNode = {
  key: string;
  label: string;
  children?: CatalogNode[];
};

export const PROBLEM_CATALOG: CatalogNode[] = [
  {
    key: "screen",
    label: "Skjerm / display",
    children: [
      {
        key: "screen_cracked",
        label: "Sprukket / knust",
        children: [
          { key: "screen_cracked_glass", label: "Kun glass" },
          { key: "screen_cracked_lcd", label: "LCD/OLED skadet" },
          { key: "screen_cracked_touch", label: "Touch feiler" },
        ],
      },
      {
        key: "screen_issue",
        label: "Visningsfeil",
        children: [
          { key: "screen_flicker", label: "Flimrer" },
          { key: "screen_lines", label: "Streker / flekker" },
          { key: "screen_black", label: "Svart skjerm" },
        ],
      },
    ],
  },
  {
    key: "battery",
    label: "Batteri / lading",
    children: [
      {
        key: "battery_life",
        label: "Dårlig batteritid",
        children: [
          { key: "battery_drain", label: "Tømmes raskt" },
          { key: "battery_swollen", label: "Oppsvulmet" },
          { key: "battery_health_low", label: "Lav batterihelse" },
        ],
      },
      {
        key: "charging",
        label: "Lading",
        children: [
          { key: "charge_port", label: "Ladeport" },
          { key: "charge_wireless", label: "Trådløs lading" },
          { key: "charge_intermittent", label: "Lader av og til" },
        ],
      },
    ],
  },
  {
    key: "camera",
    label: "Kamera",
    children: [
      {
        key: "camera_rear",
        label: "Bakamera",
        children: [
          { key: "camera_rear_blur", label: "Uskarpt / flekk" },
          { key: "camera_rear_crash", label: "App kræsjer" },
          { key: "camera_rear_broken", label: "Linse/glass knust" },
        ],
      },
      {
        key: "camera_front",
        label: "Frontkamera",
        children: [
          { key: "camera_front_blur", label: "Uskarpt" },
          { key: "camera_front_fail", label: "Fungerer ikke" },
        ],
      },
    ],
  },
  {
    key: "audio",
    label: "Lyd",
    children: [
      {
        key: "speaker",
        label: "Høyttaler",
        children: [
          { key: "speaker_weak", label: "Svak lyd" },
          { key: "speaker_distort", label: "Forvrengt" },
          { key: "speaker_dead", label: "Ingen lyd" },
        ],
      },
      {
        key: "mic",
        label: "Mikrofon",
        children: [
          { key: "mic_call", label: "Samtale" },
          { key: "mic_video", label: "Video / Siri" },
        ],
      },
    ],
  },
  {
    key: "buttons",
    label: "Knapper / biometri",
    children: [
      {
        key: "buttons_side",
        label: "Sideknapper",
        children: [
          { key: "btn_power", label: "Av/på" },
          { key: "btn_volume", label: "Volum" },
          { key: "btn_mute", label: "Mute" },
        ],
      },
      {
        key: "biometrics",
        label: "Face ID / Touch ID",
        children: [
          { key: "face_id_fail", label: "Face ID feiler" },
          { key: "touch_id_fail", label: "Touch ID feiler" },
        ],
      },
    ],
  },
  {
    key: "water",
    label: "Væske / fall",
    children: [
      {
        key: "liquid",
        label: "Væskeskade",
        children: [
          { key: "liquid_recent", label: "Nylig" },
          { key: "liquid_unknown", label: "Ukjent omfang" },
        ],
      },
      {
        key: "drop",
        label: "Fallskade",
        children: [
          { key: "drop_frame", label: "Ramme / chassis" },
          { key: "drop_internal", label: "Mulig intern skade" },
        ],
      },
    ],
  },
  {
    key: "software",
    label: "Programvare / annet",
    children: [
      {
        key: "software_issue",
        label: "Programvare",
        children: [
          { key: "sw_boot", label: "Starter ikke" },
          { key: "sw_slow", label: "Treg / henger" },
          { key: "sw_update", label: "Etter oppdatering" },
        ],
      },
      {
        key: "other",
        label: "Annet",
        children: [{ key: "other_custom", label: "Beskriv i kommentar" }],
      },
    ],
  },
];

export const CONDITION_CATALOG: CatalogNode[] = [
  {
    key: "overall",
    label: "Helhetsinntrykk",
    children: [
      {
        key: "overall_grade",
        label: "Karakter",
        children: [
          { key: "cond_mint", label: "Som ny" },
          { key: "cond_good", label: "God" },
          { key: "cond_fair", label: "Bruksspor" },
          { key: "cond_poor", label: "Sterkt slitt / skadet" },
        ],
      },
    ],
  },
  {
    key: "front",
    label: "Forside / skjerm",
    children: [
      {
        key: "front_surface",
        label: "Overflate",
        children: [
          { key: "front_clean", label: "Ren / uten synlige riper" },
          { key: "front_micro", label: "Mikroriper" },
          { key: "front_deep", label: "Dype riper" },
          { key: "front_crack", label: "Sprekk / knust" },
        ],
      },
    ],
  },
  {
    key: "back",
    label: "Bakside / bakglass",
    children: [
      {
        key: "back_surface",
        label: "Overflate",
        children: [
          { key: "back_clean", label: "Uten skader" },
          { key: "back_scuff", label: "Skraper" },
          { key: "back_crack", label: "Sprekk / knust" },
        ],
      },
    ],
  },
  {
    key: "frame",
    label: "Ramme / sider",
    children: [
      {
        key: "frame_state",
        label: "Tilstand",
        children: [
          { key: "frame_ok", label: "OK" },
          { key: "frame_dent", label: "Bulker" },
          { key: "frame_bend", label: "Bøyd" },
          { key: "frame_chip", label: "Hakk / flis" },
        ],
      },
    ],
  },
  {
    key: "ports",
    label: "Porter / knapper",
    children: [
      {
        key: "ports_state",
        label: "Tilstand",
        children: [
          { key: "ports_ok", label: "OK" },
          { key: "ports_dirty", label: "Skitt / støv" },
          { key: "ports_damage", label: "Synlig skade" },
        ],
      },
    ],
  },
];

export function findCatalogPath(
  catalog: CatalogNode[],
  leafKey: string,
): CatalogNode[] | null {
  for (const node of catalog) {
    if (node.key === leafKey) return [node];
    if (node.children) {
      const nested = findCatalogPath(node.children, leafKey);
      if (nested) return [node, ...nested];
    }
  }
  return null;
}

export function formatCatalogSelection(
  catalog: CatalogNode[],
  leafKey: string,
  comment?: string | null,
): string {
  const path = findCatalogPath(catalog, leafKey);
  const labels = path?.map((n) => n.label).join(" → ") ?? leafKey;
  const note = comment?.trim();
  return note ? `${labels}\nKommentar: ${note}` : labels;
}
