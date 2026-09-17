import PDFDocument from "pdfkit";
import {
  LEGAL_PARTY,
  LEGAL_VERSION,
  type LegalDocument,
  fysiskReparasjonsvilkar,
  getLegalDocument,
} from "@/lib/legal";
import { formatDate } from "@/lib/labels";
import { formatNokFromOre } from "@/lib/money";
import { PDF_COLORS, pdfFontPaths } from "@/lib/pdf/summary-document";

export type TermsOrderSummary = {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deviceLabel: string;
  problem: string;
  inboundLabel: string;
  outboundLabel: string;
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
  kicker: string,
  title: string,
  subtitle: string,
) {
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);

  doc.save();
  doc.rect(0, 0, doc.page.width, 78).fill(PDF_COLORS.accent);
  doc.fillColor(PDF_COLORS.white).font(fonts.bold).fontSize(11);
  doc.text(LEGAL_PARTY.brandName, left, 16, { width });
  doc.font(fonts.regular).fontSize(9).fillColor("#d1fae5");
  doc.text(kicker, left, 32, { width });
  doc.restore();

  doc.y = 94;
  doc.fillColor(PDF_COLORS.ink).font(fonts.bold).fontSize(18);
  doc.text(title, left, doc.y, { width });
  doc.moveDown(0.2);
  doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
  doc.text(subtitle, { width });
  doc.moveDown(0.6);
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor(PDF_COLORS.line)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.7);
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const fonts = pdfFontPaths();
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font(fonts.regular)
      .fontSize(8)
      .fillColor(PDF_COLORS.muted)
      .text(
        `${LEGAL_PARTY.brandName} · ${LEGAL_PARTY.legalName} · ${LEGAL_PARTY.address} · Side ${i + 1} av ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 36,
        {
          width: pageWidth(doc),
          align: "center",
          lineBreak: false,
        },
      );
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
  drawBrandHeader(
    doc,
    document.kicker,
    document.title,
    `Versjon ${document.version} · ${LEGAL_PARTY.address}`,
  );
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

export function renderSignedTermsPdf(input: {
  order: TermsOrderSummary;
  signature: TermsSignature;
}): Promise<Buffer> {
  const document = fysiskReparasjonsvilkar;
  const doc = createDoc(
    `Reparasjonsvilkår ${input.order.ticketNumber}`,
    `Signert versjon ${document.version}`,
  );
  const chunks: Buffer[] = [];
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);

  drawBrandHeader(
    doc,
    "Signert serviceordre",
    document.title,
    `${input.order.ticketNumber} · versjon ${document.version} · signert ${formatDate(input.signature.signedAt)}`,
  );

  ensureSpace(doc, 90);
  doc.fillColor(PDF_COLORS.accent).font(fonts.bold).fontSize(10);
  doc.text("SERVICEORDRE", { width, characterSpacing: 0.4 });
  doc.moveDown(0.3);
  const rows: Array<[string, string]> = [
    ["Kunde", input.order.customerName],
    ["E-post", input.order.customerEmail],
    ["Telefon", input.order.customerPhone],
    ["Enhet", input.order.deviceLabel],
    ["Feil", input.order.problem],
    ["Innlevering", input.order.inboundLabel],
    ["Utlevering", input.order.outboundLabel],
  ];
  for (const [label, value] of rows) {
    ensureSpace(doc, 18);
    const y = doc.y;
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
    doc.text(label, left, y, { width: 110, lineBreak: false });
    doc.fillColor(PDF_COLORS.ink).text(value || "—", left + 118, y, {
      width: width - 118,
    });
    doc.moveDown(0.15);
  }
  doc.moveDown(0.6);

  drawLegalSections(doc, document);

  ensureSpace(doc, 150);
  doc.fillColor(PDF_COLORS.accent).font(fonts.bold).fontSize(10);
  doc.text("SIGNATUR", { width, characterSpacing: 0.4 });
  doc.moveDown(0.35);
  doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.ink);
  doc.text(
    `${input.signature.signerName} har signert versjon ${LEGAL_VERSION} ${formatDate(input.signature.signedAt)}.`,
    { width },
  );
  doc.moveDown(0.4);
  try {
    doc.image(input.signature.png, left, doc.y, { width: 220, height: 70 });
    doc.y += 78;
  } catch {
    doc.font(fonts.regular).fontSize(9).fillColor(PDF_COLORS.muted);
    doc.text("(Signaturbilde kunne ikke vises i PDF.)", { width });
  }
  doc
    .moveTo(left, doc.y)
    .lineTo(left + 220, doc.y)
    .strokeColor(PDF_COLORS.line)
    .stroke();
  doc.moveDown(0.3);
  doc.font(fonts.regular).fontSize(8).fillColor(PDF_COLORS.muted);
  doc.text(input.signature.signerName, { width: 220 });

  return finishPdf(doc, chunks);
}

export function renderReceiptPdf(input: {
  ticketNumber: string;
  customerName: string;
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
    `Kvittering ${input.ticketNumber}`,
    "Kundekvittering",
  );
  const chunks: Buffer[] = [];
  const fonts = pdfFontPaths();
  const left = doc.page.margins.left;
  const width = pageWidth(doc);

  drawBrandHeader(
    doc,
    "Kvittering",
    `Kvittering ${input.ticketNumber}`,
    `${input.customerName} · ${input.deviceLabel} · ${formatDate(input.issuedAt)}`,
  );

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
  doc.text("Total", left, totalY, { width: width - 90 });
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
    "Delpriser vises ikke. Beløpet er tjenester minus rabatt, pluss eventuell returporto.",
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
