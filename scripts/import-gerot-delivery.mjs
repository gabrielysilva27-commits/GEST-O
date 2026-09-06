// Run with the optional `xlsx` package installed: node scripts/import-gerot-delivery.mjs <workbook.xlsx>
import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";

const workbook = XLSX.readFile(process.argv[2], { cellNF: true });
const sheet = workbook.Sheets["GEROT 2026"];
if (!sheet) throw new Error("A aba GEROT 2026 não foi encontrada.");
const rows = [];
const cells = {};
for (const sheetRow of [8, ...Array.from({ length: 132 }, (_, index) => index + 11)]) {
  const value = (column) => sheet[`${column}${sheetRow}`]?.v ?? null;
  const cellValue = (cell) => cell?.t === "e" ? null : cell?.v ?? null;
  const formulas = Array.from({ length: 12 }, (_, index) => sheet[`${String.fromCharCode(79 + index)}${sheetRow}`]?.f || "");
  const formats = Array.from({ length: 12 }, (_, index) => sheet[`${String.fromCharCode(79 + index)}${sheetRow}`]?.z || "General");
  const monthly = Array.from({ length: 12 }, (_, index) => cellValue(sheet[`${String.fromCharCode(79 + index)}${sheetRow}`]));
  const label = sheetRow === 8 ? "DIAS ÚTEIS" : value("D") || (sheetRow === 36 ? "DEVOLUÇÕES NO RAIO" : "DEVOLUÇÕES TOTAIS — RAIO");
  const displayFormat = value("F") === "HORA" ? "HORA" : formats[0].includes("%") ? "%" : "number";
  rows.push({
    id: `entrega-${sheetRow}`, sheetRow, type: sheetRow === 8 ? "" : value("C") || "",
    indicator: label.trim(), product: value("E") || "", unit: sheetRow === 8 ? "dias" : value("F") || "",
    eoy2024: value("G"), eoy2025: value("H"), target: value("J"), targetMode: value("M") || "",
    referenceYtd: cellValue(sheet[`N${sheetRow}`]), ytdFormula: sheet[`N${sheetRow}`]?.f || "",
    monthly, sourceMonthly: [...monthly], formulas, formats, displayFormat,
    calculationInput: sheetRow === 8 || !value("C"), spreadsheetEngine: "delivery-v1"
  });
  for (const column of "NOPQRSTUVWXYZ") {
    const address = `${column}${sheetRow}`;
    const cell = sheet[address];
    if (cell && (cell.v !== undefined || cell.f)) cells[address] = { value: cell.v ?? null, type: cell.t, formula: cell.f || "" };
  }
}
// Approved corrections: keep Jan–Jun numerator/denominator in the remaining formula cells.
const corrections = [];
for (const [sheetRow, numerator, denominator] of [[114, 116, 115], [117, 119, 118], [120, 122, 121], [126, 128, 127]]) {
  const row = rows.find((item) => item.sheetRow === sheetRow);
  for (let month = 6; month < 12; month++) {
    const column = String.fromCharCode(79 + month);
    const formula = `IFERROR(${column}${numerator}/${column}${denominator},"")`;
    corrections.push({ cell: `${column}${sheetRow}`, original: row.formulas[month], formula });
    row.formulas[month] = formula;
  }
}
const absenteeism = rows.find((item) => item.sheetRow === 142);
corrections.push({ cell: "N142", original: absenteeism.ytdFormula, formula: 'IFERROR(AVERAGE(O142:Z142),"")' });
absenteeism.ytdFormula = corrections.at(-1).formula;
const template = { area: "ENTREGA", year: 2026, source: "GEROT ENTREGA1.xlsx", sheet: "GEROT 2026", corrections, rows };
writeFileSync("assets/js/gerot-delivery-data.js", `// Generated from the GEROT 2026 sheet. BASE_FOCO is not part of the GEROT indicator grid.\nexport const GEROT_DELIVERY = ${JSON.stringify(template, null, 2)};\n`);
mkdirSync("tests/fixtures", { recursive: true });
writeFileSync("tests/fixtures/gerot-delivery-workbook.json", JSON.stringify({ source: template.source, cells }, null, 2) + "\n");
console.log(`Imported ${rows.length} rows and ${Object.keys(cells).length} reference cells.`);
