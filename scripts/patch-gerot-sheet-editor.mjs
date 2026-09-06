import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const CRITICAL_SEED = [{"id":"entrega-8","sheetRow":8,"type":"","indicator":"DIAS ÚTEIS","product":"","unit":"N°","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":null,"ytdFormula":null,"monthly":[26,23,26,25,25,25,27,26,null,27,null,null],"formulas":[null,null,null,null,null,null,null,null,null,null,null,null],"calculationInput":true,"displayFormat":"N°"},{"id":"entrega-11","sheetRow":11,"type":"IV CRÍTICO","indicator":"Atrasos - TML","product":"PRODUTIVIDADE","unit":"%","eoy2024":0.515732546705998,"eoy2025":0.06,"target":0.0599,"targetMode":"ME","referenceYtd":0.12671509281678772,"ytdFormula":"IFERROR(N18/N19,\"\")","monthly":[0.03956043956043956,0.047619047619047616,0.2194139194139194,0.1916190476190476,0.15771428571428572,0.136,0.09135802469135802,null,null,null,null,null],"formulas":["IFERROR(O18/O19,\"\")","IFERROR(P18/P19,\"\")","IFERROR(Q18/Q19,\"\")","IFERROR(R18/R19,\"\")","IFERROR(S18/S19,\"\")","IFERROR(T18/T19,\"\")","IFERROR(U18/U19,\"\")","IFERROR(V18/V19,\"\")","IFERROR(W18/W19,\"\")","IFERROR(X18/X19,\"\")","IFERROR(Y18/Y19,\"\")","IFERROR(Z18/Z19,\"\")"],"calculationInput":false,"displayFormat":"%"},{"id":"entrega-12","sheetRow":12,"type":"","indicator":"Motorista %","product":"","unit":"%","eoy2024":0.552317880794702,"eoy2025":0.590621039290241,"target":"-","targetMode":"","referenceYtd":0.12235673930589185,"ytdFormula":"IFERROR(N14/N16,\"\")","monthly":[0.031868131868131866,0.062111801242236024,0.21868131868131868,0.20685714285714285,0.12228571428571429,0.12114285714285715,0.091005291005291,null,null,null,null,null],"formulas":["IFERROR(O14/O16,\"\")","IFERROR(P14/P16,\"\")","IFERROR(Q14/Q16,\"\")","IFERROR(R14/R16,\"\")","IFERROR(S14/S16,\"\")","IFERROR(T14/T16,\"\")","IFERROR(U14/U16,\"\")","IFERROR(V14/V16,\"\")","IFERROR(W14/W16,\"\")","IFERROR(X14/X16,\"\")","IFERROR(Y14/Y16,\"\")","IFERROR(Z14/Z16,\"\")"],"calculationInput":true,"displayFormat":"%"},{"id":"entrega-13","sheetRow":13,"type":"","indicator":"Ajudante %","product":"","unit":"%","eoy2024":0.494136043784206,"eoy2025":0.502529510961214,"target":"-","targetMode":"","referenceYtd":0.12889426957223568,"ytdFormula":"IFERROR(N15/N17,\"\")","monthly":[0.043406593406593405,0.040372670807453416,0.21978021978021978,0.184,0.17542857142857143,0.14342857142857143,0.09153439153439154,null,null,null,null,null],"formulas":["IFERROR(O15/O17,\"\")","IFERROR(P15/P17,\"\")","IFERROR(Q15/Q17,\"\")","IFERROR(R15/R17,\"\")","IFERROR(S15/S17,\"\")","IFERROR(T15/T17,\"\")","IFERROR(U15/U17,\"\")","IFERROR(V15/V17,\"\")","IFERROR(W15/W17,\"\")","IFERROR(X15/X17,\"\")","IFERROR(Y15/Y17,\"\")","IFERROR(Z15/Z17,\"\")"],"calculationInput":true,"displayFormat":"%"},{"id":"entrega-14","sheetRow":14,"type":"","indicator":"ATRASOS Motorista","product":"","unit":"","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":758,"ytdFormula":"SUM(O14:Z14)","monthly":[29,50,199,181,107,106,86,null,null,null,null,null],"formulas":[null,null,null,null,null,null,null,null,null,null,null,null],"calculationInput":true,"displayFormat":"N°"},{"id":"entrega-15","sheetRow":15,"type":"","indicator":"ATRASOS Ajudante","product":"","unit":"","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":1597,"ytdFormula":"SUM(O15:Z15)","monthly":[79,65,400,322,307,251,173,null,null,null,null,null],"formulas":[null,null,null,null,null,null,null,null,null,null,null,null],"calculationInput":true,"displayFormat":"N°"},{"id":"entrega-16","sheetRow":16,"type":"","indicator":"TT Motorista","product":"","unit":"","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":6195,"ytdFormula":"SUM(O16:Z16)","monthly":[910,805,910,875,875,875,945,null,null,null,null,null],"formulas":["35*O8","35*P8","35*Q8","35*R8","35*S8","35*T8","35*U8","35*V8","35*W8","35*X8","35*Y8","35*Z8"],"calculationInput":true,"displayFormat":"N°"},{"id":"entrega-17","sheetRow":17,"type":"","indicator":"TT Ajudante","product":"","unit":"","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":12390,"ytdFormula":"SUM(O17:Z17)","monthly":[1820,1610,1820,1750,1750,1750,1890,null,null,null,null,null],"formulas":["O16*2","P16*2","Q16*2","R16*2","S16*2","T16*2","U16*2","V16*2","W16*2","X16*2","Y16*2","Z16*2"],"calculationInput":true,"displayFormat":"N°"},{"id":"entrega-18","sheetRow":18,"type":"","indicator":"TT Atrasos","product":"","unit":"","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":2355,"ytdFormula":"SUM(O18:Z18)","monthly":[108,115,599,503,414,357,259,null,null,null,null,null],"formulas":["IF(SUM(O14:O15)=0,\"\",(SUM(O14:O15)))","IF(SUM(P14:P15)=0,\"\",(SUM(P14:P15)))","IF(SUM(Q14:Q15)=0,\"\",(SUM(Q14:Q15)))","IF(SUM(R14:R15)=0,\"\",(SUM(R14:R15)))","IF(SUM(S14:S15)=0,\"\",(SUM(S14:S15)))","IF(SUM(T14:T15)=0,\"\",(SUM(T14:T15)))","IF(SUM(U14:U15)=0,\"\",(SUM(U14:U15)))","IF(SUM(V14:V15)=0,\"\",(SUM(V14:V15)))","IF(SUM(W14:W15)=0,\"\",(SUM(W14:W15)))","IF(SUM(X14:X15)=0,\"\",(SUM(X14:X15)))","IF(SUM(Y14:Y15)=0,\"\",(SUM(Y14:Y15)))","IF(SUM(Z14:Z15)=0,\"\",(SUM(Z14:Z15)))"],"calculationInput":true,"displayFormat":"N°"},{"id":"entrega-19","sheetRow":19,"type":"","indicator":"TT Funcionários","product":"","unit":"","eoy2024":null,"eoy2025":null,"target":null,"targetMode":"","referenceYtd":18585,"ytdFormula":"SUM(O19:Z19)","monthly":[2730,2415,2730,2625,2625,2625,2835,null,null,null,null,null],"formulas":["IF(SUM(O16:O17)=0,\"\",(SUM(O16:O17)))","IF(SUM(P16:P17)=0,\"\",(SUM(P16:P17)))","IF(SUM(Q16:Q17)=0,\"\",(SUM(Q16:Q17)))","IF(SUM(R16:R17)=0,\"\",(SUM(R16:R17)))","IF(SUM(S16:S17)=0,\"\",(SUM(S16:S17)))","IF(SUM(T16:T17)=0,\"\",(SUM(T16:T17)))","IF(SUM(U16:U17)=0,\"\",(SUM(U16:U17)))","IF(SUM(V16:V17)=0,\"\",(SUM(V16:V17)))","IF(SUM(W16:W17)=0,\"\",(SUM(W16:W17)))","IF(SUM(X16:X17)=0,\"\",(SUM(X16:X17)))","IF(SUM(Y16:Y17)=0,\"\",(SUM(Y16:Y17)))","IF(SUM(Z16:Z17)=0,\"\",(SUM(Z16:Z17)))"],"calculationInput":true,"displayFormat":"N°"}];

