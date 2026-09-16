/** 46elks bills per SMS part. One en-dash or ellipsis forces UTF-16 (70 chars/part). */

export function toGsmSafeSms(text: string) {
  return text
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...");
}
