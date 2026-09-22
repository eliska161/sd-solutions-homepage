import { existsSync } from "fs";
import PDFDocument from "pdfkit";
import {
  LEGAL_PARTY,
  type LegalDocument,
  fysiskReparasjonsvilkar,
  getLegalDocument,
} from "@/lib/legal";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { formatNokFromOre, vatFromGrossOre } from "@/lib/money";
import {
  barcodePng,
  drawLogoWordmark,
  drawPageChrome,
  kv,
  pageWidth as confirmationPageWidth,
  qrPng,
  renderOrderConfirmationPdf,
} from "@/lib/pdf/order-confirmation";
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
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  deviceLabel: string;
  serialNumber?: string | null;
  imei?: string | null;
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
  const muted = "#5c6370";
  const line = "#d5d8de";
  const wash = "#f3f4f6";
  const barcodeText = input.ticketNumber.replace(/[^A-Za-z0-9-]/g, "") || "SD";
  const [bar, qr] = await Promise.all([
    barcodePng(barcodeText),
    input.statusUrl ? qrPng(input.statusUrl) : Promise.resolve(null),
  ]);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 36, bottom: 48, left: 42, right: 42 },
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

  const left = doc.page.margins.left;
  const width = confirmationPageWidth(doc);
  const right = left + width;
  const dateLabel = formatDateOnly(input.issuedAt);
  const when = formatDate(input.issuedAt);

  drawLogoWordmark(doc, left, 36);
  doc.image(bar, right - 160, 36, { width: 160, height: 28 });

  doc.font(fonts.bold).fontSize(14).fillColor(ink);
  doc.text("KVITTERING", left, 84, { width: width - 170 });
  doc.font(fonts.bold).fontSize(16).text(input.ticketNumber, right - 160, 84, {
    width: 160,
    align: "right",
  });
  doc.font(fonts.regular).fontSize(8).fillColor(muted);
  doc.text(`Dato: ${dateLabel}`, right - 160, 104, {
    width: 160,
    align: "right",
  });

  doc
    .moveTo(left, 120)
    .lineTo(right, 120)
    .strokeColor(line)
    .lineWidth(0.8)
    .stroke();

  doc.font(fonts.bold).fontSize(11).fillColor(ink);
  doc.text(input.customerName || "Kunde", left, 132, { width: width / 2 - 12 });
  doc.font(fonts.regular).fontSize(9).fillColor(ink);
  if (input.customerPhone) doc.text(input.customerPhone, { width: width / 2 - 12 });
  if (input.customerEmail) doc.text(input.customerEmail, { width: width / 2 - 12 });
  if (input.customerAddress) doc.text(input.customerAddress, { width: width / 2 - 12 });

  const boxX = left + width / 2 + 8;
  const boxW = width / 2 - 8;
  doc.roundedRect(boxX, 128, boxW, 72, 4).strokeColor(line).lineWidth(0.8).stroke();
  doc.font(fonts.bold).fontSize(10).fillColor(ink);
  doc.text(input.deviceLabel || "Enhet", boxX + 10, 136, { width: boxW - 20 });
  doc.font(fonts.regular).fontSize(8).fillColor(muted);
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
  kv(doc, "Kvitteringsdato", when, left, gridY, 90, 140);
  kv(doc, "Saksnummer", input.ticketNumber, boxX, gridY, 90, 140);
  kv(doc, "Verksted", LEGAL_PARTY.address, left, gridY + 18, 90, 140);
  kv(doc, "E-post", LEGAL_PARTY.email, boxX, gridY + 18, 90, 140);
  kv(doc, "Åpent", LEGAL_PARTY.hours, left, gridY + 36, 90, 140);
  kv(doc, "Type", "Kvittering / betaling", boxX, gridY + 36, 90, 140);

  const serviceLines: { name: string; amountLabel: string }[] = input.lines.map((item) => ({
    name: item.name,
    amountLabel: formatNokFromOre(item.amountOre),
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

  const feeY = 292;
  doc.roundedRect(left, feeY, width, 18, 2).fill(wash);
  doc.fillColor(ink).font(fonts.bold).fontSize(9);
  doc.text("Tjenester (inkl. mva)", left + 8, feeY + 4, { lineBreak: false });

  let rowY = feeY + 26;
  if (serviceLines.length === 0) {
    doc.font(fonts.regular).fontSize(8).fillColor(muted);
    doc.text("Ingen tjenester registrert.", left, rowY, { width });
    rowY = Math.max(doc.y, rowY) + 10;
  } else {
    for (const item of serviceLines) {
      doc.font(fonts.regular).fontSize(9).fillColor(ink);
      doc.text(item.name, left, rowY, { width: width - 90, lineBreak: false });
      doc.text(item.amountLabel, left, rowY, { width, align: "right" });
      rowY += 16;
    }
  }

  const vat = vatFromGrossOre(input.totalOre);
  rowY += 4;
  doc
    .moveTo(left, rowY)
    .lineTo(right, rowY)
    .strokeColor(line)
    .lineWidth(0.8)
    .stroke();
  rowY += 10;
  doc.font(fonts.regular).fontSize(9).fillColor(ink);
  doc.text("Sum eks. mva", left, rowY, { width: width - 90 });
  doc.text(vat.netLabel, left, rowY, { width, align: "right" });
  rowY += 16;
  doc.text("Herav mva 25 %", left, rowY, { width: width - 90 });
  doc.text(vat.vatLabel, left, rowY, { width, align: "right" });
  rowY += 18;
  doc.font(fonts.bold).fontSize(12).fillColor(ink);
  doc.text("TOTAL", left, rowY, { width: width - 90 });
  doc.text(formatNokFromOre(input.totalOre), left, rowY, { width, align: "right" });
  rowY += 24;

  doc.roundedRect(left, rowY, width, 18, 2).fill(wash);
  doc.fillColor(ink).font(fonts.bold).fontSize(9);
  doc.text("Betaling", left + 8, rowY + 4, { lineBreak: false });
  rowY += 26;
  const payRows = [
    input.paymentLabel || "Betalt",
    input.paymentDetail,
    input.cardLast4 && input.cardBrand
      ? `${input.cardBrand} **** ${input.cardLast4}`
      : input.cardLast4
        ? `Kort **** ${input.cardLast4}`
        : null,
    input.authCode ? `Aut.id ${input.authCode}` : null,
    input.transactionId ? `Transaksjon ${input.transactionId}` : null,
    input.warrantyDays && input.warrantyDays > 0
      ? `Garanti på utført arbeid: ${input.warrantyDays} dager.`
      : null,
  ].filter((row, i, all): row is string => Boolean(row) && all.indexOf(row) === i);
  doc.font(fonts.regular).fontSize(9).fillColor(ink);
  for (const item of payRows) {
    doc.text(item, left, rowY, { width });
    rowY += 14;
  }

  rowY += 8;
  if (input.statusUrl && qr) {
    doc.font(fonts.regular).fontSize(9).fillColor(ink);
    doc.text(`Du kan se status på saken her: ${input.statusUrl}`, left, rowY, {
      width: width - 90,
    });
    doc.image(qr, right - 72, rowY, { width: 72, height: 72 });
    rowY += 80;
  }

  doc.font(fonts.bold).fontSize(11).fillColor(ink);
  doc.text("Takk for handelen", left, Math.max(rowY, 640), { width });

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawPageChrome(doc, i + 1, range.count);
  }
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
