type SequenceKind = "REP" | "FLIP" | "PO";

export function formatPublicId(kind: SequenceKind, year: number, seq: number): string {
  return `${kind}-${year}-${String(seq).padStart(6, "0")}`;
}

export function currentYear(date = new Date()): number {
  return date.getUTCFullYear();
}
