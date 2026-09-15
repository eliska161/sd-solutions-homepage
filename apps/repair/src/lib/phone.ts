import parsePhoneNumberFromString, {
  type CountryCode,
  isValidPhoneNumber,
} from "libphonenumber-js";

const COUNTRY_NB: Partial<Record<CountryCode, string>> = {
  NO: "Norge",
  SE: "Sverige",
  DK: "Danmark",
  FI: "Finland",
  IS: "Island",
  DE: "Tyskland",
  NL: "Nederland",
  GB: "Storbritannia",
  US: "USA",
};

/** Normalize to E.164 via libphonenumber-js. */
export function toE164Phone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = "NO",
): string | null {
  if (!raw?.trim()) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry);
  if (!parsed?.isValid()) return null;
  return parsed.number;
}

export function nationalPhoneDigits(
  raw: string | null | undefined,
): string | null {
  const parsed = parsePhoneNumberFromString(raw?.trim() || "", "NO");
  if (!parsed?.isValid()) return null;
  return parsed.nationalNumber || null;
}

export function isSendablePhone(raw: string | null | undefined) {
  if (!raw?.trim()) return false;
  if (/(\d)\1{6,}/.test(raw)) return false;
  return isValidPhoneNumber(raw.trim(), "NO") || isValidPhoneNumber(raw.trim());
}

export function countryNameFromPhone(raw: string | null | undefined): string {
  const parsed = parsePhoneNumberFromString(raw?.trim() || "");
  const iso = parsed?.country;
  if (!iso) return "Norge";
  return COUNTRY_NB[iso] ?? iso;
}
