import { createDeliveryCalculator, deliveryCellKind, deliveryInputValue, parseDeliveryInput } from "./gerot-delivery-engine.js?v=20260906-01";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const escape = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const normalized = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function display(value, row, month = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const kind = deliveryCellKind(row, month);
  if (kind === "time") return deliveryInputValue(value, kind);
  return new Intl.NumberFormat("pt-BR", kind === "percent"
    ? { style: "percent", maximumFractionDigits: 2, minimumFractionDigits: 2 }
    : { maximumFractionDigits: 2 }).format(value);
}

function areaLabel(area = "") {
  const value = String(area || "").trim();
  if (!value) return "GEROT";
  return value.charAt(0) + value.slice(1).toLocaleLowerCase("pt-BR");
}

function isCalculatedCell(data, row, month) {
  if (String(data.area).toUpperCase() === "ARMAZÉM") return Array.isArray(row.formulaInputs) && row.formulaInputs.length > 0;
  return Boolean(row.formulas?.[month]);
}

function calculationHelp(data, row, month, byId) {
  const formula = row.formulas?.[month];
  if (formula) return `=${formula}`;
  if (String(data.area).toUpperCase() === "ARMAZÉM" && Array.isArray(row.formulaInputs) && row.formulaInputs.length) {
    const labels = row.formulaInputs.map((id) => byId.get(id)?.indicator || id);
    return `Calculado automaticamente a partir de: ${labels.join(" · ")}`;
  }
  return "Calculado automaticamente.";
}

