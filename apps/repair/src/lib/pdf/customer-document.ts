import { existsSync } from "fs";
import PDFDocument from "pdfkit";
import {
  LEGAL_PARTY,
  type LegalDocument,
  fysiskReparasjonsvilkar,
  getLegalDocument,
} from "@/lib/legal";
import { formatDate } from "@/lib/labels";
import { formatNokFromOre } from "@/lib/money";
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

export function renderReceiptPdf(input: {
  ticketNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  deviceLabel: string;
  issuedAt: Date;
  paymentLabel: string;
  lines: ReceiptLine[];
  discount?: { label: string; amountOre: number } | null;
  postageOre: number;
  totalOre: number;
  warrantyDays: number | null;
}): Promise<Buffer> {
  const doc = createDoc(
    `Faktura ${input.ticketNumber}`,
    "Faktura og kvittering",
  );
  const chunks: Buffer[] = [];
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);

  drawBrandHeader(
    doc,
    `Faktura / kvittering ${input.ticketNumber}`,
    `${formatDate(input.issuedAt)} · ${input.deviceLabel}`,
  );

  doc.font(fonts.bold).fontSize(9).fillColor(PDF_COLORS.accent);
  doc.text("SELGER", { width: width / 2, continued: false });
  doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
  doc.text(`${LEGAL_PARTY.legalName}`, { width: width / 2 });
  doc.text(LEGAL_PARTY.address, { width: width / 2 });
  doc.text(LEGAL_PARTY.email, { width: width / 2 });
  doc.moveDown(0.5);
  doc.font(fonts.bold).fontSize(9).fillColor(PDF_COLORS.accent);
  doc.text("KUNDE");
  doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
  doc.text(input.customerName, { width });
  if (input.customerAddress) doc.text(input.customerAddress, { width });
  if (input.customerPhone) doc.text(input.customerPhone, { width });
  if (input.customerEmail) doc.text(input.customerEmail, { width });
  doc.moveDown(0.8);

  doc.fillColor(PDF_COLORS.accent).font(fonts.bold).fontSize(10);
  doc.text("TJENESTER", { width, characterSpacing: 0.4 });
  doc.moveDown(0.4);

  if (input.lines.length === 0) {
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
    doc.text("Ingen tjenester registrert på saken.", { width });
    doc.moveDown(0.5);
  }

  for (const line of input.lines) {
    ensureSpace(doc, 18);
    const y = doc.y;
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
    doc.text(line.name, left, y, { width: width - 90 });
    doc.text(formatNokFromOre(line.amountOre), left, y, {
      width,
      align: "right",
    });
    doc.y = y + 16;
  }

  if (input.discount && input.discount.amountOre > 0) {
    ensureSpace(doc, 18);
    const y = doc.y;
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
    doc.text(input.discount.label, left, y, { width: width - 90 });
    doc.text(`−${formatNokFromOre(input.discount.amountOre)}`, left, y, {
      width,
      align: "right",
    });
    doc.y = y + 16;
  }

  if (input.postageOre > 0) {
    ensureSpace(doc, 18);
    const y = doc.y;
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
    doc.text("Returporto", left, y, { width: width - 90 });
    doc.text(formatNokFromOre(input.postageOre), left, y, {
      width,
      align: "right",
    });
    doc.y = y + 16;
  }

  doc.moveDown(0.3);
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor(PDF_COLORS.line)
    .stroke();
  doc.moveDown(0.4);
  const totalY = doc.y;
  doc.font(fonts.bold).fontSize(11).fillColor(PDF_COLORS.ink);
  doc.text("Total inkl. mva", left, totalY, { width: width - 90 });
  doc.text(formatNokFromOre(input.totalOre), left, totalY, {
    width,
    align: "right",
  });
  doc.moveDown(1);

  doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
  doc.text(`Betaling: ${input.paymentLabel}`, { width });
  if (input.warrantyDays && input.warrantyDays > 0) {
    doc.text(`Garanti på utført arbeid: ${input.warrantyDays} dager.`, {
      width,
    });
  }
  doc.moveDown(0.5);
  doc.text(
    "Beløpet er tjenester minus rabatt, pluss eventuell returporto. Alle priser inkl. mva.",
    { width },
  );

  return finishPdf(doc, chunks);
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
