import { GEROT_SOURCE_ROWS } from "./gerot-source-values.js";
export const GEROT_SOURCE_REVISION = "2026-09-10-complete-v2";
const blank = (value) => value === null || value === undefined || value === "" || value === "-";
const sameValue = (a,b) => !blank(a) && !blank(b) && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a)-Number(b)) <= 1e-6 * Math.max(1,Math.abs(Number(b)));
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");

function shiftFormula(formula, delta) {
  if (!formula || typeof formula !== "string") return formula;
  return formula.replace(/([A-Z]{1,3})(\$?)(\d+)/g, (match, column, absolute, digits) => {
    const row = Number(digits);
    return row >= 68 && row <= 125 ? column + absolute + String(row + delta) : match;
  });
}

export function migrateGerotRowId(area, id) {
  if (String(area || "").toUpperCase() !== "PLANEJAMENTO") return id;
  const match = /^planejamento-(\d+)$/.exec(String(id || ""));
  if (!match) return id;
  const row = Number(match[1]);
  if (row >= 68 && row <= 122) return `planejamento-${row - 27}`;
  if (row === 124) return "planejamento-96";
  if (row === 125) return "planejamento-97";
  return id;
}

function upgradePlanning(area) {
  if (!area || !Array.isArray(area.rows)) return area;
  const alreadyLatest = area.rows.some((row) => row.id === "planejamento-41" && normalize(row.indicator) === "CDP SEM FALTA");
  if (alreadyLatest) return area;
  const keep = area.rows.filter((row) => {
    const sheet = Number(row.sheetRow || 0);
    return sheet >= 68 && sheet <= 122 || sheet === 124 || sheet === 125 || String(row.id || "").startsWith("custom-");
  });
  area.rows = keep.map((row) => {
    if (String(row.id || "").startsWith("custom-")) return row;
    const oldSheet = Number(row.sheetRow || 0);
    const delta = oldSheet >= 124 ? -28 : -27;
    const sheetRow = oldSheet + delta;
    const next = { ...row, id: `planejamento-${sheetRow}`, sheetRow };
    next.ytdFormula = shiftFormula(row.ytdFormula, delta);
    next.formulas = (Array.isArray(row.formulas) ? row.formulas : []).map((formula) => shiftFormula(formula, delta));
    return next;
  });
  return area;
}


export function applyLatestGerotArea(area) {
  if (!area || !Array.isArray(area.rows)) return area;
  const name = String(area.area || "").toUpperCase();
  if (name === "PLANEJAMENTO") upgradePlanning(area);
  for (const row of area.rows) {
    const source = GEROT_SOURCE_ROWS[name]?.[row.id];
    if (!source || normalize(source.indicator) !== normalize(row.indicator)) continue;
    if (row.sourceRevision !== GEROT_SOURCE_REVISION) {
      const previous = row.sourceMonthly || [];
      row.monthly = Array.from({length:12},(_,month) => {
        const current = row.monthly?.[month], incoming = source.monthly[month];
        if (typeof incoming !== "number" || !Number.isFinite(incoming)) return current ?? null;
        // Legacy time import rounded to minutes and misplaced the decimal (10x/100x).
        // Repair only that exact signature in the five duration KPIs, once per revision.
        const legacyTime = name === "ENTREGA" && [68,72,76,80,81].includes(Number(row.sheetRow))
          && incoming > 0 && [10,100].some(factor => Math.abs(Number(current) - Math.round(incoming*1440)/1440*factor) < 1e-10);
        if (legacyTime) return incoming;
        // Refresh only empty cells or unchanged source defaults. Keep operational edits.
        return blank(current) || sameValue(current,previous[month]) ? incoming : current;
      });
      for (const key of ["eoy2024","eoy2025"]) {
        if (blank(row[key]) && typeof source[key] === "number") row[key] = source[key];
      }
      if (typeof source.referenceYtd === "number") row.referenceYtd = source.referenceYtd;
      row.sourceMonthly = [...source.monthly];
      row.sourceRevision = GEROT_SOURCE_REVISION;
    }
    // The latest workbook has formulas in V16/V17 and a manual result in V35.
    if (name === "ENTREGA" && [16,17,35].includes(Number(row.sheetRow))) {
      row.formulas = [...(row.formulas || Array(12).fill(""))];
      row.formulas[7] = row.sheetRow === 16 ? "35*V8" : row.sheetRow === 17 ? "V16*2" : "";
    }
    if (name === "ARMAZÉM" && row.id === "pallets-avariados") {
      row.monthlySourceOverrides = [...new Set([...(row.monthlySourceOverrides || []),7])];
    }
    if (name === "CONTROLE" && ["controle-31","controle-38"].includes(row.id)) row.sourceStatusFallback = "success";
  }
  area.sourceRevision = GEROT_SOURCE_REVISION;
  return area;
}

export function applyLatestGerotData(data) {
  if (!data || typeof data !== "object") return data;
  if (data.gerotWarehouse) applyLatestGerotArea(data.gerotWarehouse);
  Object.values(data.gerotAdditionalAreas || {}).forEach(applyLatestGerotArea);
  return data;
}
