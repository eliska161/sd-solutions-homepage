import { existsSync } from "fs";
import bwipjs from "bwip-js/node";
import PDFDocument from "pdfkit";
import { formatDateOnly } from "@/lib/labels";
import {
  LEGAL_PARTY,
  LEGAL_VERSION,
  signedWorkshopClauses,
} from "@/lib/legal";
import {
  PRICE_LIST_DISCLAIMER,
  estimateLinesForModel,
  matchRepairModel,
} from "@/lib/repair-prices";
import { pdfFontPaths, resolvePdfLogoFile } from "@/lib/pdf/summary-document";

const INK = "#111111";
const MUTED = "#5c6370";
const LINE = "#d5d8de";
const PLATE = "#111111";
const WASH = "#f3f4f6";

export type OrderConfirmationInput = {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  deviceLabel: string;
  serialNumber: string | null;
  imei: string | null;
  problem: string;
  inboundLabel: string;
  outboundLabel: string;
  statusUrl: string;
  signedAt: Date;
  signerName: string;
  signaturePng: Buffer;
};

function pageWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

async function barcodePng(text: string) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 2,
    height: 12,
    includetext: false,
    backgroundcolor: "FFFFFF",
  });
}

async function qrPng(text: string) {
  return bwipjs.toBuffer({
    bcid: "qrcode",
    text,
    scale: 3,
    backgroundcolor: "FFFFFF",
  });
}

function drawLogoWordmark(
  doc: PDFKit.PDFDocument,
  left: number,
  top: number,
) {
  const fonts = pdfFontPaths();
  const logo = resolvePdfLogoFile();
  const plate = 36;
  doc.save();
  doc.roundedRect(left, top, plate, plate, 6).fill(PLATE);
  if (logo && existsSync(logo)) {
    doc.image(logo, left + 4, top + 4, { width: plate - 8, height: plate - 8 });
  }
  doc.restore();
  doc.fillColor(INK).font(fonts.bold).fontSize(12);
  doc.text(LEGAL_PARTY.brandName, left + plate + 10, top + 12, {
    lineBreak: false,
  });
}

function kv(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
) {
  const fonts = pdfFontPaths();
  doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
  doc.text(label, x, y, { width: labelW, lineBreak: false });
  doc.font(fonts.regular).fontSize(9).fillColor(INK);
  doc.text(value || "—", x + labelW, y, { width: valueW });
}

function drawSignature(
  doc: PDFKit.PDFDocument,
  input: OrderConfirmationInput,
  dateLabel: string,
  y: number,
) {
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const right = left + width;
  try {
    doc.image(input.signaturePng, right - 220, y, {
      width: 200,
      height: 56,
    });
  } catch {
    doc.font(fonts.regular).fontSize(9).fillColor(MUTED);
    doc.text("(Signatur)", right - 200, y + 20, { width: 180 });
  }
  doc
    .moveTo(right - 220, y + 62)
    .lineTo(right - 20, y + 62)
    .strokeColor(LINE)
    .lineWidth(0.8)
    .stroke();
  doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
  doc.text("Kundes signatur", right - 220, y + 68, {
    width: 120,
    lineBreak: false,
  });
  doc.text(dateLabel, right - 90, y + 68, {
    width: 70,
    align: "right",
    lineBreak: false,
  });
  doc.font(fonts.bold).fontSize(10).fillColor(INK);
  doc.text(input.signerName, right - 220, y + 82, { width: 200 });
}

