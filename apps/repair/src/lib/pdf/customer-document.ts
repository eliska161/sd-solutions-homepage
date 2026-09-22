import { existsSync } from "fs";
import PDFDocument from "pdfkit";
import {
  LEGAL_PARTY,
  type LegalDocument,
  fysiskReparasjonsvilkar,
  getLegalDocument,
} from "@/lib/legal";
import bwipjs from "bwip-js/node";
import { formatDate } from "@/lib/labels";
import { formatNokFromOre, vatFromGrossOre } from "@/lib/money";
import { renderOrderConfirmationPdf } from "@/lib/pdf/order-confirmation";
import {
  PDF_COLORS,
  pdfFontPaths,
  resolvePdfLogoFile,
} from "@/lib/pdf/summary-document";

export type TermsOrderSummary = {
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
};

export type TermsSignature = {
  signerName: string;
  signedAt: Date;
  png: Buffer;
};

export type ReceiptLine = {
  name: string;
  amountOre: number;
};

function pageWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function drawBrandHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle?: string,
) {
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  const logo = resolvePdfLogoFile();

  doc.save();
  doc.roundedRect(left, 36, 36, 36, 6).fill("#111111");
  if (logo && existsSync(logo)) {
    doc.image(logo, left + 4, 40, { width: 28, height: 28 });
  }
  doc.restore();
  doc.fillColor(PDF_COLORS.ink).font(fonts.bold).fontSize(12);
  doc.text(LEGAL_PARTY.brandName, left + 46, 48, { lineBreak: false });

  doc.y = 86;
  doc.fillColor(PDF_COLORS.ink).font(fonts.bold).fontSize(16);
  doc.text(title, left, doc.y, { width });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
    doc.text(subtitle, { width });
  }
  doc.moveDown(0.5);
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor(PDF_COLORS.line)
    .lineWidth(0.8)
    .stroke();
  doc.moveDown(0.6);
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const fonts = pdfFontPaths();
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const saved = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font(fonts.regular)
      .fontSize(8)
      .fillColor(PDF_COLORS.muted)
      .text(
        `${LEGAL_PARTY.brandName} · ${LEGAL_PARTY.legalName} · ${LEGAL_PARTY.address} · ${LEGAL_PARTY.email} · Side ${i + 1} av ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 36,
        {
          width: pageWidth(doc),
          align: "center",
          lineBreak: false,
        },
      );
    doc.page.margins.bottom = saved;
  }
}

function drawLegalSections(
  doc: PDFKit.PDFDocument,
  document: LegalDocument,
) {
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);
  doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
  doc.text(document.intro, { width });
  doc.moveDown(0.6);
  for (const section of document.sections) {
    ensureSpace(doc, 56);
    doc.fillColor(PDF_COLORS.accent).font(fonts.bold).fontSize(10);
    doc.text(section.title.toUpperCase(), left, doc.y, {
      width,
      characterSpacing: 0.4,
    });
    doc.moveDown(0.25);
    for (const p of section.paragraphs) {
      ensureSpace(doc, 28);
      doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
      doc.text(p, { width, align: "left" });
      doc.moveDown(0.35);
    }
    doc.moveDown(0.2);
  }
}

function finishPdf(
  doc: PDFKit.PDFDocument,
  chunks: Buffer[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      drawFooter(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function createDoc(title: string, subject: string) {
  const fonts = pdfFontPaths();
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 48, bottom: 54, left: 48, right: 48 },
    bufferPages: true,
    info: {
      Title: title,
      Author: LEGAL_PARTY.brandName,
      Subject: subject,
      CreationDate: new Date(),
    },
  });
  doc.registerFont("Body", fonts.regular);
  doc.registerFont("BodyBold", fonts.bold);
  return doc;
}

export function renderLegalPdf(document: LegalDocument): Promise<Buffer> {
  const doc = createDoc(document.title, `Versjon ${document.version}`);
  const chunks: Buffer[] = [];
  drawBrandHeader(doc, document.title, `Versjon ${document.version}`);
  drawLegalSections(doc, document);
  return finishPdf(doc, chunks);
}

export function renderUnsignedTermsPdf(): Promise<Buffer> {
  return renderLegalPdf(fysiskReparasjonsvilkar);
}

export async function renderLegalPdfBySlug(
  slug: string,
): Promise<Buffer | null> {
  const document = getLegalDocument(slug);
  if (!document) return null;
  return renderLegalPdf(document);
}

export async function renderSignedTermsPdf(input: {
  order: TermsOrderSummary;
  signature: TermsSignature;
}): Promise<Buffer> {
  return renderOrderConfirmationPdf({
    ticketNumber: input.order.ticketNumber,
    customerName: input.order.customerName,
    customerEmail: input.order.customerEmail,
    customerPhone: input.order.customerPhone,
    customerAddress: input.order.customerAddress,
    deviceLabel: input.order.deviceLabel,
    serialNumber: input.order.serialNumber,
    imei: input.order.imei,
    problem: input.order.problem,
    inboundLabel: input.order.inboundLabel,
    outboundLabel: input.order.outboundLabel,
    statusUrl: input.order.statusUrl,
    signedAt: input.signature.signedAt,
    signerName: input.signature.signerName,
    signaturePng: input.signature.png,
  });
}

export async function renderReceiptPdf(input: {
  ticketNumber: string;
  customerName: string;
  customerPhone?: string | null;
  deviceLabel: string;
  issuedAt: Date;
  paymentLabel: string;
  paymentDetail?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  authCode?: string | null;
  transactionId?: string | null;
  statusUrl?: string | null;
  lines: ReceiptLine[];
  discount?: { label: string; amountOre: number } | null;
  postageOre: number;
  totalOre: number;
  warrantyDays: number | null;
}): Promise<Buffer> {
  const fonts = pdfFontPaths();
  const ink = "#111111";
  const muted = "#444444";
  const colW = 300;
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 36, bottom: 36, left: 48, right: 48 },
    bufferPages: true,
    info: {
      Title: `Kvittering ${input.ticketNumber}`,
      Author: LEGAL_PARTY.brandName,
      Subject: "Kvittering",
      CreationDate: input.issuedAt,
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

  const left = (doc.page.width - colW) / 2;
  const rule = () => {
    doc
      .moveTo(left, doc.y)
      .lineTo(left + colW, doc.y)
      .strokeColor(ink)
      .lineWidth(0.8)
      .stroke();
    doc.moveDown(0.45);
  };
  const row = (label: string, value: string, bold = false) => {
    const y = doc.y;
    doc.font(bold ? fonts.bold : fonts.regular).fontSize(bold ? 11 : 9).fillColor(ink);
    doc.text(label, left, y, { width: colW - 88 });
    doc.text(value, left, y, { width: colW, align: "right" });
    doc.y = y + (bold ? 16 : 14);
  };

  const logo = resolvePdfLogoFile();
  const logoSize = 56;
  if (logo && existsSync(logo)) {
    doc.image(logo, left + (colW - logoSize) / 2, doc.y, {
      width: logoSize,
      height: logoSize,
    });
    doc.y += logoSize + 10;
  }

  doc.font(fonts.bold).fontSize(12).fillColor(ink);
  doc.text(LEGAL_PARTY.brandName, left, doc.y, { width: colW, align: "center" });
  doc.moveDown(0.2);
  doc.font(fonts.regular).fontSize(9).fillColor(ink);
  doc.text(LEGAL_PARTY.legalName, left, doc.y, { width: colW, align: "center" });
  doc.text(LEGAL_PARTY.address, left, doc.y, { width: colW, align: "center" });
  doc.moveDown(0.5);
  rule();
  doc.font(fonts.bold).fontSize(12).fillColor(ink);
  doc.text("KVITTERING", left, doc.y, { width: colW, align: "center" });
  doc.moveDown(0.2);
  doc.font(fonts.regular).fontSize(9).fillColor(muted);
  doc.text(formatDate(input.issuedAt), left, doc.y, { width: colW, align: "center" });
  doc.moveDown(0.45);
  rule();

  const meta: [string, string][] = [
    input.customerName ? ["Kunde", input.customerName] : null,
    ["Rep.nr", input.ticketNumber],
    input.deviceLabel ? ["Enhet", input.deviceLabel] : null,
    input.customerPhone ? ["Telefon", input.customerPhone] : null,
  ].filter(Boolean) as [string, string][];
  for (const [label, value] of meta) row(label, value);
  doc.moveDown(0.25);
  rule();

  const serviceLines: { name: string; amountLabel: string }[] = input.lines.map((line) => ({
    name: line.name,
    amountLabel: formatNokFromOre(line.amountOre),
  }));
  if (input.discount && input.discount.amountOre > 0) {
    serviceLines.push({
      name: input.discount.label,
      amountLabel: `−${formatNokFromOre(input.discount.amountOre)}`,
    });
  }
  if (input.postageOre > 0) {
    serviceLines.push({
      name: "Returporto",
      amountLabel: formatNokFromOre(input.postageOre),
    });
  }
  if (serviceLines.length === 0) {
    doc.font(fonts.regular).fontSize(9).fillColor(muted);
    doc.text("Ingen tjenester registrert.", left, doc.y, { width: colW });
    doc.moveDown(0.4);
  }
  for (const line of serviceLines) row(line.name, line.amountLabel);
  doc.moveDown(0.2);
  rule();

  const vat = vatFromGrossOre(input.totalOre);
  row("Sum eks. mva", vat.netLabel);
  row("Herav mva 25 %", vat.vatLabel);
  row("TOTAL", formatNokFromOre(input.totalOre), true);
  doc.moveDown(0.25);
  rule();

  doc.font(fonts.bold).fontSize(10).fillColor(ink);
  doc.text("Betaling", left, doc.y, { width: colW });
  doc.moveDown(0.2);
  doc.font(fonts.regular).fontSize(9);
  doc.text(input.paymentLabel || "Betalt", left, doc.y, { width: colW });
  const payRows = [
    input.paymentDetail,
    input.cardLast4 && input.cardBrand
      ? `${input.cardBrand} **** ${input.cardLast4}`
      : input.cardLast4
        ? `Kort **** ${input.cardLast4}`
        : null,
    input.authCode ? `Aut.id ${input.authCode}` : null,
    input.transactionId ? `Transaksjon ${input.transactionId}` : null,
  ].filter((rowText, i, all): rowText is string => Boolean(rowText) && all.indexOf(rowText) === i);
  for (const line of payRows) {
    doc.text(line, left, doc.y, { width: colW });
  }
  if (input.warrantyDays && input.warrantyDays > 0) {
    doc.fillColor(muted);
    doc.text(`Garanti på utført arbeid: ${input.warrantyDays} dager.`, left, doc.y, {
      width: colW,
    });
    doc.fillColor(ink);
  }
  doc.moveDown(0.4);
  rule();

  if (input.statusUrl) {
    try {
      const qr = await bwipjs.toBuffer({
        bcid: "qrcode",
        text: input.statusUrl,
        scale: 3,
        backgroundcolor: "FFFFFF",
      });
      doc.font(fonts.regular).fontSize(9).fillColor(ink);
      doc.text("Status", left, doc.y, { width: colW, align: "center" });
      doc.moveDown(0.25);
      const qrSize = 92;
      doc.image(qr, left + (colW - qrSize) / 2, doc.y, { width: qrSize, height: qrSize });
      doc.y += qrSize + 8;
      doc.text(input.statusUrl.replace(/^https:\/\//, ""), left, doc.y, {
        width: colW,
        align: "center",
      });
      doc.moveDown(0.5);
    } catch {
      /* QR er pynt på kvitteringen */
    }
  }

  doc.font(fonts.bold).fontSize(11).fillColor(ink);
  doc.text("Takk for handelen", left, doc.y, { width: colW, align: "center" });

  doc.end();
  return done;
}

export function parsePngDataUrl(raw: string): Buffer | null {
  const match = raw
    .trim()
    .match(/^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  try {
    const buf = Buffer.from(match[1].replace(/\s/g, ""), "base64");
    if (buf.length < 400 || buf.length > 400_000) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
    return buf;
  } catch {
    return null;
  }
}
