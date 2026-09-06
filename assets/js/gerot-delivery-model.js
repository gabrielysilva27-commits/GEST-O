import { GEROT_DELIVERY } from "./gerot-delivery-data.js";

export function hydrateDeliveryArea(area) {
  if (!area || !Array.isArray(area.rows)) return area;
  const existing = new Map(area.rows.map((row) => [String(row.id), row]));
  const ids = new Set(GEROT_DELIVERY.rows.map((row) => row.id));
  area.rows = GEROT_DELIVERY.rows.map((seed) => {
    const previous = existing.get(seed.id);
    return {
      ...previous, ...structuredClone(seed),
      goalMode: seed.targetMode === "MA" ? "higher" : seed.targetMode === "ME" ? "lower" : "none",
      monthly: seed.monthly.map((value, index) => {
        // Cached formula outputs are never reclassified as user-entered data.
        if (seed.formulas[index] || previous?.formulas?.[index]) return value;
        return Array.isArray(previous?.monthly) && index in previous.monthly ? previous.monthly[index] : value;
      })
    };
  });
  area.rows.push(...[...existing.values()].filter((row) => !ids.has(String(row.id))));
  area.calculatedYtd = true;
  return area;
}

export function applyDeliveryCells(record, cells) {
  if (!Array.isArray(cells) || !cells.length || cells.length > 5000) throw new Error("Nenhuma célula válida foi enviada.");
  const byId = new Map(record.rows.map((row) => [String(row.id), row]));
  const validated = cells.map((cell) => {
    const row = byId.get(String(cell.id)), month = cell.month;
    if (!row || !Number.isInteger(month) || month < 0 || month > 11) throw new Error("Célula do GEROT inválida.");
    if (row.formulas?.[month]) throw new Error("Células com fórmula são calculadas automaticamente.");
    if (cell.value !== null && (typeof cell.value !== "number" || !Number.isFinite(cell.value))) throw new Error("Informe um valor numérico válido.");
    return { row, month, value: cell.value };
  });
  validated.forEach(({ row, month, value }) => { row.monthly[month] = value; });
  record.calculatedYtd = true;
  return record;
}
