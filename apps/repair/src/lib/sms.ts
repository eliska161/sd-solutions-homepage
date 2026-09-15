import { isSendablePhone, toE164Phone } from "@/lib/phone";
import { sendTelnyxSms } from "@/lib/telnyx";

export async function sendCustomerSms(
  phone: string,
  text: string,
): Promise<boolean> {
  if (!isSendablePhone(phone)) return false;
  const to = toE164Phone(phone);
  if (!to) return false;
  const body = text.trim();
  if (body.length < 2) return false;
  try {
    return await sendTelnyxSms(to, body.slice(0, 1600));
  } catch (err) {
    console.error("==> Telnyx kastet", err);
    return false;
  }
}
