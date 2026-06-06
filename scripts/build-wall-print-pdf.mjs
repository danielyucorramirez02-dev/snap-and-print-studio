import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { jsPDF } from "jspdf";

const [outputDirArg, pdfPathArg] = process.argv.slice(2);

if (!outputDirArg || !pdfPathArg) {
  console.error("Usage: node scripts/build-wall-print-pdf.mjs <output-dir> <pdf-path>");
  process.exit(1);
}

const outputDir = resolve(outputDirArg);
const pdfPath = resolve(pdfPathArg);
const sheets = readdirSync(outputDir)
  .filter((name) => /^wall-print-sheet-\d{3}\.jpg$/i.test(name))
  .sort((a, b) => a.localeCompare(b));

if (sheets.length === 0) {
  console.error(`No wall-print sheet JPGs found in ${outputDir}`);
  process.exit(1);
}

const doc = new jsPDF({
  orientation: "landscape",
  unit: "in",
  format: [6, 4],
  compress: true,
});

sheets.forEach((sheetName, index) => {
  if (index > 0) {
    doc.addPage([6, 4], "landscape");
  }

  const imageBytes = readFileSync(join(outputDir, sheetName));
  doc.addImage(imageBytes, "JPEG", 0, 0, 6, 4, undefined, "NONE");
});

writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
console.log(`Created ${pdfPath}`);