function replaceOnce(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Trecho não encontrado: ${label}`);
  return text.replace(from, to);
}

async function patchImportedGerot() {
  const file = resolve('assets/js/gerot-imports.js');
  const module = await import(`${pathToFileURL(file).href}?patch=${Date.now()}`);
  const areas = structuredClone(module.IMPORTED_GEROT_AREAS);
  const entrega = areas.find((item) => item.area === 'ENTREGA');
  if (!entrega) throw new Error('Área ENTREGA não encontrada');
  const criticalIds = new Set(CRITICAL_SEED.map((item) => item.id));
  const existing = new Map(entrega.rows.map((row) => [String(row.id), row]));
  const critical = CRITICAL_SEED.map((seed) => {
    const previous = existing.get(seed.id);
    const preserveInput = [8, 14, 15].includes(seed.sheetRow) && Array.isArray(previous?.monthly);
    return { ...previous, ...seed, monthly: preserveInput ? Array.from({ length: 12 }, (_, index) => index in previous.monthly ? previous.monthly[index] : seed.monthly[index]) : [...seed.monthly] };
  });
  entrega.rows = [...entrega.rows.filter((row) => !criticalIds.has(String(row.id))), ...critical].sort((a, b) => Number(a.sheetRow || 9999) - Number(b.sheetRow || 9999));
  await fs.writeFile(file, `export const IMPORTED_GEROT_AREAS = ${JSON.stringify(areas)};\n`);
}

async function patchFormulaEngine() {
  const file = 'assets/js/modules/index.js';
  let text = await fs.readFile(file, 'utf8');
  text = replaceOnce(text, 'const GEROT_MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];', '// GEROT_FORMULA_ENGINE_V2_20260906\nconst GEROT_MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];', 'marcador do motor');
  text = replaceOnce(text,
`  const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const cell = (reference) => {
    const match = String(reference).match(/^([A-Z]+)(\\d+)$/);
    if (!match) return null;
    const [, column, rowNumber] = match;
    const source = rowsBySheetRow.get(Number(rowNumber));
    if (!source) return null;
    if (column === "N") return gerotYtd(source, rows, true, nextStack);
    const index = gerotColumnIndex(column);
    if (index < 0 || index > 11) return null;
    const sourceFormula = arrayValue(source.formulas)[index];
    return sourceFormula ? gerotSpreadsheetFormula(source, rows, sourceFormula, index, nextStack) : numeric(source.monthly?.[index]);
  };`,
`  const numeric = (value) => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const cell = (reference) => {
    const match = String(reference).match(/^([A-Z]+)(\\d+)$/);
    if (!match) return Number.NaN;
    const [, column, rowNumber] = match;
    const source = rowsBySheetRow.get(Number(rowNumber));
    if (!source) return Number.NaN;
    if (column === "N") {
      const resolved = gerotYtd(source, rows, true, nextStack);
      return Number.isFinite(resolved) ? resolved : Number.NaN;
    }
    const index = gerotColumnIndex(column);
    if (index < 0 || index > 11) return Number.NaN;
    const sourceFormula = arrayValue(source.formulas)[index];
    const resolved = sourceFormula ? gerotSpreadsheetFormula(source, rows, sourceFormula, index, nextStack) : numeric(source.monthly?.[index]);
    return Number.isFinite(resolved) ? resolved : Number.NaN;
  };`, 'propagação de células vazias');
  text = replaceOnce(text, '.replace(/^IF\\((SUM\\([^)]*\\))=0,"",\\(?\\1\\)?\\)$/i, "$1")', '.replace(/^IF\\((SUM\\([^)]*\\))=0,"",\\(?\\1\\)?\\)$/i, "($1===0?NaN:$1)")', 'IF de soma vazia');
  text = replaceOnce(text, '      const editable = !arrayValue(row.formulaInputs).length && !arrayValue(row.formulas).some(Boolean);', '      const editable = data.area === "ARMAZÉM" ? !arrayValue(row.formulaInputs).length : !spreadsheetFormula;', 'edição célula a célula');
  await fs.writeFile(file, text);
}

const SHEET_EDITOR_CODE = `
// GEROT_SHEET_EDITOR_V2_20260906
const GEROT_SHEET_MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function gerotSheetEscape(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function gerotSheetFormat(value, format = "N°") {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "–";
  const number = Number(value);
  if (format === "%") return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
  if (format === "HORA" || format === "MIN") {
    const totalMinutes = Math.round(number * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.abs(totalMinutes % 60);
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(number);
}

function gerotSheetInputValue(value, format = "N°") {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "";
  const number = Number(value);
  if (format === "%") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(number * 100);
  if (format === "HORA" || format === "MIN") return gerotSheetFormat(number, format);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(number);
}

function gerotSheetTarget(row) {
  const format = row.displayFormat || row.unit || "N°";
  if (row.goalMode === "range" && Number.isFinite(Number(row.targetMin)) && Number.isFinite(Number(row.targetMax))) return gerotSheetFormat(row.targetMin, format) + " a " + gerotSheetFormat(row.targetMax, format);
  if (row.target === null || row.target === undefined || row.target === "") return "–";
  if (!Number.isFinite(Number(row.target))) return String(row.target);
  return gerotSheetFormat(row.target, format);
}

function gerotSheetRowClass(row) {
  const type = String(row.type || "").toLocaleUpperCase("pt-BR");
  if (type.includes("IV CRÍTICO")) return "gerot-sheet-row--critical";
  if (type === "IV") return "gerot-sheet-row--iv";
  if (type === "IC") return "gerot-sheet-row--ic";
  return row.calculationInput ? "gerot-sheet-row--memory" : "";
}

function closeGerotSpreadsheetEditor(editor, force = false) {
  if (!editor) return;
  if (!force && editor.dataset.gerotDirty === "true" && !window.confirm("Descartar as alterações ainda não salvas?")) return;
  editor.remove();
  document.body.classList.remove("gerot-sheet-editor-open");
}

function openGerotSpreadsheetEditor(scope, areaName) {
  const area = state.dataCache.gerot?.areas?.find((item) => item.area === areaName);
  if (!area) throw new Error("Área do GEROT não encontrada.");
  const existing = scope.querySelector("[data-gerot-sheet-editor]");
  if (existing) return;
  const preview = new Map(gerotLivePreview(area).map((row) => [String(row.id), row]));
  const rows = [...(area.rows || [])].sort((left, right) => Number(left.sheetRow || 9999) - Number(right.sheetRow || 9999));
  const editableCells = rows.reduce((total, row) => total + GEROT_SHEET_MONTHS.filter((_, index) => !(row.formulas || [])[index] && !(areaName === "ARMAZÉM" && (row.formulaInputs || []).length)).length, 0);
  const formulaCells = rows.reduce((total, row) => total + (row.formulas || []).filter(Boolean).length, 0);
  const body = rows.map((row) => {
    const rowPreview = preview.get(String(row.id));
    const format = row.displayFormat || row.unit || "N°";
    const months = GEROT_SHEET_MONTHS.map((month, index) => {
      const formula = (row.formulas || [])[index];
      const warehouseFormula = areaName === "ARMAZÉM" && (row.formulaInputs || []).length;
      const isFormula = Boolean(formula || warehouseFormula);
      const result = rowPreview?.monthly?.[index];
      if (isFormula) return '<td class="gerot-sheet-formula" data-gerot-row-value="' + gerotSheetEscape(row.id) + '" data-gerot-month-value="' + index + '" title="' + gerotSheetEscape(formula ? '=' + formula : 'Calculado automaticamente') + '"><span class="gerot-sheet-fx">ƒx</span><span class="gerot-result">' + gerotSheetEscape(result?.display || "–") + '</span></td>';
      return '<td class="gerot-sheet-editable"><input data-gerot-input data-gerot-row="' + gerotSheetEscape(row.id) + '" data-gerot-month="' + index + '" data-gerot-format="' + gerotSheetEscape(format) + '" type="text" inputmode="decimal" value="' + gerotSheetEscape(gerotSheetInputValue(row.monthly?.[index], format)) + '" aria-label="' + gerotSheetEscape(row.indicator) + ' em ' + month + '"></td>';
    }).join("");
    return '<tr class="' + gerotSheetRowClass(row) + '"><td class="gerot-sheet-line">' + gerotSheetEscape(row.sheetRow || "") + '</td><td class="gerot-sheet-type">' + gerotSheetEscape(row.type || "") + '</td><th scope="row" class="gerot-sheet-indicator">' + gerotSheetEscape(row.indicator || "") + '</th><td>' + gerotSheetEscape(row.product || "") + '</td><td>' + gerotSheetEscape(row.unit || "") + '</td><td>' + gerotSheetEscape(gerotSheetFormat(row.eoy2024, format)) + '</td><td>' + gerotSheetEscape(gerotSheetFormat(row.eoy2025, format)) + '</td><td class="gerot-sheet-meta">' + gerotSheetEscape(gerotSheetTarget(row)) + '</td><td class="gerot-sheet-ytd ' + gerotSheetEscape(rowPreview?.ytd?.status || "") + '" data-gerot-ytd="' + gerotSheetEscape(row.id) + '" title="' + gerotSheetEscape(row.ytdFormula ? '=' + row.ytdFormula : 'Acumulado automático') + '">' + gerotSheetEscape(rowPreview?.ytd?.display || "–") + '</td>' + months + '</tr>';
  }).join("");
  const editor = document.createElement("section");
  editor.className = "gerot-sheet-editor gerot-card is-editing";
  editor.dataset.gerotSheetEditor = "";
  editor.dataset.gerotSheetArea = areaName;
  editor.dataset.gerotDirty = "false";
  editor.innerHTML = '<header class="gerot-sheet-toolbar"><div><span class="eyebrow">EDIÇÃO EM FORMATO DE PLANILHA</span><h2>GEROT DPO ' + gerotSheetEscape(area.year || 2026) + ' · ' + gerotSheetEscape(areaName) + '</h2><p>Células brancas são editáveis. Células com ƒx vêm da fórmula da planilha e recalculam automaticamente.</p></div><div class="gerot-sheet-toolbar-actions"><span class="gerot-sheet-status" data-gerot-live-preview>Pronto para editar</span><button class="button secondary" type="button" data-gerot-sheet-close>Voltar sem salvar</button><button class="button primary" type="button" data-gerot-sheet-save>Salvar e voltar</button></div></header><div class="gerot-sheet-info"><span><strong>' + rows.length + '</strong> linhas</span><span><strong>' + editableCells + '</strong> células mensais editáveis</span><span><strong>' + formulaCells + '</strong> fórmulas protegidas</span><span>Enter: próxima célula da coluna · Ctrl/Cmd+S: salvar · aceita colar do Excel</span></div><div class="gerot-sheet-scroll"><table class="gerot-sheet-table"><thead><tr><th>Linha</th><th>TIPO</th><th>INDICADOR</th><th>PRODUTO</th><th>UN.</th><th>EOY 2023</th><th>EOY 2025</th><th>META 2026</th><th>YTD 2026</th>' + GEROT_SHEET_MONTHS.map((month) => '<th>' + month + '</th>').join("") + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  scope.appendChild(editor);
  document.body.classList.add("gerot-sheet-editor-open");
  refreshGerotPreview(editor);
  window.requestAnimationFrame(() => {
    const first = editor.querySelector("[data-gerot-input]");
    first?.focus();
    first?.select?.();
  });
}
`;

async function patchApp() {
  const file = 'assets/js/app.js';
  let text = await fs.readFile(file, 'utf8');
  if (!text.includes('// GEROT_SHEET_EDITOR_V2_20260906')) {
    text = text.replace('\n\nfunction addGerotEditorControls(data) {', `\n${SHEET_EDITOR_CODE}\nfunction addGerotEditorControls(data) {`);
  }
  text = replaceOnce(text,
`function handleGerotKeydown(event) {
  const input = event.target.closest?.("[data-gerot-input]");
  if (!input || event.key !== "Enter") return;
  event.preventDefault();`,
`function handleGerotKeydown(event) {
  const input = event.target.closest?.("[data-gerot-input]");
  if (!input) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    const editor = input.closest("[data-gerot-sheet-editor]");
    if (editor) {
      event.preventDefault();
      editor.querySelector("[data-gerot-sheet-save]")?.click();
    }
    return;
  }
  if (event.key !== "Enter") return;
  event.preventDefault();`, 'atalho de teclado');
  text = replaceOnce(text,
`      gerotPreviewFrame = window.requestAnimationFrame(() => refreshGerotPreview(scope));
      scheduleGerotSharedSave(scope);`,
`      gerotPreviewFrame = window.requestAnimationFrame(() => refreshGerotPreview(scope));
      if (scope.matches("[data-gerot-sheet-editor]")) scope.dataset.gerotDirty = "true";
      else scheduleGerotSharedSave(scope);`, 'autosave do editor planilha');
  text = replaceOnce(text,
`    status.hidden = false;
    status.textContent = "Resultados atualizados em tempo real · sincronizando";`,
`    status.hidden = false;
    status.textContent = scope.matches("[data-gerot-sheet-editor]") ? "Cálculos atualizados · alterações ainda não salvas" : "Resultados atualizados em tempo real · sincronizando";`, 'status do editor');
  const oldEdit = `  const gerotEditButton = event.target.closest("[data-gerot-edit]");
  if (gerotEditButton) {
    const actionArea = gerotEditButton.dataset.gerotActionArea;
    const scope = (actionArea && [...elements.pageContent.querySelectorAll("[data-gerot-panel]")].find((panel) => panel.dataset.gerotPanel === actionArea)) || gerotEditButton.closest("[data-gerot-panel]") || elements.pageContent;
    scope.querySelector("[data-gerot-display-board]")?.setAttribute("hidden", "");
    scope.querySelector("[data-gerot-editor-layout]")?.removeAttribute("hidden");
    scope.querySelector(".gerot-card")?.classList.add("is-editing");
    scope.querySelectorAll("[data-gerot-input]").forEach((input) => { input.disabled = false; });
    const firstGerotInput = scope.querySelector("[data-gerot-input]:not([disabled])");
    firstGerotInput?.focus();
    firstGerotInput?.select?.();
    gerotEditButton.hidden = true;
    const saveButton = gerotEditButton.parentElement?.querySelector("[data-gerot-save]") || scope.querySelector("[data-gerot-save]");
    if (saveButton) saveButton.hidden = false;
    showToast("Edição mensal liberada.");
    return;
  }
`;
  const newEdit = `  const gerotSheetCloseButton = event.target.closest("[data-gerot-sheet-close]");
  if (gerotSheetCloseButton) {
    closeGerotSpreadsheetEditor(gerotSheetCloseButton.closest("[data-gerot-sheet-editor]"));
    return;
  }

  const gerotSheetSaveButton = event.target.closest("[data-gerot-sheet-save]");
  if (gerotSheetSaveButton) {
    const editor = gerotSheetSaveButton.closest("[data-gerot-sheet-editor]");
    const areaName = editor?.dataset.gerotSheetArea || "ARMAZÉM";
    const restoreButton = setButtonBusy(gerotSheetSaveButton, "Salvando...");
    if (!editor || !restoreButton) return;
    try {
      window.clearTimeout(gerotAutoSaveTimer);
      await saveGerotEditor(editor);
      editor.dataset.gerotDirty = "false";
      closeGerotSpreadsheetEditor(editor, true);
      await loadView("gerot");
      const selector = elements.pageContent.querySelector("[data-gerot-area]");
      if (selector && [...selector.options].some((option) => option.value === areaName)) {
        selector.value = areaName;
        selector.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (error) {
      handleError(error, "Não foi possível atualizar o GEROT.");
    } finally {
      restoreButton();
    }
    return;
  }

  const gerotEditButton = event.target.closest("[data-gerot-edit]");
  if (gerotEditButton) {
    const actionArea = gerotEditButton.dataset.gerotActionArea;
    const scope = (actionArea && [...elements.pageContent.querySelectorAll("[data-gerot-panel]")].find((panel) => panel.dataset.gerotPanel === actionArea)) || gerotEditButton.closest("[data-gerot-panel]") || elements.pageContent;
    const areaName = actionArea || scope.closest("[data-gerot-panel]")?.dataset.gerotPanel || "ARMAZÉM";
    openGerotSpreadsheetEditor(scope, areaName);
    return;
  }
`;
  text = replaceOnce(text, oldEdit, newEdit, 'abertura do editor em tela própria');
  await fs.writeFile(file, text);
}

async function patchLocalSave() {
  const file = 'assets/js/api.js';
  let text = await fs.readFile(file, 'utf8');
  text = replaceOnce(text,
`    if (!row || arrayValue(row.formulas).some(Boolean) || !Array.isArray(update.monthly)) return;
    row.monthly = GEROT_MONTHS.map((_, index) => update.monthly[index] === null || update.monthly[index] === "" || typeof update.monthly[index] === "undefined" ? null : Number(update.monthly[index]));`,
`    if (!row || !Array.isArray(update.monthly)) return;
    row.monthly = GEROT_MONTHS.map((_, index) => {
      if (arrayValue(row.formulas)[index]) return row.monthly?.[index] ?? null;
      const value = update.monthly[index];
      return value === null || value === "" || typeof value === "undefined" ? null : Number(value);
    });`, 'salvamento célula a célula local');
  await fs.writeFile(file, text);
}

async function patchSharedRuntime() {
  const file = 'recovered/runtime.js';
  let text = await fs.readFile(file, 'utf8');
  const seedLiteral = JSON.stringify(CRITICAL_SEED);
  if (!text.includes('var gerotEntregaCriticalSeed =')) {
    text = text.replace('/* ASSET_MAP */\n\nvar auditActionSeed =', `/* ASSET_MAP */\n\nvar gerotEntregaCriticalSeed = ${seedLiteral};\n\nfunction repairGerotEntrega(area) {\n  if (!area || !Array.isArray(area.rows)) return area;\n  const criticalIds = new Set(gerotEntregaCriticalSeed.map((seed) => String(seed.id)));\n  const existing = new Map(area.rows.map((row) => [String(row?.id), row]));\n  const repaired = gerotEntregaCriticalSeed.map((seed) => {\n    const previous = existing.get(String(seed.id));\n    const transformed = { ...seed, sourceMonthly: [...seed.monthly], goalMode: seed.targetMode === \"MA\" ? \"higher\" : seed.targetMode === \"ME\" ? \"lower\" : seed.targetMode === \"ABS\" ? \"absolute\" : \"none\" };\n    const preserveInput = [8, 14, 15].includes(Number(seed.sheetRow)) && Array.isArray(previous?.monthly);\n    const monthly = preserveInput ? Array.from({ length: 12 }, (_, index) => index in previous.monthly ? previous.monthly[index] : seed.monthly[index]) : [...seed.monthly];\n    return { ...previous, ...transformed, monthly };\n  });\n  area.rows = [...area.rows.filter((row) => !criticalIds.has(String(row?.id))), ...repaired].sort((a, b) => Number(a?.sheetRow || 9999) - Number(b?.sheetRow || 9999));\n  area.calculatedYtd = true;\n  return area;\n}\n__name(repairGerotEntrega, \"repairGerotEntrega\");\n\nvar auditActionSeed =`);
  }
  text = replaceOnce(text,
`  if (!data) return data;
  const base =`,
`  if (!data) return data;
  if (data.gerotAdditionalAreas?.ENTREGA) repairGerotEntrega(data.gerotAdditionalAreas.ENTREGA);
  if (gerotData?.gerotAdditionalAreas?.ENTREGA) repairGerotEntrega(gerotData.gerotAdditionalAreas.ENTREGA);
  const base =`, 'reparo do GEROT compartilhado');
  text = replaceOnce(text,
`      const record = source && structuredClone(source);
      if (!record || !Array.isArray(record.rows) || !Array.isArray(body?.rows)) return Response.json({ error: "\\xC1rea do GEROT n\\xE3o encontrada." }, { status: 404 });
      for (const update of body.rows) {
        const row = record.rows.find((item) => String(item?.id) === String(update?.id));
        const hasFormula = area === "ARMAZ\\xC9M" ? Array.isArray(row?.formulaInputs) && row.formulaInputs.length > 0 : Array.isArray(row?.formulas) && row.formulas.some(Boolean);
        if (!row || hasFormula || !Array.isArray(update?.monthly)) continue;
        row.monthly = Array.from({ length: 12 }, (_, index) => {
          const value = update.monthly[index];
          return value === "" || value === null || typeof value === "undefined" ? null : Number(value);
        });
      }`,
`      const record = source && structuredClone(source);
      if (!record || !Array.isArray(record.rows) || !Array.isArray(body?.rows)) return Response.json({ error: "\\xC1rea do GEROT n\\xE3o encontrada." }, { status: 404 });
      if (area === "ENTREGA") repairGerotEntrega(record);
      for (const update of body.rows) {
        const row = record.rows.find((item) => String(item?.id) === String(update?.id));
        if (!row || !Array.isArray(update?.monthly)) continue;
        row.monthly = Array.from({ length: 12 }, (_, index) => {
          const rowFormula = area === "ARMAZ\\xC9M" ? (Array.isArray(row?.formulaInputs) && row.formulaInputs.length > 0) : (Array.isArray(row?.formulas) && Boolean(row.formulas[index]));
          if (rowFormula) return row.monthly?.[index] ?? null;
          const value = update.monthly[index];
          return value === "" || value === null || typeof value === "undefined" ? null : Number(value);
        });
      }`, 'salvamento compartilhado célula a célula');
  await fs.writeFile(file, text);
}

async function patchCss() {
  const file = 'assets/css/styles.css';
  let text = await fs.readFile(file, 'utf8');
  if (!text.includes('GEROT SHEET EDITOR V2 20260906')) {
    text += `\n\n/* GEROT SHEET EDITOR V2 20260906 */\nbody.gerot-sheet-editor-open{overflow:hidden!important}.gerot-sheet-editor{position:fixed;inset:0;z-index:1400;display:grid!important;grid-template-rows:auto auto minmax(0,1fr);padding:0!important;border:0!important;border-radius:0!important;background:#f2f5f8;color:#17233a}.gerot-sheet-toolbar{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 18px;border-bottom:1px solid #c9d2df;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.08);z-index:3}.gerot-sheet-toolbar h2{margin:5px 0 2px;font:700 1.15rem var(--font-display);color:#10244a}.gerot-sheet-toolbar p{margin:0;color:#68758a;font-size:.76rem}.gerot-sheet-toolbar-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.gerot-sheet-status{min-width:190px;color:#325a9b;font-size:.72rem;font-weight:700}.gerot-sheet-info{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:7px 18px;border-bottom:1px solid #d5dde8;background:#f8fafc;color:#667085;font-size:.68rem}.gerot-sheet-info strong{color:#17233a}.gerot-sheet-scroll{min-height:0;overflow:auto;background:#e9eef4}.gerot-sheet-table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:11px;background:#fff}.gerot-sheet-table th,.gerot-sheet-table td{height:30px;min-width:82px;padding:4px 6px;border-right:1px solid #d9e0e8;border-bottom:1px solid #d9e0e8;white-space:nowrap;text-align:center;font-variant-numeric:tabular-nums}.gerot-sheet-table thead th{position:sticky;top:0;z-index:15;height:34px;background:#27364d;color:#fff;font-size:10px;font-weight:800;letter-spacing:.025em}.gerot-sheet-table th:nth-child(1),.gerot-sheet-table td:nth-child(1){position:sticky;left:0;z-index:8;min-width:48px;width:48px;background:#f4f6f8;color:#7a8494}.gerot-sheet-table th:nth-child(2),.gerot-sheet-table td:nth-child(2){position:sticky;left:48px;z-index:8;min-width:86px;width:86px}.gerot-sheet-table th:nth-child(3),.gerot-sheet-table td:nth-child(3){position:sticky;left:134px;z-index:8;min-width:245px;width:245px;text-align:left}.gerot-sheet-table thead th:nth-child(-n+3){z-index:20;background:#27364d;color:#fff}.gerot-sheet-table td:nth-child(4){min-width:130px;text-align:left}.gerot-sheet-table td:nth-child(5){min-width:58px}.gerot-sheet-table .gerot-sheet-indicator{font-weight:700;color:#17233a}.gerot-sheet-table .gerot-sheet-meta{background:#fff1a8;font-weight:800;color:#664d03}.gerot-sheet-editable{background:#fff!important;padding:2px!important}.gerot-sheet-editable input{display:block!important;width:100%;height:25px;min-width:76px;padding:2px 6px;border:1px solid transparent;border-radius:2px;background:#fff;color:#17233a;text-align:right;font:600 11px var(--font-sans);outline:0}.gerot-sheet-editable input:hover{border-color:#9bb3d4;background:#f8fbff}.gerot-sheet-editable input:focus{border-color:#2563eb!important;box-shadow:inset 0 0 0 1px #2563eb,0 0 0 2px rgba(37,99,235,.12);background:#fff!important}.gerot-sheet-formula,.gerot-sheet-ytd{position:relative;background:#e9edf2!important;color:#4f5d73;font-weight:700}.gerot-sheet-formula .gerot-result{display:inline!important}.gerot-sheet-fx{position:absolute;left:3px;top:2px;color:#8794a8;font-size:8px;font-style:italic}.gerot-sheet-row--critical>td:nth-child(2),.gerot-sheet-row--critical>.gerot-sheet-indicator{background:#ffd966!important;color:#4a3900!important}.gerot-sheet-row--iv>td:nth-child(2),.gerot-sheet-row--iv>.gerot-sheet-indicator{background:#a9d18e!important;color:#244515!important}.gerot-sheet-row--ic>td:nth-child(2),.gerot-sheet-row--ic>.gerot-sheet-indicator{background:#f4b183!important;color:#5c2d0b!important}.gerot-sheet-row--memory td:nth-child(2),.gerot-sheet-row--memory .gerot-sheet-indicator{background:#f2f4f7;color:#697386;font-weight:600}.gerot-sheet-table td.success{background:#dff2e6!important;color:#17633d}.gerot-sheet-table td.danger{background:#fbe2e4!important;color:#9b2733}@media(max-width:900px){.gerot-sheet-toolbar{align-items:flex-start;flex-direction:column}.gerot-sheet-toolbar-actions{width:100%;justify-content:flex-start}.gerot-sheet-status{min-width:0}.gerot-sheet-table th:nth-child(3),.gerot-sheet-table td:nth-child(3){min-width:190px;width:190px}}.dark-mode .gerot-sheet-editor{background:#0a1628;color:#e7edf7}.dark-mode .gerot-sheet-toolbar{background:#10203a;border-color:#304560}.dark-mode .gerot-sheet-toolbar h2,.dark-mode .gerot-sheet-info strong{color:#edf3fc}.dark-mode .gerot-sheet-toolbar p,.dark-mode .gerot-sheet-info{color:#a8b5c8}.dark-mode .gerot-sheet-info{background:#0f1d32;border-color:#304560}.dark-mode .gerot-sheet-scroll{background:#071221}.dark-mode .gerot-sheet-table{background:#10203a}.dark-mode .gerot-sheet-table td{border-color:#304158}.dark-mode .gerot-sheet-editable,.dark-mode .gerot-sheet-editable input{background:#10203a!important;color:#edf3fc}.dark-mode .gerot-sheet-formula,.dark-mode .gerot-sheet-ytd{background:#1b2a41!important;color:#b8c5d8}.dark-mode .gerot-sheet-table th:nth-child(1),.dark-mode .gerot-sheet-table td:nth-child(1),.dark-mode .gerot-sheet-row--memory td:nth-child(2),.dark-mode .gerot-sheet-row--memory .gerot-sheet-indicator{background:#15243a;color:#b6c2d3}\n`;
  }
  await fs.writeFile(file, text);
}

async function writeRegressionTest() {
  const test = `import assert from 'node:assert/strict';\nimport { IMPORTED_GEROT_AREAS } from '../assets/js/gerot-imports.js';\nimport { gerotLivePreview } from '../assets/js/modules/index.js';\n\nconst area = IMPORTED_GEROT_AREAS.find((item) => item.area === 'ENTREGA');\nassert(area, 'GEROT ENTREGA não encontrado');\nconst bySheet = new Map(area.rows.map((row) => [Number(row.sheetRow), row]));\nassert.equal(bySheet.get(8)?.indicator, 'DIAS ÚTEIS');\nassert.equal(bySheet.get(8)?.formulas?.filter(Boolean).length, 0);\nassert.equal(bySheet.get(16)?.formulas?.[0], '35*O8');\nassert.equal(bySheet.get(17)?.formulas?.[0], 'O16*2');\nassert.equal(bySheet.get(11)?.formulas?.[0], 'IFERROR(O18/O19,\"\")');\n\nlet preview = new Map(gerotLivePreview(area).map((row) => [row.id, row]));\nassert(Math.abs(preview.get('entrega-11').monthly[0].value - (108 / 2730)) < 1e-12, 'IV crítico JAN incorreto');\nassert(Math.abs(preview.get('entrega-11').monthly[6].value - (259 / 2835)) < 1e-12, 'IV crítico JUL incorreto');\nassert.equal(preview.get('entrega-11').monthly[8].value, null, 'Mês sem preenchimento não pode virar 0%');\n\npreview = new Map(gerotLivePreview(area, { 'entrega-8': { 7: 26 }, 'entrega-14': { 7: 10 }, 'entrega-15': { 7: 20 } }).map((row) => [row.id, row]));\nassert.equal(preview.get('entrega-16').monthly[7].value, 910, 'TT Motorista não recalculou pelos dias úteis');\nassert.equal(preview.get('entrega-17').monthly[7].value, 1820, 'TT Ajudante não recalculou');\nassert.equal(preview.get('entrega-18').monthly[7].value, 30, 'TT Atrasos não recalculou');\nassert.equal(preview.get('entrega-19').monthly[7].value, 2730, 'TT Funcionários não recalculou');\nassert(Math.abs(preview.get('entrega-11').monthly[7].value - (30 / 2730)) < 1e-12, 'IV crítico não recalculou automaticamente');\nconsole.log('GEROT ENTREGA: IV crítico, células vazias e fórmulas automáticas validados');\n`;
  await fs.writeFile('tests/gerot-entrega.test.mjs', test);
}

async function patchDeployTest() {
  const file = '.github/workflows/deploy-worker.yml';
  let text = await fs.readFile(file, 'utf8');
  if (!text.includes('node tests/gerot-entrega.test.mjs')) {
    text = text.replace('preCommands: npm run build && ', 'preCommands: npm run build && node tests/gerot-entrega.test.mjs && ');
  }
  await fs.writeFile(file, text);
}

await patchImportedGerot();
await patchFormulaEngine();
await patchApp();
await patchLocalSave();
await patchSharedRuntime();
await patchCss();
await writeRegressionTest();
await patchDeployTest();
console.log('PATCH_GEROT_SHEET_EDITOR_OK');
