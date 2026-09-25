import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MailFile } from "@/lib/mail";

export const BATTERY_CALIBRATE_PUBLIC_PATH = "/batterikalibrering.png";
export const BATTERY_CALIBRATE_FILENAME = "batterikalibrering.png";

export function looksLikeBatteryJob(
  ...texts: Array<string | null | undefined>
): boolean {
  return texts.some((text) => /batteri/i.test(text ?? ""));
}

export function batteryCalibratePngPath() {
  const candidates = [
    path.join(process.cwd(), "public", BATTERY_CALIBRATE_FILENAME),
    path.join(process.cwd(), "apps/repair/public", BATTERY_CALIBRATE_FILENAME),
    path.join(process.cwd(), "assets/cards", BATTERY_CALIBRATE_FILENAME),
  ];
  return candidates.find((file) => existsSync(file)) ?? null;
}

export function batteryCalibrateMailFile(): MailFile | null {
  const file = batteryCalibratePngPath();
  if (!file) return null;
  return {
    filename: BATTERY_CALIBRATE_FILENAME,
    content: readFileSync(file),
    contentType: "image/png",
  };
}