function orderRows(data, rows) {
  if (String(data.area).toUpperCase() !== "ARMAZÉM") {
    return [...rows].sort((left, right) => Number(left.sheetRow || 9999) - Number(right.sheetRow || 9999));
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const rendered = new Set();
  const ordered = [];
  const addDependencies = (row, visited = new Set()) => {
    for (const id of row.formulaInputs || []) {
      if (visited.has(id) || rendered.has(id)) continue;
      const dependency = byId.get(id);
      if (!dependency) continue;
      const nextVisited = new Set(visited).add(id);
      rendered.add(id);
      ordered.push(dependency);
      addDependencies(dependency, nextVisited);
    }
  };
  rows.filter((row) => !row.calculationInput).forEach((row) => {
    if (!rendered.has(row.id)) {
      rendered.add(row.id);
      ordered.push(row);
    }
    addDependencies(row);
  });
  rows.filter((row) => !rendered.has(row.id)).forEach((row) => {
    rendered.add(row.id);
    ordered.push(row);
  });
  return ordered;
}

function buildGroups(data, rows) {
  const groups = new Map();
  const groupByRow = new Map();
  if (String(data.area).toUpperCase() === "ARMAZÉM") {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const claimed = new Set();
    for (const row of rows.filter((item) => !item.calculationInput)) {
      const members = [row];
      const add = (id) => {
        if (claimed.has(id)) return;
        const dependency = byId.get(id);
        if (!dependency) return;
        claimed.add(id);
        members.push(dependency);
        (dependency.formulaInputs || []).forEach(add);
      };
      (row.formulaInputs || []).forEach(add);
      groups.set(row.id, members);
      members.forEach((member) => groupByRow.set(member.id, row.id));
    }
    rows.filter((row) => !groupByRow.has(row.id)).forEach((row) => {
      groups.set(row.id, [row]);
      groupByRow.set(row.id, row.id);
    });
    return { groups, groupByRow };
  }

  let currentGroup = "";
  for (const row of rows) {
    if (!row.calculationInput || !currentGroup) {
      currentGroup = row.id;
      groups.set(currentGroup, []);
    }
    groups.get(currentGroup).push(row);
    groupByRow.set(row.id, currentGroup);
  }
  return { groups, groupByRow };
}

function fallbackPreview(data, rows) {
  const calculator = createDeliveryCalculator(rows);
  return rows.map((row) => ({
    id: String(row.id),
    ytd: { value: calculator.value(row) },
    monthly: MONTHS.map((_, month) => ({ value: calculator.value(row, month) }))
  }));
}

export function openDeliveryEditor(panel, data, onSave, calculatePreview = null) {
  const existing = document.querySelector("[data-delivery-editor]");
  if (existing) { existing.hidden = false; return; }

  const draft = orderRows(data, structuredClone(data.rows || []));
  draft.forEach((row, index) => {
    row.monthly = Array.from({ length: 12 }, (_, month) => row.monthly?.[month] === "" ? null : row.monthly?.[month] ?? null);
    row.formulas ||= Array(12).fill("");
    row.__displayRow = row.sheetRow || index + 1;
  });

  const original = new Map((data.rows || []).map((row) => [String(row.id), {
    ...row,
    monthly: Array.from({ length: 12 }, (_, month) => row.monthly?.[month] === "" ? null : row.monthly?.[month] ?? null)
  }]));
  const byId = new Map(draft.map((row) => [String(row.id), row]));
  const { groups, groupByRow } = buildGroups(data, draft);
  const undo = [], redo = [], collapsed = new Set();
  let busy = false, activeInput = null, lastFocus = document.activeElement;

  const previewFor = (rows) => {
    const items = typeof calculatePreview === "function" ? calculatePreview(rows) : fallbackPreview(data, rows);
    return new Map((items || []).map((item) => [String(item.id), item]));
  };
  let preview = previewFor(draft);

  const tableRows = draft.map((row) => {
    const group = groupByRow.get(row.id);
    const members = groups.get(group) || [row];
    const isGroup = group === row.id;
    const rowPreview = preview.get(String(row.id));
    const label = row.product || (row.calculationInput ? "Memória de cálculo" : "Indicador");
    const cells = MONTHS.map((month, monthIndex) => {
      const kind = deliveryCellKind(row, monthIndex);
      const address = `${String.fromCharCode(79 + monthIndex)}${row.__displayRow}`;
      if (isCalculatedCell(data, row, monthIndex)) {
        const help = calculationHelp(data, row, monthIndex, byId);
        return `<td class="delivery-calculated" data-delivery-column="${monthIndex}" tabindex="0" data-delivery-formula="${escape(help)}" data-delivery-address="${address}" data-delivery-row="${escape(row.id)}" data-delivery-result="${escape(row.id)}:${monthIndex}" aria-label="${escape(row.indicator)} em ${month}, calculado automaticamente">${display(rowPreview?.monthly?.[monthIndex]?.value, row, monthIndex)}</td>`;
      }
      return `<td class="delivery-editable" data-delivery-column="${monthIndex}"><input type="text" inputmode="${kind === "time" ? "text" : "decimal"}" autocomplete="off" spellcheck="false" data-delivery-input data-delivery-row="${escape(row.id)}" data-delivery-month="${monthIndex}" data-delivery-kind="${kind}" data-delivery-address="${address}" value="${escape(deliveryInputValue(row.monthly[monthIndex], kind))}" placeholder="${kind === "time" ? "hh:mm" : "—"}" aria-label="${escape(row.indicator)} em ${month}${kind === "percent" ? ", em porcentagem" : ""}">${kind === "percent" ? '<span class="delivery-percent">%</span>' : ""}</td>`;
    }).join("");

    return `<tr data-delivery-line="${escape(row.id)}" data-delivery-group="${escape(group)}" class="${row.calculationInput ? "delivery-memory" : "delivery-indicator"}">
      <th scope="row" class="delivery-row-name"><span class="delivery-row-index">${escape(row.__displayRow)}</span>${isGroup && members.length > 1 ? `<button type="button" data-delivery-collapse="${escape(group)}" aria-expanded="true" aria-label="Recolher memórias de ${escape(row.indicator)}">−</button>` : '<span class="delivery-indent"></span>'}<span><strong>${escape(row.indicator)}</strong><small>${escape(label)}</small></span></th>
      <td class="delivery-unit">${escape(row.unit || "Nº")}</td>
      <td class="delivery-target">${display(row.target === "-" ? null : row.target, row)}</td>
      <td class="delivery-ytd" data-delivery-result="${escape(row.id)}:ytd">${display(rowPreview?.ytd?.value, row)}</td>
      ${cells}
    </tr>`;
  }).join("");

  const area = String(data.area || "GEROT").toUpperCase();
  const label = areaLabel(area);
  const editor = document.createElement("section");
  editor.dataset.deliveryEditor = "";
  editor.dataset.gerotArea = area;
  editor.className = "delivery-editor";
  editor.setAttribute("role", "dialog");
  editor.setAttribute("aria-modal", "true");
  editor.setAttribute("aria-label", `Editar planilha GEROT ${label}`);
  editor.innerHTML = `
    <header class="delivery-heading"><div><span class="eyebrow">GEROT · ${area}</span><h2>Planilha de preenchimento <span>${data.year || 2026}</span></h2><p>Preencha os campos claros. Fórmulas e acumulados são recalculados automaticamente.</p></div><button type="button" class="button ghost" data-delivery-close aria-label="Fechar edição">Fechar ✕</button></header>
    <div class="delivery-controls"><label class="delivery-search"><span>Buscar indicador ou memória</span><input type="search" data-delivery-search placeholder="Ex.: produtividade, OTIF, refugo…"></label><label><span>Período</span><select data-delivery-period><option value="all">Ano completo</option>${MONTHS.map((month, index) => `<option value="${index}">${month} · ${data.year || 2026}</option>`).join("")}</select></label><label class="delivery-only-inputs"><input type="checkbox" data-delivery-only-inputs> Somente linhas preenchíveis</label><div class="delivery-history"><button class="button ghost" type="button" data-delivery-undo disabled title="Desfazer (Ctrl+Z)">↶ Desfazer</button><button class="button ghost" type="button" data-delivery-redo disabled title="Refazer (Ctrl+Y)">↷ Refazer</button></div></div>
    <div class="delivery-formula-bar"><span data-delivery-active-address>—</span><strong data-delivery-active-kind>Preenchimento</strong><span data-delivery-active-help>Use Tab ou Enter para avançar. Você também pode colar um intervalo do Excel.</span></div>
    <div class="delivery-grid-scroll"><table class="delivery-grid"><caption class="sr-only">GEROT ${escape(label)}, indicadores e memórias, janeiro a dezembro</caption><thead><tr><th scope="col" class="delivery-row-name">Indicador / memória de cálculo</th><th scope="col">Unidade</th><th scope="col">Meta 2026</th><th scope="col" class="delivery-ytd">YTD 2026 <small>automático</small></th>${MONTHS.map((month, index) => `<th scope="col" data-delivery-column="${index}">${month}<small>${String.fromCharCode(79 + index)}</small></th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table><p data-delivery-empty hidden>Nenhum indicador encontrado. Tente outro termo.</p></div>
    <footer class="delivery-footer"><div><div class="delivery-editor-legend"><span>◇ Preenchível</span><span>ƒx Automático</span><span>% Digite 95 para 95%</span><span>Horas: 08:30</span></div><p data-delivery-status role="status" aria-live="polite">Nenhuma alteração pendente.</p></div><div class="delivery-footer-actions"><button type="button" class="button secondary" data-delivery-cancel>Cancelar</button><button type="button" class="button primary" data-delivery-submit disabled>Salvar alterações</button></div></footer>`;

  panel.append(editor);
  document.body.append(editor);

  const q = (selector) => editor.querySelector(selector);
  const inputs = [...editor.querySelectorAll("[data-delivery-input]")];
  const outputs = [...editor.querySelectorAll("[data-delivery-result]")];
  const inputMap = new Map(inputs.map((input) => [`${input.dataset.deliveryRow}:${input.dataset.deliveryMonth}`, input]));
  const lineMap = new Map([...editor.querySelectorAll("[data-delivery-line]")].map((line) => [line.dataset.deliveryLine, line]));
  const previousInert = [...document.body.children]
    .filter((child) => child !== editor && child instanceof HTMLElement)
    .map((child) => [child, child.inert]);
  previousInert.forEach(([child]) => { child.inert = true; });

  function changedCells() {
    return inputs.filter((input) => {
      const { deliveryRow: id, deliveryMonth: month } = input.dataset;
      return (byId.get(id).monthly[month] ?? null) !== (original.get(id)?.monthly?.[month] ?? null);
    });
  }

  function refresh() {
    preview = previewFor(draft);
    for (const output of outputs) {
      const [id, month] = output.dataset.deliveryResult.split(":");
      const row = byId.get(id);
      const rowPreview = preview.get(id);
      const value = month === "ytd" ? rowPreview?.ytd?.value : rowPreview?.monthly?.[Number(month)]?.value;
      output.textContent = display(value, row, month === "ytd" ? 0 : Number(month));
    }
    const changes = changedCells();
    const changedSet = new Set(changes);
    inputs.forEach((input) => input.closest("td").classList.toggle("is-changed", changedSet.has(input)));
    const invalid = inputs.filter((input) => input.getAttribute("aria-invalid") === "true");
    q("[data-delivery-status]").textContent = invalid.length
      ? `${invalid.length} campo(s) inválido(s). Corrija o preenchimento para salvar.`
      : changes.length
        ? `${changes.length} célula(s) alterada(s) · cálculos atualizados · ainda não salvo.`
        : "Nenhuma alteração pendente.";
    q("[data-delivery-submit]").disabled = busy || !changes.length || Boolean(invalid.length);
    q("[data-delivery-undo]").disabled = busy || !undo.length;
    q("[data-delivery-redo]").disabled = busy || !redo.length;
  }

  function setInput(input, value) {
    byId.get(input.dataset.deliveryRow).monthly[Number(input.dataset.deliveryMonth)] = value;
    input.value = deliveryInputValue(value, input.dataset.deliveryKind);
    input.removeAttribute("aria-invalid");
    input.setCustomValidity("");
  }

  function rowHasEditableCell(row, period) {
    if (period === "all") return MONTHS.some((_, month) => !isCalculatedCell(data, row, month));
    return !isCalculatedCell(data, row, Number(period));
  }

  function filter() {
    const query = normalized(q("[data-delivery-search]").value);
    const period = q("[data-delivery-period]").value;
    const editableOnly = q("[data-delivery-only-inputs]").checked;

    for (const [id, members] of groups) {
      const matches = !query || members.some((row) => normalized(`${row.indicator} ${row.product}`).includes(query));
      for (const row of members) {
        const line = lineMap.get(String(row.id));
        if (!line) continue;
        const editable = rowHasEditableCell(row, period);
        line.hidden = !matches || (editableOnly && !editable) || (!query && collapsed.has(id) && String(row.id) !== String(id));
      }
    }
    editor.querySelectorAll("[data-delivery-column]").forEach((cell) => {
      cell.hidden = period !== "all" && cell.dataset.deliveryColumn !== period;
    });
    q(".delivery-grid").classList.toggle("is-single-month", period !== "all");
    q("[data-delivery-empty]").hidden = [...lineMap.values()].some((line) => !line.hidden);
  }

  function close() {
    if (busy) return;
    if ((changedCells().length || inputs.some((input) => input.getAttribute("aria-invalid") === "true"))
      && !window.confirm(`Descartar as alterações não salvas do GEROT ${label}?`)) return;
    destroy();
  }

  function destroy() {
    window.removeEventListener("beforeunload", beforeUnload);
    previousInert.forEach(([child, inert]) => { child.inert = inert; });
    editor.remove();
    if (lastFocus?.isConnected) lastFocus.focus();
  }

  function beforeUnload(event) {
    if (changedCells().length || inputs.some((input) => input.getAttribute("aria-invalid") === "true")) {
      event.preventDefault();
      event.returnValue = "";
    }
  }

  window.addEventListener("beforeunload", beforeUnload);

  editor.addEventListener("focusin", (event) => {
    const cell = event.target.closest("[data-delivery-address]");
    if (!cell) return;
    activeInput = cell.matches("input") ? cell : null;
    q("[data-delivery-active-address]").textContent = cell.dataset.deliveryAddress;
    q("[data-delivery-active-kind]").textContent = activeInput ? "Preenchível" : "ƒx Automático";
    if (activeInput) {
      const row = byId.get(cell.dataset.deliveryRow);
      q("[data-delivery-active-help]").textContent = `${row.indicator} · ${MONTHS[Number(cell.dataset.deliveryMonth)]} · ${cell.dataset.deliveryKind === "percent" ? "Digite 95 para 95%." : cell.dataset.deliveryKind === "time" ? "Duração em horas:minutos:segundos." : "Aceita números com vírgula decimal."}`;
    } else {
      q("[data-delivery-active-help]").textContent = cell.dataset.deliveryFormula || "Calculado automaticamente.";
    }
  });

  editor.addEventListener("input", (event) => {
    const input = event.target.closest("[data-delivery-input]");
    if (!input) {
      if (event.target.matches("[data-delivery-search]")) filter();
      return;
    }
    try {
      const value = parseDeliveryInput(input.value, input.dataset.deliveryKind);
      const row = byId.get(input.dataset.deliveryRow);
      const month = Number(input.dataset.deliveryMonth);
      const before = row.monthly[month] ?? null;
      input.removeAttribute("aria-invalid");
      input.setCustomValidity("");
      if (value !== before) {
        undo.push([{ input, before, after: value }]);
        redo.length = 0;
        row.monthly[month] = value;
      }
    } catch (error) {
      input.setAttribute("aria-invalid", "true");
      input.setCustomValidity(error.message);
      q("[data-delivery-active-help]").textContent = error.message;
    }
    refresh();
  });

  editor.addEventListener("change", (event) => {
    if (event.target.matches("[data-delivery-period], [data-delivery-only-inputs]")) filter();
  });

  editor.addEventListener("paste", (event) => {
    const input = event.target.closest("[data-delivery-input]");
    if (!input) return;
    const text = event.clipboardData?.getData("text/plain") || "";
    if (!/[\t\r\n]/.test(text)) return;
    event.preventDefault();
    const matrix = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
    const startRow = draft.findIndex((row) => String(row.id) === input.dataset.deliveryRow);
    const startMonth = Number(input.dataset.deliveryMonth);
    const transaction = [];
    try {
      if (startRow + matrix.length > draft.length || matrix.some((line) => startMonth + line.length > 12)) {
        throw new Error("O intervalo colado ultrapassa os limites da planilha.");
      }
      matrix.forEach((line, rowOffset) => line.forEach((textValue, colOffset) => {
        const row = draft[startRow + rowOffset];
        const month = startMonth + colOffset;
        const target = inputMap.get(`${row.id}:${month}`);
        if (!target) return;
        const after = parseDeliveryInput(textValue, target.dataset.deliveryKind);
        const before = row.monthly[month] ?? null;
        if (after !== before) transaction.push({ input: target, before, after });
      }));
      transaction.forEach((change) => setInput(change.input, change.after));
      if (transaction.length) {
        undo.push(transaction);
        redo.length = 0;
      }
      refresh();
    } catch (error) {
      q("[data-delivery-status]").textContent = `Nenhuma célula foi colada. ${error.message}`;
    }
  });

  function history(backwards) {
    const source = backwards ? undo : redo;
    const target = backwards ? redo : undo;
    const transaction = source.pop();
    if (!transaction || busy) return;
    transaction.forEach((change) => setInput(change.input, backwards ? change.before : change.after));
    target.push(transaction);
    refresh();
  }

  editor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      q("[data-delivery-submit]").click();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      history(event.key.toLowerCase() === "z" && !event.shiftKey);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      const focusable = [...editor.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')]
        .filter((item) => item.getClientRects().length);
      if (event.shiftKey && event.target === focusable[0]) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (!event.shiftKey && event.target === focusable.at(-1)) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    }
    if (event.key === "Enter" && activeInput && event.target === activeInput) {
      event.preventDefault();
      const visible = inputs.filter((item) => item.getClientRects().length && item.dataset.deliveryMonth === activeInput.dataset.deliveryMonth);
      const index = visible.indexOf(activeInput);
      visible[index + (event.shiftKey ? -1 : 1)]?.focus();
    }
  });

  editor.addEventListener("click", async (event) => {
    if (event.target.closest("[data-delivery-close], [data-delivery-cancel]")) return close();
    if (event.target.closest("[data-delivery-undo]")) return history(true);
    if (event.target.closest("[data-delivery-redo]")) return history(false);

    const toggle = event.target.closest("[data-delivery-collapse]");
    if (toggle) {
      const id = toggle.dataset.deliveryCollapse;
      collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      toggle.textContent = collapsed.has(id) ? "+" : "−";
      toggle.setAttribute("aria-expanded", String(!collapsed.has(id)));
      filter();
      return;
    }

    if (!event.target.closest("[data-delivery-submit]") || busy) return;
    const changes = changedCells();
    if (!changes.length || inputs.some((input) => input.getAttribute("aria-invalid") === "true")) return;

    busy = true;
    refresh();
    const controls = [...editor.querySelectorAll("button, input, select")];
    controls.forEach((control) => { control.disabled = true; });
    q("[data-delivery-submit]").textContent = "Salvando…";
    q("[data-delivery-status]").textContent = "Salvando alterações…";

    try {
      await onSave(changes.map((input) => ({
        id: input.dataset.deliveryRow,
        month: Number(input.dataset.deliveryMonth),
        value: byId.get(input.dataset.deliveryRow).monthly[Number(input.dataset.deliveryMonth)]
      })));
      destroy();
    } catch (error) {
      busy = false;
      controls.forEach((control) => { control.disabled = false; });
      refresh();
      q("[data-delivery-submit]").textContent = "Salvar alterações";
      q("[data-delivery-status]").textContent = `Não foi possível salvar. ${error.message}`;
    }
  });

  refresh();
  q("[data-delivery-search]")?.focus();
}
