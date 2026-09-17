import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { LEGAL_DOCUMENTS, legalPlainText, signedWorkshopClauses } from "../src/lib/legal";
import { renderLegalPdf } from "../src/lib/pdf/customer-document";
import { renderOrderConfirmationPdf } from "../src/lib/pdf/order-confirmation";
import { resolvePdfLogoFile } from "../src/lib/pdf/summary-document";

async function main() {
  const outDir = process.argv[2] || "/tmp/legal-export";
  mkdirSync(outDir, { recursive: true });
  const allText: string[] = [];
  for (const doc of LEGAL_DOCUMENTS) {
    const pdf = await renderLegalPdf(doc);
    writeFileSync(path.join(outDir, doc.filename), pdf);
    const text = legalPlainText(doc);
    const textName = doc.filename.replace(/\.pdf$/, ".txt");
    writeFileSync(path.join(outDir, textName), text);
    allText.push(text, "\n-----\n");
    console.log(doc.slug, pdf.length);
  }
  writeFileSync(path.join(outDir, "alle-vilkar.txt"), allText.join("\n"));
  writeFileSync(
    path.join(outDir, "ordrebekreftelse-vilkar.txt"),
    signedWorkshopClauses()
      .map((c, i) => `${i + 1}. ${c}`)
      .join("\n\n"),
  );

  const logo = resolvePdfLogoFile();
  const signaturePng = logo
    ? readFileSync(logo)
    : Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      );
  const orderPdf = await renderOrderConfirmationPdf({
    ticketNumber: "REP-2026-000099",
    customerName: "Elias Nordmann",
    customerEmail: "elias@example.com",
    customerPhone: "+47 400 00 000",
    customerAddress: "Slåttmyrvegen 49, 2406 Elverum, Norge",
    deviceLabel: "Apple iPhone 14 128 GB",
    serialNumber: "F2LX1234Q6L7",
    imei: "356938035643809",
    problem: "Skjermen flimrer etter fall. Berøring nederst er død.",
    inboundLabel: "Leveres i butikk",
    outboundLabel: "Hentes i butikk",
    statusUrl: "https://repair.sd-solutions.org/s/Ab3dEf7H",
    signedAt: new Date("2026-09-17T12:00:00+02:00"),
    signerName: "Elias Nordmann",
    signaturePng,
  });
  writeFileSync(path.join(outDir, "ordrebekreftelse-eksempel.pdf"), orderPdf);
  console.log("ordrebekreftelse", orderPdf.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
