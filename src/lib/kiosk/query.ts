export function compactKioskId(raw: string) {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function classifyKioskQuery(
  raw: string,
): "empty" | "phone" | "imei" | "serial" {
  const compact = compactKioskId(raw);
  const digits = raw.replace(/\D/g, "");
  if (!compact && !digits) return "empty";
  if (/^\d{8}$/.test(compact)) return "phone";
  if (digits.length === 10 && digits.startsWith("47")) return "phone";
  if (digits.length === 11 && digits.startsWith("47")) return "phone";
  if (digits.length === 14 || digits.length === 15) return "imei";
  if (compact.length >= 8) return "serial";
  return "empty";
}

export function splitImeiAndSerial(raw: string) {
  const kind = classifyKioskQuery(raw);
  const compact = compactKioskId(raw);
  if (kind === "imei") {
    return { imei: compact.replace(/\D/g, ""), serialNumber: null as string | null };
  }
  if (kind === "serial") {
    return { imei: null as string | null, serialNumber: compact };
  }
  return { imei: null as string | null, serialNumber: null as string | null };
}
