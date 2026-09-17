import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { LEGAL_DOCUMENTS, legalPlainText } from "../src/lib/legal";
import { renderLegalPdf } from "../src/lib/pdf/customer-document";

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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
