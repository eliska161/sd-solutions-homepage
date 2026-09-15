import { getPhoneCountry } from "@/lib/phone-countries";

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseInternational(raw: string): string | null {
  const trimmed = raw.trim();
  let digits = onlyDigits(trimmed);
  if (trimmed.startsWith("+") || digits.startsWith("00")) {
    if (digits.startsWith("00")) digits = digits.slice(2);
  } else {
    return null;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("0")) return null;
  return `+${digits}`;
}

/** Normalize a number to E.164. `countryIso` is used when the input has no + / 00 prefix. */
export function toE164Phone(
  raw: string | null | undefined,
  countryIso = "NO",
): string | null {
  if (!raw?.trim()) return null;
  const international = parseInternational(raw.trim());
  if (international) return international;

  const country = getPhoneCountry(countryIso);
  let digits = onlyDigits(raw);
  if (!digits) return null;
  if (
    digits.startsWith(country.dial) &&
    digits.length > country.dial.length + 5
  ) {
    digits = digits.slice(country.dial.length);
  }
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (country.iso === "NO") {
    if (digits.length !== 8) return null;
    if (!/^[49]/.test(digits)) return null;
    return `+47${digits}`;
  }
  if (country.iso === "SE") {
    if (digits.length < 7 || digits.length > 10) return null;
    return `+46${digits}`;
  }
  if (country.iso === "DK") {
    if (digits.length !== 8) return null;
    return `+45${digits}`;
  }
  if (digits.length < 6 || digits.length > 12) return null;
  return `+${country.dial}${digits}`;
}

export function nationalPhoneDigits(raw: string | null | undefined): string | null {
  const e164 = toE164Phone(raw);
  if (!e164) return null;
  return e164.replace(/^\+\d{1,3}/, "") || null;
}

export function isSendablePhone(raw: string | null | undefined) {
  const e164 = toE164Phone(raw);
  if (!e164) return false;
  if (/(\d)\1{6,}/.test(e164)) return false;
  return true;
}
