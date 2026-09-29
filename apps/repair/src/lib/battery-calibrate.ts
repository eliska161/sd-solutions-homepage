import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { MailFile } from "@/lib/mail";

export const BATTERY_CALIBRATE_PUBLIC_PATH = "/batterikalibrering.png";
export const BATTERY_CALIBRATE_FILENAME = "batterikalibrering.png";
export const BATTERY_CALIBRATE_PDF_FILENAME = "batterikalibrering.pdf";

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

export async function renderBatteryCalibratePdf(): Promise<Buffer | null> {
  const file = batteryCalibratePngPath();
  if (!file) return null;

  const doc = new PDFDocument({
    size: "A5",
    layout: "landscape",
    margin: 18,
    info: {
      Title: "Batterikalibrering",
      Author: "SD Solutions",
    },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const width =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const height =
    doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  doc.image(file, left, top, {
    fit: [width, height],
    align: "center",
    valign: "center",
  });
  doc.end();
  return done;
}
