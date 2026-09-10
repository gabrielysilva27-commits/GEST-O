// Only equivalent cross-area KPIs share a general-view row. Area records are never merged.
// 5S, duration/rate pairs and differently scoped NOVOS CADASTROS remain independent.
const sharedNames = new Set([
  "OTIF", "ON TIME", "IN FULL", "OTIF - FOOD SERVICE", "OTIF - NAB",
  "OTIF - HIGH END", "OTIF - SEGMENTACAO VIP", "OTIF - SEGMENTACAO MERCADOS",
  "OTIF - SEGMENTACAO ZE DELIVERY", "REFUGO FABRICA", "REFUGO REVENDA", "NPS"
]);
const normalized = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");

export function generalGerotEntries(areas) {
  const entries = [], shared = new Map();
  for (const area of areas) for (const row of area.rows || []) {
    if (row.calculationInput) continue;
    const name = normalized(row.indicator), format = row.displayFormat || row.unit;
    const key = sharedNames.has(name) && format === "%" ? name : null;
    const existing = key && shared.get(key);
    if (existing && !existing.areas.includes(area.area)) {
      existing.areas.push(area.area);
      // The operational owner supplies the general result; never sum or average copies.
      const preferred = name.startsWith("REFUGO") ? "CONTROLE" : "ENTREGA";
      if (area.area === preferred) { existing.area = area; existing.row = row; }
    } else {
      const entry = { area, row, areas: [area.area] };
      entries.push(entry);
      if (key && !existing) shared.set(key, entry);
    }
  }
  return entries;
}

export function gerotGoalStatus(row, value) {
  const missing = (v) => v === null || v === undefined || v === "" || !Number.isFinite(Number(v));
  if (missing(value) || row.calculationInput) return "neutral";
  // Some supplied GEROT rows (for example TROCAS) are intentionally colored in the
  // workbook even though the spreadsheet has no numeric target rule. Preserve that
  // source presentation only when there is no semantic rule to calculate instead.
  if ((!row.goalMode || row.goalMode === "none") && ["success", "danger"].includes(row.sourceStatusFallback)) {
    return row.sourceStatusFallback;
  }
  if (!row.goalMode || row.goalMode === "none") return "neutral";
  if (row.goalMode === "range") {
    if (missing(row.targetMin) || missing(row.targetMax)) return "neutral";
    return Number(value) >= Number(row.targetMin) && Number(value) <= Number(row.targetMax) ? "success" : "danger";
  }
  const target = row.goalMode === "absolute" && typeof row.target === "string"
    ? Number(row.target.replace(/[^0-9.,-]/g, "").replace(",", ".")) : row.target;
  if (missing(target)) return "neutral";
  if (row.goalMode === "absolute") return Math.abs(Number(value)) <= Math.abs(Number(target)) ? "success" : "danger";
  if (row.goalMode === "higher") return Number(value) >= Number(target) ? "success" : "danger";
  if (row.goalMode === "lower") return Number(value) <= Number(target) ? "success" : "danger";
  return "neutral";
}

export function gerotTargetLabel(row, formatNumber) {
  const format = row.targetDisplayFormat || row.displayFormat || row.unit;
  if (row.goalMode === "range") return `${formatNumber(row.targetMin, row.unit, format)} a ${formatNumber(row.targetMax, row.unit, format)}`;
  if (row.target === null || row.target === undefined || row.target === "" || row.target === "-") return row.calculationInput ? "Memória" : "–";
  if (row.goalMode === "absolute") {
    if (typeof row.target === "string") return row.target;
    return `± ${formatNumber(Math.abs(row.target), row.unit, format)}`;
  }
  return formatNumber(row.target, row.unit, format);
}
