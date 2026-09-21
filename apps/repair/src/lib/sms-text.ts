import { GOOGLE_REVIEW_URL } from "@/lib/google-review";

/** 46elks bills per SMS part. One en-dash or ellipsis forces UTF-16 (70 chars/part). */

export function toGsmSafeSms(text: string) {
  return text
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...");
}

/** Ping + URL. Details live on the status page. Keep under 160 GSM-7 chars. */
export function customerSmsPing(opts: {
  name: string;
  ticketNumber: string;
  verb: string;
  url: string;
}) {
  const first = opts.name.trim().split(/\s+/)[0] || "hei";
  return `Hei ${first}. ${opts.ticketNumber} ${opts.verb} ${opts.url}`;
}

export function gsmSmsPartCount(text: string) {
  const body = toGsmSafeSms(text);
  if (body.length <= 160) return 1;
  return Math.ceil(body.length / 153);
}

/** Done / ready-for-pickup ping: status URL + Google review form, GSM-7 if possible. */
export function customerSmsRepairDone(opts: {
  name: string;
  ticketNumber: string;
  verb: string;
  url: string;
}) {
  const first = (opts.name.trim().split(/\s+/)[0] || "hei").slice(0, 16);
  const ticket = opts.ticketNumber.trim();
  const ask = "Vi setter pris på om du legger igjen en anmeldelse:";
  return toGsmSafeSms(
    `Hei ${first}. ${ticket} ${opts.verb} ${opts.url} ${ask} ${GOOGLE_REVIEW_URL}`,
  );
}

/** Ready for locker pickup: PIN + status URL, keep under 160 GSM-7 chars. */
export function customerSmsPickupPin(opts: {
  name: string;
  ticketNumber: string;
  pin: string;
  url: string;
}) {
  const first = (opts.name.trim().split(/\s+/)[0] || "hei").slice(0, 16);
  return toGsmSafeSms(
    `Hei ${first}. ${opts.ticketNumber} klar for henting. PIN ${opts.pin} ${opts.url}`,
  );
}
