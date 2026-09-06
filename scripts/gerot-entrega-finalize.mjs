import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = (file) => fs.readFile(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFile(path.join(root, file), content, 'utf8');
const mustReplace = (source, search, replacement, label) => {
  if (!source.includes(search)) throw new Error(`Trecho não encontrado para ${label}`);
  return source.replace(search, replacement);
};
const months = ['O','P','Q','R','S','T','U','V','W','X','Y','Z'];
const colNumber = (column) => [...column].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0);
const colName = (value) => {
  let out = '';
  while (value > 0) {
    const next = (value - 1) % 26;
    out = String.fromCharCode(65 + next) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
};
const shiftFormula = (formula, offset) => String(formula || '').replace(/(\$?)([A-Z]{1,2})(\$?)(\d+)/g, (_, absCol, col, absRow, row) => `${absCol}${colName(colNumber(col) + offset)}${absRow}${row}`);
const ytdToMonth = (formula, month) => {
  const text = String(formula || '');
  if (!text || /\b(?:AVERAGE|SUM)\s*\(\s*O\d+\s*:\s*Z\d+/i.test(text)) return null;
  const translated = text.replace(/(\$?)N(\$?)(\d+)/g, (_, absCol, absRow, row) => `${absCol}${month}${absRow}${row}`);
  return translated === text ? null : translated;
};
const numbers = (values) => (Array.isArray(values) ? values : []).filter((value) => value !== null && value !== '' && Number.isFinite(Number(value))).map(Number);
const nearly = (left, right) => Math.abs(Number(left) - Number(right)) <= Math.max(1e-8, Math.abs(Number(right)) * 1e-6);

// A referência existente já veio desta mesma planilha. Aqui corrigimos o que a primeira importação
// perdeu: memória oculta de dias úteis, fórmulas compartilhadas e unidades/formatos incoerentes.
const importPath = path.join(root, 'assets/js/gerot-imports.js');
const current = await import(`${pathToFileURL(importPath).href}?v=${Date.now()}`);
const existingAreas = Array.isArray(current.IMPORTED_GEROT_AREAS) ? current.IMPORTED_GEROT_AREAS : [];
const entregaIndex = existingAreas.findIndex((area) => area.area === 'ENTREGA');
if (entregaIndex < 0) throw new Error('Área ENTREGA não encontrada na referência atual.');
const entrega = structuredClone(existingAreas[entregaIndex]);
if (!Array.isArray(entrega.rows) || entrega.rows.length < 125) throw new Error('Referência ENTREGA incompleta.');
const byId = new Map(entrega.rows.map((row) => [String(row.id), row]));
for (const id of ['entrega-11','entrega-20','entrega-40','entrega-68','entrega-111','entrega-140']) {
  if (!byId.has(id)) throw new Error(`Linha obrigatória ausente: ${id}`);
}
if (!nearly(byId.get('entrega-11').referenceYtd, 0.12671509281678772)) throw new Error('A referência ENTREGA não corresponde ao arquivo recebido.');

if (!byId.has('entrega-8')) {
  entrega.rows.unshift({
    id: 'entrega-8', sheetRow: 8, type: '', indicator: 'DIAS ÚTEIS', product: '', unit: 'N°',
    eoy2024: null, eoy2025: null, target: null, targetMode: '', referenceYtd: null, ytdFormula: null,
    monthly: [26,23,26,25,25,25,27,26,null,27,null,null], formulas: Array(12).fill(null), calculationInput: true
  });
}

for (const row of entrega.rows) {
  row.monthly = Array.from({ length: 12 }, (_, index) => row.monthly?.[index] ?? null);
  row.formulas = Array.from({ length: 12 }, (_, index) => row.formulas?.[index] || null);

  // Fórmulas compartilhadas do Excel: usa a primeira fórmula mensal como padrão e a replica corretamente.
  const firstFormulaIndex = row.formulas.findIndex(Boolean);
  if (firstFormulaIndex >= 0) {
    const base = row.formulas[firstFormulaIndex];
    const baseColumn = colNumber(months[firstFormulaIndex]);
    row.formulas = months.map((month) => shiftFormula(base, colNumber(month) - baseColumn));
  } else if (row.ytdFormula) {
    const derived = months.map((month) => ytdToMonth(row.ytdFormula, month));
    if (derived.some(Boolean)) row.formulas = derived;
  }

  // Completa YTDs que eram apenas valores cacheados no Excel.
  if (!row.ytdFormula && Number.isFinite(Number(row.referenceYtd))) {
    const valid = numbers(row.monthly);
    if (valid.length) {
      const sum = valid.reduce((total, value) => total + value, 0);
      const average = sum / valid.length;
      if (nearly(row.referenceYtd, sum)) row.ytdFormula = `SUM(O${row.sheetRow}:Z${row.sheetRow})`;
      else if (nearly(row.referenceYtd, average) || row.formulas.some(Boolean)) row.ytdFormula = `AVERAGE(O${row.sheetRow}:Z${row.sheetRow})`;
    }
  }
}

const refreshed = new Map(entrega.rows.map((row) => [String(row.id), row]));
for (const id of ['entrega-11','entrega-12','entrega-13']) {
  const row = refreshed.get(id);
  if (row) row.unit = '%';
}
const dqi = refreshed.get('entrega-40');
if (dqi) dqi.unit = 'PPM';
const nps = refreshed.get('entrega-140');
if (nps && Number(nps.eoy2025) > 1.5) nps.eoy2025 = Number(nps.eoy2025) / 100;
const days = refreshed.get('entrega-8');
const ttMotorista = refreshed.get('entrega-16');
if (!days || !ttMotorista?.formulas?.[0]?.includes('O8')) throw new Error('Memória de dias úteis não vinculada ao TML.');
const onTime = refreshed.get('entrega-114');
if (onTime && onTime.formulas?.[6] && !/U116\/U115/.test(onTime.formulas[6])) throw new Error('Fórmula ON TIME de JUL não foi corrigida.');

const nextAreas = existingAreas.map((area, index) => index === entregaIndex ? entrega : area);
await write('assets/js/gerot-imports.js', `export const IMPORTED_GEROT_AREAS = ${JSON.stringify(nextAreas)};\n`);

// Entrada em formato natural: percentual como 95,3; hora como 08:30; números com vírgula decimal.
let modules = await read('assets/js/modules/index.js');
const helperMarker = 'function gerotUnwrapIfError(formula) {';
if (!modules.includes('function gerotInputValue(')) {
  const helpers = `function gerotInputValue(value, displayFormat = "") {\n  if (value === null || value === undefined || value === "") return "";\n  const number = Number(value);\n  if (!Number.isFinite(number)) return "";\n  if (displayFormat === "%") return new Intl.NumberFormat("pt-BR", { useGrouping: false, maximumFractionDigits: 4 }).format(number * 100);\n  if (displayFormat === "HORA" || displayFormat === "MIN") {\n    const totalSeconds = Math.round(number * 86400);\n    const hours = Math.floor(totalSeconds / 3600);\n    const minutes = Math.floor((totalSeconds % 3600) / 60);\n    const seconds = totalSeconds % 60;\n    return seconds ? \`${'${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}'}\` : \`${'${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}'}\`;\n  }\n  return new Intl.NumberFormat("pt-BR", { useGrouping: false, maximumFractionDigits: 6 }).format(number);\n}\n\nfunction gerotInputMode(displayFormat = "") {\n  return displayFormat === "HORA" || displayFormat === "MIN" ? "numeric" : "decimal";\n}\n\n`;
  modules = mustReplace(modules, helperMarker, helpers + helperMarker, 'helpers de entrada GEROT');
}
const oldInput = 'type="number" step="any" value="${value ?? ""}" disabled aria-label="${escapeHtml(row.indicator)} em ${month}">';
const newInput = 'type="text" inputmode="${gerotInputMode(row.displayFormat || row.unit)}" data-gerot-format="${escapeHtml(row.displayFormat || row.unit || "N°")}" value="${escapeHtml(gerotInputValue(value, row.displayFormat || row.unit))}" disabled aria-label="${escapeHtml(row.indicator)} em ${month}">';
if (modules.includes(oldInput)) modules = modules.replace(oldInput, newInput);
if (!modules.includes('data-gerot-format=')) throw new Error('Entrada GEROT não foi atualizada.');
await write('assets/js/modules/index.js', modules);

let app = await read('assets/js/app.js');
if (!app.includes('function parseGerotInput(')) {
  const marker = 'function gerotEditorRows(scope) {';
  const helpers = `function parseGerotInput(input) {\n  const raw = String(input?.value || "").trim();\n  if (!raw) return null;\n  const format = input?.dataset?.gerotFormat || "";\n  if (format === "HORA" || format === "MIN") {\n    if (/^\\d{1,3}:\\d{1,2}(?::\\d{1,2})?$/.test(raw)) {\n      const [hours, minutes, seconds = "0"] = raw.split(":").map(Number);\n      if (minutes < 60 && seconds < 60) return (hours * 3600 + minutes * 60 + seconds) / 86400;\n    }\n  }\n  const normalized = raw.replace(/\\s/g, "").replace(/\\.(?=\\d{3}(?:\\D|$))/g, "").replace(",", ".").replace(/%$/, "");\n  const number = Number(normalized);\n  if (!Number.isFinite(number)) return null;\n  return format === "%" ? number / 100 : number;\n}\n\nfunction gerotEditableInputs(scope) {\n  return [...scope.querySelectorAll("[data-gerot-input]:not([disabled])")].filter((input) => input.offsetParent !== null);\n}\n\nfunction handleGerotKeydown(event) {\n  const input = event.target.closest?.("[data-gerot-input]");\n  if (!input || event.key !== "Enter") return;\n  event.preventDefault();\n  const scope = input.closest(".gerot-card");\n  if (!scope) return;\n  const month = input.dataset.gerotMonth;\n  const sameMonth = gerotEditableInputs(scope).filter((item) => item.dataset.gerotMonth === month);\n  const index = sameMonth.indexOf(input);\n  const target = event.shiftKey ? sameMonth[index - 1] : sameMonth[index + 1];\n  (target || input).focus();\n  (target || input).select?.();\n}\n\nfunction handleGerotPaste(event) {\n  const input = event.target.closest?.("[data-gerot-input]");\n  if (!input) return;\n  const text = event.clipboardData?.getData("text") || "";\n  if (!/[\\t\\r\\n]/.test(text)) return;\n  const scope = input.closest(".gerot-card");\n  const table = input.closest("table");\n  const startRow = input.closest("tr");\n  if (!scope || !table || !startRow) return;\n  event.preventDefault();\n  const matrix = text.replace(/\\r/g, "").split("\\n").filter((line, index, list) => line || index < list.length - 1).map((line) => line.split("\\t"));\n  const bodyRows = [...table.querySelectorAll("tbody tr")];\n  const startRowIndex = bodyRows.indexOf(startRow);\n  const startMonth = Number(input.dataset.gerotMonth);\n  matrix.forEach((cells, rowOffset) => {\n    const row = bodyRows[startRowIndex + rowOffset];\n    if (!row) return;\n    cells.forEach((value, colOffset) => {\n      const target = row.querySelector(\`[data-gerot-input][data-gerot-month="${'${startMonth + colOffset}'}"]\`);\n      if (!target || target.disabled) return;\n      target.value = value.trim();\n      target.dispatchEvent(new Event("input", { bubbles: true }));\n    });\n  });\n}\n\n`;
  app = mustReplace(app, marker, helpers + marker, 'parser e navegação GEROT');
}
app = app.replace('rows.get(id).monthly[Number(input.dataset.gerotMonth)] = input.value === "" ? null : Number(input.value);', 'rows.get(id).monthly[Number(input.dataset.gerotMonth)] = parseGerotInput(input);');
const enableLine = 'scope.querySelectorAll("[data-gerot-input]").forEach((input) => { input.disabled = false; });';
if (app.includes(enableLine) && !app.includes('firstGerotInput')) {
  app = app.replace(enableLine, `${enableLine}\n    const firstGerotInput = scope.querySelector("[data-gerot-input]:not([disabled])");\n    firstGerotInput?.focus();\n    firstGerotInput?.select?.();`);
}
const wireMarker = 'elements.pageContent.addEventListener("input", handleDynamicInput);';
if (!app.includes('addEventListener("keydown", handleGerotKeydown)')) {
  app = mustReplace(app, wireMarker, `${wireMarker}\n  elements.pageContent.addEventListener("keydown", handleGerotKeydown);\n  elements.pageContent.addEventListener("paste", handleGerotPaste);`, 'eventos de teclado GEROT');
}
await write('assets/js/app.js', app);

// Ajuste visual restrito ao GEROT: tabela mais baixa, inputs legíveis e memória discreta.
let css = await read('assets/css/styles.css');
const cssMarker = '/* GEROT ENTREGA spreadsheet refinement 2026-09-06 */';
if (!css.includes(cssMarker)) {
  css += `\n${cssMarker}\n.gerot-card .table-scroll{max-height:72vh;border-radius:10px}.gerot-table{border-collapse:separate;border-spacing:0}.gerot-table th,.gerot-table td{padding:5px 7px;min-width:72px;font-size:11px;line-height:1.2}.gerot-table th:nth-child(1),.gerot-table td:nth-child(1){min-width:76px}.gerot-table th:nth-child(2),.gerot-table td:nth-child(2){min-width:210px;max-width:260px}.gerot-table th:nth-child(3),.gerot-table td:nth-child(3){min-width:56px}.gerot-table thead th{position:sticky;top:0;z-index:3}.gerot-memory-row td{background:rgba(226,232,240,.36);font-size:10.5px}.gerot-memory-row td:nth-child(2) strong{font-weight:600;color:var(--muted-text,#64748b)}.gerot-card.is-editing [data-gerot-input]{display:block;width:100%;min-width:66px;height:27px;padding:3px 5px;border:1px solid #9db2d2;border-radius:5px;background:#fff;text-align:center;font:inherit;color:inherit;box-sizing:border-box}.gerot-card.is-editing [data-gerot-input]:focus{outline:2px solid rgba(37,99,235,.24);border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.08)}.gerot-card.is-editing .gerot-result{display:none}.gerot-card:not(.is-editing) [data-gerot-input]{display:none}.gerot-editor-actions{gap:6px}.gerot-toolbar{padding:8px 10px}.gerot-board-scroll table th,.gerot-board-scroll table td{padding:5px 7px;font-size:11px}.dark-mode .gerot-memory-row td{background:rgba(51,65,85,.38)}.dark-mode .gerot-card.is-editing [data-gerot-input]{background:#0f203d;border-color:#425b80;color:#e5edf9}\n`;
}
await write('assets/css/styles.css', css);

// Remove resíduos das tentativas temporárias; eles não fazem parte da versão final.
for (const file of [
  '.github/workflows/gerot-entrega-once.yml',
  'scripts/patch-gerot-entrega.mjs',
  '.github/workflows/gerot-entrega-finalize.yml',
  'scripts/gerot-entrega-finalize.mjs'
]) {
  await fs.rm(path.join(root, file), { force: true });
}

console.log(`GEROT ENTREGA corrigido: ${entrega.rows.length} linhas de referência; demais áreas preservadas.`);
