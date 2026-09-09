export const REPAIR_STATUS_LABELS = {
  NEW: "Ny",
  DIAGNOSTICS: "Diagnostikk",
  WAITING_FOR_CUSTOMER: "Venter på kunde",
  WAITING_FOR_PART: "Venter på deler",
  APPROVED: "Godkjent",
  IN_REPAIR: "Under reparasjon",
  TESTING: "Testing",
  READY_FOR_PICKUP: "Klar for henting",
  COMPLETED: "Fullført",
  CANCELLED: "Kansellert",
  RETURNED: "Returnert",
} as const;

export const FLIP_STATUS_LABELS = {
  SEARCHING: "Søker",
  CANDIDATE: "Kandidat",
  PURCHASED: "Kjøpt",
  RECEIVED: "Mottatt",
  DIAGNOSTICS: "Diagnostikk",
  WAITING_FOR_PARTS: "Venter på deler",
  IN_REPAIR: "Under reparasjon",
  TESTING: "Testing",
  READY_TO_LIST: "Klar for salg",
  LISTED: "Listet",
  RESERVED: "Reservert",
  SOLD: "Solgt",
  ARCHIVED: "Arkivert",
} as const;

export const REPAIR_STATUSES = Object.keys(
  REPAIR_STATUS_LABELS,
) as (keyof typeof REPAIR_STATUS_LABELS)[];

export const FLIP_STATUSES = Object.keys(
  FLIP_STATUS_LABELS,
) as (keyof typeof FLIP_STATUS_LABELS)[];

export function repairStatusTone(
  status: string,
): "default" | "muted" | "accent" | "success" | "warning" | "danger" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "RETURNED":
      return "danger";
    case "WAITING_FOR_CUSTOMER":
    case "WAITING_FOR_PART":
      return "warning";
    case "READY_FOR_PICKUP":
    case "TESTING":
      return "accent";
    case "NEW":
      return "muted";
    default:
      return "default";
  }
}

export function flipStatusTone(
  status: string,
): "default" | "muted" | "accent" | "success" | "warning" | "danger" {
  switch (status) {
    case "SOLD":
      return "success";
    case "ARCHIVED":
      return "muted";
    case "WAITING_FOR_PARTS":
    case "RESERVED":
      return "warning";
    case "LISTED":
    case "READY_TO_LIST":
      return "accent";
    case "CANDIDATE":
    case "SEARCHING":
      return "muted";
    default:
      return "default";
  }
}

export function riskTone(
  risk: string,
): "success" | "warning" | "danger" | "muted" {
  if (risk === "GREEN") return "success";
  if (risk === "YELLOW") return "warning";
  if (risk === "RED") return "danger";
  return "muted";
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("nb-NO", { dateStyle: "long" });
}

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Parse kr input (comma or dot) to øre. */
export function parseKrToOre(raw: FormDataEntryValue | null): number {
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).replace(",", ".").replace(/\s/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
