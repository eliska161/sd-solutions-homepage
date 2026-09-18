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
  const candidates = [
    `Hei ${first}. ${ticket} ${opts.verb} ${opts.url} Anmeld: ${GOOGLE_REVIEW_URL}`,
    `Hei ${first}. ${ticket} ferdig. ${opts.url} ${GOOGLE_REVIEW_URL}`,
    `Hei ${first}. ${ticket} ferdig. Anmeld: ${GOOGLE_REVIEW_URL} ${opts.url}`,
  ];
  const packed = candidates.map((line) => toGsmSafeSms(line));
  return packed.find((line) => line.length <= 160) ?? packed[packed.length - 1]!;
}
