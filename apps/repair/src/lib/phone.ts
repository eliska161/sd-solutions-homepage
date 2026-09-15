/** Normalize Norwegian mobile numbers to E.164. */
export function toE164Phone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1).replace(/\D/g, "");
  else digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0047")) digits = digits.slice(4);
  else if (digits.startsWith("47") && digits.length >= 10) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 9) digits = digits.slice(1);
  if (digits.length !== 8) return null;
  if (!/^[49]/.test(digits)) return null;
  return `+47${digits}`;
}

export function nationalPhoneDigits(raw: string | null | undefined): string | null {
  const e164 = toE164Phone(raw);
  return e164 ? e164.slice(3) : null;
}

export function isSendablePhone(raw: string | null | undefined) {
  const e164 = toE164Phone(raw);
  if (!e164) return false;
  if (/(\d)\1{6,}/.test(e164)) return false;
  return true;
}
