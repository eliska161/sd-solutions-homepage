import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { formatDate, formatDateOnly } from "@/lib/labels";
import { formatNokFromOre } from "@/lib/money";

export type SummaryKv = { label: string; value: string };

export type SummarySection = {
  title: string;
  rows?: SummaryKv[];
  bullets?: string[];
  paragraphs?: string[];
  emptyText?: string;
};

export type JobSummaryDocument = {
  kind: "repair" | "flip";
  title: string;
  subtitle: string;
  statusLabel: string;
  generatedAt: Date;
  sections: SummarySection[];
};

const COLORS = {
  ink: "#18181b",
  muted: "#71717a",
  line: "#e4e4e7",
  accent: "#0f766e",
  accentSoft: "#ccfbf1",
  surface: "#f4f6f8",
  white: "#ffffff",
};

function resolveFontFile(filename: string): string {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts", filename),
    path.join(process.cwd(), "apps", "repair", "assets", "fonts", filename),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `PDF-font mangler: ${filename} (søkte ${candidates.join(", ")})`,
  );
}

function fontPaths() {
  return {
    regular: resolveFontFile("LiberationSans-Regular.ttf"),
    bold: resolveFontFile("LiberationSans-Bold.ttf"),
  };
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function drawHeader(doc: PDFKit.PDFDocument, data: JobSummaryDocument) {
  const fonts = fontPaths();
  const left = doc.page.margins.left;
  const width =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.save();
  doc.rect(0, 0, doc.page.width, 72).fill(COLORS.accent);
  doc.fillColor(COLORS.white).font(fonts.bold).fontSize(11);
  doc.text("SD Solutions", left, 18, { width });
  doc.font(fonts.regular).fontSize(9).fillColor("#d1fae5");
  doc.text("Verkstedssammendrag · arkiv / sending", left, 34, { width });
  doc.restore();

  doc.y = 88;
  doc.fillColor(COLORS.ink).font(fonts.bold).fontSize(18);
  doc.text(data.title, left, doc.y, { width });
  doc.moveDown(0.25);
  doc.font(fonts.regular).fontSize(10).fillColor(COLORS.muted);
  doc.text(data.subtitle || "—", { width });
  doc.moveDown(0.35);

  const badgeY = doc.y;
  const badgeText = data.statusLabel || "—";
  doc.font(fonts.bold).fontSize(9);
  const badgeW = Math.min(width, doc.widthOfString(badgeText) + 16);
  doc
    .roundedRect(left, badgeY, badgeW, 18, 9)
    .fill(COLORS.accentSoft);
  doc.fillColor(COLORS.accent).text(badgeText, left + 8, badgeY + 4, {
    width: badgeW - 16,
    lineBreak: false,
  });
  doc.y = badgeY + 28;

  doc.font(fonts.regular).fontSize(8).fillColor(COLORS.muted);
  doc.text(`Generert ${formatDate(data.generatedAt)}`, { width });
  doc.moveDown(0.8);
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor(COLORS.line)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.8);
}

function drawSection(doc: PDFKit.PDFDocument, section: SummarySection) {
  const fonts = fontPaths();
  const left = doc.page.margins.left;
  const width =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  ensureSpace(doc, 48);
  doc.fillColor(COLORS.accent).font(fonts.bold).fontSize(11);
  doc.text(section.title.toUpperCase(), left, doc.y, {
    width,
    characterSpacing: 0.6,
  });
  doc.moveDown(0.35);
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor(COLORS.line)
    .lineWidth(0.8)
    .stroke();
  doc.moveDown(0.55);

  const hasContent =
    (section.rows && section.rows.length > 0) ||
    (section.bullets && section.bullets.length > 0) ||
    (section.paragraphs && section.paragraphs.length > 0);

  if (!hasContent) {
    doc.font(fonts.regular).fontSize(9).fillColor(COLORS.muted);
    doc.text(section.emptyText || "Ingen data registrert.", { width });
    doc.moveDown(0.9);
    return;
  }

  if (section.rows?.length) {
    for (const row of section.rows) {
      ensureSpace(doc, 22);
      const y = doc.y;
      doc.font(fonts.regular).fontSize(9).fillColor(COLORS.muted);
      doc.text(row.label, left, y, { width: 140, lineBreak: false });
      doc.font(fonts.regular).fontSize(9).fillColor(COLORS.ink);
      doc.text(row.value || "—", left + 150, y, { width: width - 150 });
      doc.moveDown(0.25);
    }
    doc.moveDown(0.35);
  }

  if (section.paragraphs?.length) {
    for (const p of section.paragraphs) {
      ensureSpace(doc, 28);
      doc.font(fonts.regular).fontSize(9).fillColor(COLORS.ink);
      doc.text(p, { width, align: "left" });
      doc.moveDown(0.4);
    }
  }

  if (section.bullets?.length) {
    for (const bullet of section.bullets) {
      ensureSpace(doc, 20);
      const y = doc.y;
      doc.fillColor(COLORS.accent).circle(left + 3, y + 5, 2).fill();
      doc.font(fonts.regular).fontSize(9).fillColor(COLORS.ink);
      doc.text(bullet, left + 12, y, { width: width - 12 });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.35);
  }

  doc.moveDown(0.35);
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const fonts = fontPaths();
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const text = `SD Solutions · Slåttmyrvegen 49, 2406 Elverum · Side ${i + 1} av ${range.count}`;
    doc
      .font(fonts.regular)
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(text, doc.page.margins.left, doc.page.height - 36, {
        width:
          doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center",
        lineBreak: false,
      });
  }
}

export function renderJobSummaryPdf(
  data: JobSummaryDocument,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = fontPaths();
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 54, left: 48, right: 48 },
      bufferPages: true,
      info: {
        Title: data.title,
        Author: "SD Solutions",
        Subject: "Verkstedssammendrag",
        CreationDate: data.generatedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.registerFont("Body", fonts.regular);
      doc.registerFont("BodyBold", fonts.bold);
      drawHeader(doc, data);
      for (const section of data.sections) {
        drawSection(doc, section);
      }
      drawFooter(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function moneyLabel(ore: number | null | undefined): string {
  if (ore == null) return "—";
  return formatNokFromOre(ore);
}

export function dateLabel(value: Date | string | null | undefined): string {
  return formatDate(value);
}

export function dateOnlyLabel(
  value: Date | string | null | undefined,
): string {
  return formatDateOnly(value);
}
