import { isSendablePhone, toE164Phone } from "@/lib/phone";
import { sendElksSms } from "@/lib/elks";
import { toGsmSafeSms } from "@/lib/sms-text";

export async function sendCustomerSms(
  phone: string,
  text: string,
): Promise<boolean> {
  if (!isSendablePhone(phone)) return false;
  const to = toE164Phone(phone);
  if (!to) return false;
  const body = toGsmSafeSms(text).trim();
  if (body.length < 2) return false;
  try {
    return await sendElksSms(to, body.slice(0, 1600));
  } catch (err) {
    console.error("==> 46elks kastet", err);
    return false;
  }
}