export async function renderOrderConfirmationPdf(
  input: OrderConfirmationInput,
): Promise<Buffer> {
  const fonts = pdfFontPaths();
  const barcodeText = input.ticketNumber.replace(/[^A-Za-z0-9-]/g, "") || "SD";
  const [bar, qr] = await Promise.all([
    barcodePng(barcodeText),
    qrPng(input.statusUrl),
  ]);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 36, bottom: 48, left: 42, right: 42 },
    bufferPages: true,
    info: {
      Title: `Ordrebekreftelse ${input.ticketNumber}`,
      Author: LEGAL_PARTY.brandName,
      Subject: "Serviceordre",
      CreationDate: input.signedAt,
    },
  });
  doc.registerFont("Body", fonts.regular);
  doc.registerFont("BodyBold", fonts.bold);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const right = left + width;
  const dateLabel = formatDateOnly(input.signedAt);

  drawLogoWordmark(doc, left, 36);
  doc.image(bar, right - 160, 36, { width: 160, height: 28 });

  doc.font(fonts.bold).fontSize(14).fillColor(INK);
  doc.text("ORDREBEKREFTELSE", left, 84, { width: width - 170 });
  doc.font(fonts.bold).fontSize(16).text(input.ticketNumber, right - 160, 84, {
    width: 160,
    align: "right",
  });
  doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
  doc.text(`Dato: ${dateLabel}`, right - 160, 104, {
    width: 160,
    align: "right",
  });

  doc
    .moveTo(left, 120)
    .lineTo(right, 120)
    .strokeColor(LINE)
    .lineWidth(0.8)
    .stroke();

  doc.font(fonts.bold).fontSize(11).fillColor(INK);
  doc.text(input.customerName, left, 132, { width: width / 2 - 12 });
  doc.font(fonts.regular).fontSize(9).fillColor(INK);
  doc.text(input.customerPhone, { width: width / 2 - 12 });
  doc.text(input.customerEmail, { width: width / 2 - 12 });
  doc.text(input.customerAddress, { width: width / 2 - 12 });

  const boxX = left + width / 2 + 8;
  const boxW = width / 2 - 8;
  doc.roundedRect(boxX, 128, boxW, 72, 4).strokeColor(LINE).lineWidth(0.8).stroke();
  doc.font(fonts.bold).fontSize(10).fillColor(INK);
  doc.text(input.deviceLabel, boxX + 10, 136, { width: boxW - 20 });
  doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
  doc.text(
    input.serialNumber ? `Serienummer  ${input.serialNumber}` : "Serienummer  —",
    boxX + 10,
    158,
    { width: boxW - 20 },
  );
  doc.text(
    input.imei ? `IMEI  ${input.imei}` : "IMEI  —",
    boxX + 10,
    172,
    { width: boxW - 20 },
  );

  const gridY = 226;
  kv(doc, "Ordredato", dateLabel, left, gridY, 90, 140);
  kv(doc, "Saksnummer", input.ticketNumber, boxX, gridY, 90, 140);
  kv(doc, "Innlevering", input.inboundLabel, left, gridY + 18, 90, 140);
  kv(doc, "Utlevering", input.outboundLabel, boxX, gridY + 18, 90, 140);
  kv(doc, "Verksted", LEGAL_PARTY.address, left, gridY + 36, 90, 140);
  kv(doc, "E-post", LEGAL_PARTY.email, boxX, gridY + 36, 90, 140);
  kv(doc, "Åpent", LEGAL_PARTY.hours, left, gridY + 54, 90, 140);
  kv(doc, "Type", "Service / diagnose", boxX, gridY + 54, 90, 140);

  const feeY = 300;
  const matched = matchRepairModel(input.deviceLabel);
  const estimates = matched ? estimateLinesForModel(matched) : [];
  doc.roundedRect(left, feeY, width, 18, 2).fill(WASH);
  doc.fillColor(INK).font(fonts.bold).fontSize(9);
  doc.text(
    matched
      ? `Estimert prisliste · ${matched.label} (inkl. mva)`
      : "Estimert prisliste (inkl. mva)",
    left + 8,
    feeY + 4,
    { lineBreak: false },
  );

  let rowY = feeY + 24;
  if (estimates.length === 0) {
    doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
    doc.text(
      "Ingen modell treff i prislisten. Pris avtales etter diagnose (399 kr hvis ingen feil eller hvis du takker nei).",
      left,
      rowY,
      { width },
    );
    rowY = Math.max(doc.y, rowY) + 10;
  } else {
    const colW = width / 2;
    for (let i = 0; i < estimates.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = left + col * colW;
      const y = rowY + row * 16;
      doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
      doc.text(estimates[i].label, x, y, {
        width: colW * 0.55,
        lineBreak: false,
      });
      doc.font(fonts.regular).fontSize(8).fillColor(INK);
      doc.text(estimates[i].value, x + colW * 0.55, y, {
        width: colW * 0.42,
        lineBreak: false,
      });
    }
    rowY += Math.ceil(estimates.length / 2) * 16 + 6;
  }
  doc.font(fonts.regular).fontSize(7.5).fillColor(MUTED);
  doc.text(PRICE_LIST_DISCLAIMER, left, rowY, { width });
  rowY = Math.max(doc.y, rowY) + 10;

  doc.roundedRect(left, rowY, width, 18, 2).fill(WASH);
  doc.fillColor(INK).font(fonts.bold).fontSize(9);
  doc.text("Feilbeskrivelse", left + 8, rowY + 4, { lineBreak: false });

  doc.font(fonts.regular).fontSize(9).fillColor(INK);
  doc.text(input.problem || "—", left, rowY + 26, { width: width - 88 });
  const afterProblem = Math.max(doc.y, rowY + 52);

  doc.font(fonts.regular).fontSize(9).fillColor(INK);
  doc.text(
    `Du kan se status på saken her: ${input.statusUrl}`,
    left,
    afterProblem + 8,
    { width: width - 90 },
  );
  doc.image(qr, right - 72, afterProblem, { width: 72, height: 72 });

  const signY = Math.min(doc.page.height - 170, afterProblem + 96);
  drawSignature(doc, input, dateLabel, signY);

  doc.addPage();
  drawLogoWordmark(doc, left, 36);
  doc.font(fonts.bold).fontSize(14).fillColor(INK);
  doc.text("VILKÅR", left, 84, { width: width - 160 });
  doc.font(fonts.bold).fontSize(16).text(input.ticketNumber, right - 160, 84, {
    width: 160,
    align: "right",
  });
  doc.font(fonts.regular).fontSize(8).fillColor(MUTED);
  doc.text(`Dato: ${dateLabel} · versjon ${LEGAL_VERSION}`, right - 200, 104, {
    width: 200,
    align: "right",
  });
  doc
    .moveTo(left, 120)
    .lineTo(right, 120)
    .strokeColor(LINE)
    .lineWidth(0.8)
    .stroke();

  doc.y = 132;
  const clauses = signedWorkshopClauses();
  const signReserve = 120;
  for (let i = 0; i < clauses.length; i++) {
    const bottom = doc.page.height - doc.page.margins.bottom - signReserve;
    doc.font(fonts.regular).fontSize(8.2).fillColor(INK);
    const height = doc.heightOfString(`${i + 1}. ${clauses[i]}`, { width });
    if (doc.y + height > bottom) {
      doc.addPage();
      drawLogoWordmark(doc, left, 36);
      doc.font(fonts.bold).fontSize(12).fillColor(INK);
      doc.text(`VILKÅR (forts.)  ${input.ticketNumber}`, left, 84, { width });
      doc
        .moveTo(left, 108)
        .lineTo(right, 108)
        .strokeColor(LINE)
        .lineWidth(0.8)
        .stroke();
      doc.y = 118;
    }
    doc.font(fonts.regular).fontSize(8.2).fillColor(INK);
    doc.text(`${i + 1}. ${clauses[i]}`, left, doc.y, {
      width,
      align: "left",
    });
    doc.moveDown(0.32);
  }

  let sign2 = doc.y + 16;
  const lastBottom = doc.page.height - 150;
  if (sign2 > lastBottom) {
    doc.addPage();
    drawLogoWordmark(doc, left, 36);
    sign2 = 100;
  }
  drawSignature(doc, input, dateLabel, Math.max(sign2, lastBottom));

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawPageChrome(doc, i + 1, range.count);
  }
  doc.end();
  return done;
}

function drawPageChrome(
  doc: PDFKit.PDFDocument,
  page: number,
  total: number,
) {
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const saved = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.font(fonts.regular).fontSize(7.5).fillColor(MUTED);
  doc.text(
    `${LEGAL_PARTY.legalName} · ${LEGAL_PARTY.address} · ${LEGAL_PARTY.email}\nSide ${page} / ${total}`,
    left,
    doc.page.height - 36,
    { width, align: "center" },
  );
  doc.page.margins.bottom = saved;
}
