import { createDeliveryCalculator, deliveryCellKind, deliveryInputValue, parseDeliveryInput } from "./gerot-delivery-engine.js?v=20260906-01";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const escape = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function display(value, row, month = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const kind = deliveryCellKind(row, month);
  if (kind === "time") return deliveryInputValue(value, kind);
  return new Intl.NumberFormat("pt-BR", kind === "percent" ? { style: "percent", maximumFractionDigits: 2, minimumFractionDigits: 2 } : { maximumFractionDigits: 2 }).format(value);
}

export function openDeliveryEditor(panel, data, onSave) {
  const existing = panel.querySelector("[data-delivery-editor]");
  if (existing) { existing.hidden = false; return; }
  const draft = structuredClone(data.rows).sort((a, b) => (a.sheetRow || 9999) - (b.sheetRow || 9999));
  draft.forEach((row) => { row.monthly = Array.from({ length: 12 }, (_, index) => row.monthly?.[index] === "" ? null : row.monthly?.[index] ?? null); row.formulas ||= Array(12).fill(""); });
  const original = new Map(data.rows.map((row) => [row.id, row]));
  const byId = new Map(draft.map((row) => [row.id, row]));
  const undo = [], redo = [], collapsed = new Set();
  let currentGroup = "", busy = false, activeInput = null, lastFocus = document.activeElement;
  const groups = new Map();
  const groupByRow = new Map();
  for (const row of draft) {
    if (!row.calculationInput || !currentGroup) { currentGroup = row.id; groups.set(currentGroup, []); }
    groups.get(currentGroup).push(row); groupByRow.set(row.id, currentGroup);
  }
  const calculator = createDeliveryCalculator(draft);
  const tableRows = draft.map((row) => {
    const isGroup = groups.has(row.id), group = groupByRow.get(row.id);
    return `<tr data-delivery-line="${row.id}" data-delivery-group="${group}" class="${isGroup ? "delivery-indicator" : "delivery-memory"}">
      <th scope="row" class="delivery-row-name"><span class="delivery-row-index">${row.sheetRow}</span>${isGroup && groups.get(group).length > 1 ? `<button type="button" data-delivery-collapse="${group}" aria-expanded="true" aria-label="Recolher memória de ${escape(row.indicator)}">−</button>` : "<span class=\"delivery-indent\"></span>"}<span><strong>${escape(row.indicator)}</strong>${isGroup ? `<small>${escape(row.product || (row.sheetRow === 8 ? "Base dos cálculos de atrasos" : "Indicador"))}</small>` : ""}</span></th>
      <td class="delivery-unit">${escape(row.unit || "Nº")}</td><td class="delivery-target">${display(row.target === "-" ? null : row.target, row)}</td>
      <td class="delivery-ytd" data-delivery-result="${row.id}:ytd">${display(calculator.value(row), row)}</td>
      ${MONTHS.map((month, index) => {
        const formula = row.formulas?.[index], kind = deliveryCellKind(row, index), address = `${String.fromCharCode(79 + index)}${row.sheetRow}`;
        return formula ? `<td class="delivery-calculated" data-delivery-column="${index}" tabindex="0" data-delivery-formula="${escape(formula)}" data-delivery-address="${address}" data-delivery-row="${row.id}" data-delivery-result="${row.id}:${index}" aria-label="${escape(row.indicator)} em ${month}, calculado automaticamente">${display(calculator.value(row, index), row, index)}</td>` :
          `<td class="delivery-editable" data-delivery-column="${index}"><input type="text" inputmode="${kind === "time" ? "text" : "decimal"}" autocomplete="off" spellcheck="false" data-delivery-input data-delivery-row="${row.id}" data-delivery-month="${index}" data-delivery-kind="${kind}" data-delivery-address="${address}" value="${escape(deliveryInputValue(row.monthly[index], kind))}" placeholder="${kind === "time" ? "hh:mm" : "—"}" aria-label="${escape(row.indicator)} em ${month}${kind === "percent" ? ", em porcentagem" : ""}">${kind === "percent" ? '<span class="delivery-percent">%</span>' : ""}</td>`;
      }).join("")}</tr>`;
  }).join("");
  const editor = document.createElement("section");
  editor.dataset.deliveryEditor = "";
  editor.className = "delivery-editor";
  editor.setAttribute("role", "dialog"); editor.setAttribute("aria-modal", "true"); editor.setAttribute("aria-label", "Editar planilha GEROT Entrega");
  editor.innerHTML = `
    <header class="delivery-heading"><div><span class="eyebrow">GEROT · ENTREGA</span><h2>Planilha de preenchimento <span>${data.year || 2026}</span></h2><p>Preencha os campos claros. As células com fórmula e o acumulado são calculados automaticamente.</p></div><button type="button" class="button ghost" data-delivery-close aria-label="Fechar edição">Fechar ✕</button></header>
    <div class="delivery-controls"><label class="delivery-search"><span>Buscar indicador ou memória</span><input type="search" data-delivery-search placeholder="Ex.: devolução, frota, OTIF…"></label><label><span>Período</span><select data-delivery-period><option value="all">Ano completo</option>${MONTHS.map((month, index) => `<option value="${index}">${month} · ${data.year || 2026}</option>`).join("")}</select></label><label class="delivery-only-inputs"><input type="checkbox" data-delivery-only-inputs> Somente linhas preenchíveis</label><div class="delivery-history"><button class="button ghost" type="button" data-delivery-undo disabled title="Desfazer (Ctrl+Z)">↶ Desfazer</button><button class="button ghost" type="button" data-delivery-redo disabled title="Refazer (Ctrl+Y)">↷ Refazer</button></div></div>
    <div class="delivery-formula-bar"><span data-delivery-active-address>—</span><strong data-delivery-active-kind>Preenchimento</strong><span data-delivery-active-help>Use Tab ou Enter para avançar. Você também pode colar um intervalo do Excel.</span></div>
    <div class="delivery-grid-scroll"><table class="delivery-grid"><caption class="sr-only">GEROT Entrega, indicadores e memórias na ordem da planilha, janeiro a dezembro</caption><thead><tr><th scope="col" class="delivery-row-name">Indicador / memória de cálculo</th><th scope="col">Unidade</th><th scope="col">Meta 2026</th><th scope="col" class="delivery-ytd">YTD 2026 <small>automático</small></th>${MONTHS.map((month, index) => `<th scope="col" data-delivery-column="${index}">${month}<small>${String.fromCharCode(79 + index)}</small></th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table><p data-delivery-empty hidden>Nenhum indicador encontrado. Tente outro termo.</p></div>
    <footer class="delivery-footer"><div><div class="delivery-editor-legend"><span>◇ Preenchível</span><span>ƒx Automático</span><span>% Digite 95 para 95%</span><span>Horas: 08:30</span></div><p data-delivery-status role="status" aria-live="polite">Nenhuma alteração pendente.</p></div><div class="delivery-footer-actions"><button type="button" class="button secondary" data-delivery-cancel>Cancelar</button><button type="button" class="button primary" data-delivery-submit disabled>Salvar alterações</button></div></footer>`;
  panel.append(editor);
  // Keep the dialog outside ancestors that may clip the spreadsheet or hide area panels.
  document.body.append(editor);
  const q = (selector) => editor.querySelector(selector);
  const inputs = [...editor.querySelectorAll("[data-delivery-input]")];
  const outputs = [...editor.querySelectorAll("[data-delivery-result]")];
  const inputMap = new Map(inputs.map((input) => [`${input.dataset.deliveryRow}:${input.dataset.deliveryMonth}`, input]));
  const lineMap = new Map([...editor.querySelectorAll("[data-delivery-line]")].map((line) => [line.dataset.deliveryLine, line]));
  const previousInert = [...document.body.children].filter((child) => child !== editor && child instanceof HTMLElement).map((child) => [child, child.inert]);
  previousInert.forEach(([child]) => { child.inert = true; });

  function changedCells() {
    return inputs.filter((input) => {
      const { deliveryRow: id, deliveryMonth: month } = input.dataset;
      return (byId.get(id).monthly[month] ?? null) !== (original.get(id).monthly[month] === "" ? null : original.get(id).monthly[month] ?? null);
    });
  }
  function refresh() {
    const calc = createDeliveryCalculator(draft);
    for (const output of outputs) {
      const [id, month] = output.dataset.deliveryResult.split(":");
      const row = byId.get(id);
      output.textContent = display(calc.value(row, month === "ytd" ? null : Number(month)), row, month === "ytd" ? 0 : Number(month));
    }
    const changes = changedCells();
    inputs.forEach((input) => input.closest("td").classList.toggle("is-changed", changes.includes(input)));
    const invalid = inputs.filter((input) => input.getAttribute("aria-invalid") === "true");
    q("[data-delivery-status]").textContent = invalid.length ? `${invalid.length} campo(s) inválido(s). Corrija o preenchimento para salvar.` : changes.length ? `${changes.length} célula(s) alterada(s) · cálculos atualizados · ainda não salvo.` : "Nenhuma alteração pendente.";
    q("[data-delivery-submit]").disabled = busy || !changes.length || Boolean(invalid.length);
    q("[data-delivery-undo]").disabled = busy || !undo.length;
    q("[data-delivery-redo]").disabled = busy || !redo.length;
  }
  function setInput(input, value) {
    byId.get(input.dataset.deliveryRow).monthly[Number(input.dataset.deliveryMonth)] = value;
    input.value = deliveryInputValue(value, input.dataset.deliveryKind);
    input.removeAttribute("aria-invalid"); input.setCustomValidity("");
  }
  function filter() {
    const query = normalized(q("[data-delivery-search]").value), period = q("[data-delivery-period]").value;
    const editableOnly = q("[data-delivery-only-inputs]").checked;
    for (const [id, members] of groups) {
      const matches = !query || members.some((row) => normalized(`${row.indicator} ${row.product}`).includes(query));
      for (const row of members) {
        const editable = period === "all" ? row.formulas.some((formula) => !formula) : !row.formulas[Number(period)];
        lineMap.get(row.id).hidden = !matches || (editableOnly && !editable) || (!query && collapsed.has(id) && row.id !== id);
      }
    }
    editor.querySelectorAll("[data-delivery-column]").forEach((cell) => { cell.hidden = period !== "all" && cell.dataset.deliveryColumn !== period; });
    q(".delivery-grid").classList.toggle("is-single-month", period !== "all");
    q("[data-delivery-empty]").hidden = [...lineMap.values()].some((line) => !line.hidden);
  }
  function close() {
    if (busy) return;
    if ((changedCells().length || inputs.some((input) => input.getAttribute("aria-invalid") === "true")) && !window.confirm("Descartar as alterações não salvas do GEROT Entrega?")) return;
    destroy();
  }
  function destroy() {
    window.removeEventListener("beforeunload", beforeUnload);
    previousInert.forEach(([child, inert]) => { child.inert = inert; });
    editor.remove(); if (lastFocus?.isConnected) lastFocus.focus();
  }
  function beforeUnload(event) {
    if (changedCells().length || inputs.some((input) => input.getAttribute("aria-invalid") === "true")) { event.preventDefault(); event.returnValue = ""; }
  }
  window.addEventListener("beforeunload", beforeUnload);
  editor.addEventListener("focusin", (event) => {
    const cell = event.target.closest("[data-delivery-address]");
    if (!cell) return;
    activeInput = cell.matches("input") ? cell : null;
    q("[data-delivery-active-address]").textContent = cell.dataset.deliveryAddress;
    q("[data-delivery-active-kind]").textContent = activeInput ? "Preenchível" : "ƒx Automático";
    q("[data-delivery-active-help]").textContent = activeInput ? `${byId.get(cell.dataset.deliveryRow).indicator} · ${MONTHS[Number(cell.dataset.deliveryMonth)]} · ${cell.dataset.deliveryKind === "percent" ? "Digite 95 para 95%." : cell.dataset.deliveryKind === "time" ? "Duração em horas:minutos:segundos." : "Aceita números com vírgula decimal."}` : `=${cell.dataset.deliveryFormula}`;
  });
  editor.addEventListener("input", (event) => {
    const input = event.target.closest("[data-delivery-input]");
    if (!input) { if (event.target.matches("[data-delivery-search]")) filter(); return; }
    try {
      const value = parseDeliveryInput(input.value, input.dataset.deliveryKind), row = byId.get(input.dataset.deliveryRow), month = Number(input.dataset.deliveryMonth), before = row.monthly[month] ?? null;
      input.removeAttribute("aria-invalid"); input.setCustomValidity("");
      if (value !== before) { undo.push([{ input, before, after: value }]); redo.length = 0; row.monthly[month] = value; }
    } catch (error) { input.setAttribute("aria-invalid", "true"); input.setCustomValidity(error.message); q("[data-delivery-active-help]").textContent = error.message; }
    refresh();
  });
  editor.addEventListener("change", (event) => { if (event.target.matches("[data-delivery-period], [data-delivery-only-inputs]")) filter(); });
  editor.addEventListener("paste", (event) => {
    const input = event.target.closest("[data-delivery-input]");
    if (!input) return;
    const text = event.clipboardData?.getData("text/plain") || "";
    if (!/[\t\r\n]/.test(text)) return;
    event.preventDefault();
    const matrix = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
    const startRow = draft.findIndex((row) => row.id === input.dataset.deliveryRow), startMonth = Number(input.dataset.deliveryMonth), transaction = [];
    try {
      if (startRow + matrix.length > draft.length || matrix.some((line) => startMonth + line.length > 12)) throw new Error("O intervalo colado ultrapassa os limites da planilha.");
      matrix.forEach((line, rowOffset) => line.forEach((textValue, colOffset) => {
        const row = draft[startRow + rowOffset], month = startMonth + colOffset;
        const target = inputMap.get(`${row.id}:${month}`);
        if (!target) return; // Formula cells retain their original coordinates and are never overwritten.
        const after = parseDeliveryInput(textValue, target.dataset.deliveryKind), before = row.monthly[month] ?? null;
        if (after !== before) transaction.push({ input: target, before, after });
      }));
      transaction.forEach((change) => setInput(change.input, change.after));
      if (transaction.length) { undo.push(transaction); redo.length = 0; }
      refresh();
    } catch (error) { q("[data-delivery-status]").textContent = `Nenhuma célula foi colada. ${error.message}`; }
  });
  function history(backwards) {
    const source = backwards ? undo : redo, target = backwards ? redo : undo;
    const transaction = source.pop(); if (!transaction || busy) return;
    transaction.forEach((change) => setInput(change.input, backwards ? change.before : change.after));
    target.push(transaction); refresh();
  }
  editor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); q("[data-delivery-submit]").click(); return; }
    if ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())) { event.preventDefault(); history(event.key.toLowerCase() === "z" && !event.shiftKey); return; }
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Tab") {
      const focusable = [...editor.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')].filter((item) => item.getClientRects().length);
      if (event.shiftKey && event.target === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && event.target === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    }
    if (event.key === "Enter" && activeInput && event.target === activeInput) {
      event.preventDefault(); const visible = inputs.filter((item) => item.getClientRects().length && item.dataset.deliveryMonth === activeInput.dataset.deliveryMonth);
      const index = visible.indexOf(activeInput); visible[index + (event.shiftKey ? -1 : 1)]?.focus();
    }
  });
  editor.addEventListener("click", async (event) => {
    if (event.target.closest("[data-delivery-close], [data-delivery-cancel]")) return close();
    if (event.target.closest("[data-delivery-undo]")) return history(true);
    if (event.target.closest("[data-delivery-redo]")) return history(false);
    const toggle = event.target.closest("[data-delivery-collapse]");
    if (toggle) { const id = toggle.dataset.deliveryCollapse; collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id); toggle.textContent = collapsed.has(id) ? "+" : "−"; toggle.setAttribute("aria-expanded", String(!collapsed.has(id))); filter(); return; }
    if (!event.target.closest("[data-delivery-submit]") || busy) return;
    const changes = changedCells();
    if (!changes.length || inputs.some((input) => input.getAttribute("aria-invalid") === "true")) return;
    busy = true; refresh();
    const controls = [...editor.querySelectorAll("button, input, select")];
    controls.forEach((control) => { control.disabled = true; });
    q("[data-delivery-submit]").textContent = "Salvando…";
    q("[data-delivery-status]").textContent = "Salvando alterações…";
    try {
      await onSave(changes.map((input) => ({ id: input.dataset.deliveryRow, month: Number(input.dataset.deliveryMonth), value: byId.get(input.dataset.deliveryRow).monthly[Number(input.dataset.deliveryMonth)] })));
      destroy();
    } catch (error) {
      busy = false; controls.forEach((control) => { control.disabled = false; }); refresh();
      q("[data-delivery-submit]").textContent = "Salvar alterações";
      q("[data-delivery-status]").textContent = `Não foi possível salvar. ${error.message}`;
    }
  });
  refresh(); q("[data-delivery-search]").focus();
}
