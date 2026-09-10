// Latest GEROT reference synchronization — 2026-09-10.
// Source values came from the three workbooks supplied in ChatGPT/Codex.
// This module is intentionally pure and O(rows): no network request is added to GEROT rendering.
export const GEROT_SOURCE_REVISION = "2026-09-10";

const DELIVERY_UPDATES = [[8,null,26],[11,0.12685901946985692,0.12783882783882783],[12,0.12244897959183673,0.12307692307692308],[13,0.129064039408867,0.13021978021978023],[14,870,112],[15,1834,237],[16,7105,910],[17,14210,1820],[18,2704,349],[19,21315,2730],[20,0.009814845560647259,0.005299653600590232],[21,3471.8699999999994,222.39],[22,353736.58999999997,41963.12],[23,0.020130475302889098,0.017252396166134186],[24,1944,189],[25,96570,10955],[26,0.9280814339455632,0.9624724061810155],[27,4194,436],[28,4519,453],[29,0.9801515698303861,0.9665271966527197],[30,2716,231],[31,2771,239],[32,1,1],[35,0.982290774064553,0.998],[40,2.7704230427505396,23.353840229229856],[41,0.98,0.98],[42,353736.58999999997,41963.12],[43,257.76470344154257,258.133016453382],[44,1056061.99,141198.75999999998],[45,4097,547],[46,882.1238189302239,877.6522559414989],[47,228.70263289555967,229.20754303599372],[48,1097086.5299999998,146463.62],[49,4797,639],[50,254.73693663649348,249.88565905096652],[51,1069385.6599999997,142184.93999999994],[52,4198,569],[53,18.139997314307735,18.140680948040117],[54,1553491.23,199003.27000000008],[55,85639,10970],[56,15.575908281250001,13.67],[57,0.12291716693682364,0.059547872565354654],[58,220868.9899999999,30024],[59,251822.26999999976,31925.07000000003],[60,34.07,48],[61,37.3825,39],[62,0.0424117695336198,0.07425997203859414],[63,1385.543055555555,186.23124999999996],[64,1446.90902777778,201.17013888888894],[65,0.8168806567038518,0.8628158844765343],[66,3881,478],[67,4751,554],[68,0.3547395833333334,0.3542361111111111],[69,0.7070090507261629,0.6010830324909747],[70,3359,333],[71,4751,554],[72,0.01918402777777778,0.019444444444444445],[73,0.829088612923595,0.871841155234657],[74,3939,483],[75,4751,554],[76,0.32258969907407437,0.32377314814814817],[77,0.9366449168596085,0.9747292418772563],[78,4450,540],[79,4751,554],[80,0.00963541666666667,0.009027777777777777],[81,0.35184027777777765,0.3473611111111111],[82,0.9450875,0.9364],[85,0.9524875,0.9647],[86,0.6684948979591837,0.634],[87,5241,634],[88,7840,1000],[89,0.5988520408163265,0.554],[90,4695,554],[91,7840,1000],[92,0.06964285714285715,0.08],[93,546,80],[94,7840,1000],[95,0.9267109753906951,0.7956989247311828],[96,5159,592],[97,5567,744],[98,41.160521897651805,46.013473710819014],[99,1115643.84,107076.06000000001],[100,92156,7912],[101,10.650741207469355,12.371584055459273],[102,1115643.84,107076.06000000001],[103,104748,8655],[104,2.080168776371308,2.4444444444444446],[105,237,27],[106,493,66],[107,2.517870302137067,2.4161490683229814],[108,5428,644],[109,13667,1556],[110,0.9768571428571429,0.9868],[138,0.018275000000000003,0.0163],[139,0.013585714285714284,0.0145],[140,0.635875,0.704],[141,4.912857142857143,4.85],[142,0.052675,0.0657]];
const WAREHOUSE_UPDATES = [["eficiencia-carregamento",0.9459770114942528,1],["carros-batidos",4938,627],["total-carros",5220,627],["ressuprimento",0.032362499999999995,0.0243],["reabastecimento",0.1113125,0.0976],["eficiencia-montagem",0.9274625000000001,0.9819],["aderencia-wms",0.9218390804597701,0.9537480063795853],["total-carros-wms",5220,627],["carros-wms",4812,598],["matriz-priorizacao",0.9685741998060136,0.9696969696969697],["total-carros-priorizados",5155,627],["carros-priorizados",4993,608],["eficiencia-descarga",0.9984697781178271,0.9968203497615262],["carros-ok",5220,627],["carros-nok",8,2],["tempo-interno-fisica",0.9869586928044946,0.9928],["tempo-interno-financeira",0.9550349600920687,0.9747],["tempo-interno-revenda",0.945382245974117,0.9711],["tempo-interno",0.0085150391355135,0.010416666666666666],["stock-age",0.9940972101969663,0.995130908262486],["hl-total",238668.20679999996,33667.47],["hl-nok",1389.61319,163.93],["stock-age-curva-c",0.988,0.9999470961985092],["hl-total-curva-c",30793.663909999996,5670.37],["hl-nok-curva-c",9695.437149999998,0.3],["quebra-fefo",6,5],["oor",0.10611249999999998,0.0898],["stock-out",0.10275973485498542,0.0893],["stock-over",0.0033825853784108465,0.0005],["indisponibilidade",0.047712500000000005,0.0508],["inovacao",0.1625,0.1666],["ocupacao-estoque",0.6786875000000001,0.7445],["txr-armazem",null,-0.008918617614269708],["txr-tendencia",null,9.05],["txr-real",null,8.97],["wlp",6.775171968957051,5.650066463471944],["wlp-ajudantes",206,29],["wlp-operadores",75,10],["wlp-volume",351672,42080],["wlp-dias",25.125,26],["pnp",4.66816821219131,4.1966020288895365],["pnp-volume",351672,42080],["pnp-dias",25.125,26],["pnp-ajudantes",223,29],["pnp-operadores",78,10],["pnp-conferentes",71,9],["pnp-adm",24,3],["fnp",39.665237987818635,39.25373134328358],["fnp-horas",8866,1072],["fnp-volume",351672,42080],["tqi",172.34809709047065,124.76235741444867],["tqi-hl-baixado",60.61,5.25],["tqi-volume",351672,42080],["tma",0.0328591579861111,0.028136574074074074],["tr-nova-rio",0.14220148084646497,0.1318865740740741],["tr-pirai",0.10231672285963499,0.10606481481481482],["furo-puxada",0.0099625,0.0562],["eficiencia-puxada",0.9900375000000001,0.9438],["produtividade-repack",0.0011569558013943427,0.0010185185185185184],["produtividade-despejo",0.03912744932955531,0.02638888888888889],["pallets-avariados",0.008819538670284939,0.0186],["pallets-avariados-base",37.142857142857146,null],["pallets-puxados",4211.428571428572,null],["ronda-qualidade",0.964075,0.966],["falha-bloqueio",0,0],["cinco-s",0.94195,0.9407]];
const STATIC_STATUS = {
  CONTROLE: { "controle-31": "success", "controle-38": "success" }
};

const blank = (value) => value === null || value === undefined || value === "" || value === "-";
const sameValue = (left, right) => blank(left) && blank(right) || Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Math.abs(Number(left) - Number(right)) < 1e-12 || String(left) === String(right);
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");

function sourceMonth(row, month, nextValue) {
  if (!row || month < 0 || month > 11 || nextValue === undefined) return;
  const monthly = Array.isArray(row.monthly) ? [...row.monthly] : Array(12).fill(null);
  const sourceMonthly = Array.isArray(row.sourceMonthly) ? [...row.sourceMonthly] : Array(12).fill(null);
  const current = monthly[month];
  const previousSource = sourceMonthly[month];
  const canRefresh = blank(current) || (!blank(previousSource) && sameValue(current, previousSource));
  if (canRefresh) monthly[month] = nextValue;
  sourceMonthly[month] = nextValue;
  row.monthly = monthly;
  row.sourceMonthly = sourceMonthly;
}

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

function patchDelivery(area) {
  const byRow = new Map((area.rows || []).map((row) => [Number(row.sheetRow), row]));
  for (const [sheetRow, ytd, august] of DELIVERY_UPDATES) {
    const row = byRow.get(sheetRow);
    if (!row) continue;
    if (sheetRow !== 8 && ytd !== null && ytd !== undefined) row.referenceYtd = ytd;
    sourceMonth(row, 7, august);
  }
}

function patchWarehouse(area) {
  const byId = new Map((area.rows || []).map((row) => [String(row.id), row]));
  for (const [id, ytd, august] of WAREHOUSE_UPDATES) {
    const row = byId.get(id);
    if (!row) continue;
    if (ytd !== null && ytd !== undefined) row.referenceYtd = ytd;
    if (august !== null && august !== undefined) sourceMonth(row, 7, august);
    if (id === "pallets-avariados" && !Array.isArray(row.monthlySourceOverrides)) row.monthlySourceOverrides = [];
    if (id === "pallets-avariados" && !row.monthlySourceOverrides.includes(7)) row.monthlySourceOverrides.push(7);
  }
}

function patchStatuses(area) {
  const statuses = STATIC_STATUS[String(area?.area || "").toUpperCase()] || {};
  for (const row of area?.rows || []) if (statuses[row.id]) row.sourceStatusFallback = statuses[row.id];
}

export function applyLatestGerotArea(area) {
  if (!area || !Array.isArray(area.rows)) return area;
  const name = String(area.area || "").toUpperCase();
  if (name === "PLANEJAMENTO") upgradePlanning(area);
  if (name === "ENTREGA") patchDelivery(area);
  if (name === "ARMAZÉM") patchWarehouse(area);
  patchStatuses(area);
  area.sourceRevision = GEROT_SOURCE_REVISION;
  return area;
}

export function applyLatestGerotData(data) {
  if (!data || typeof data !== "object") return data;
  if (data.gerotWarehouse) applyLatestGerotArea(data.gerotWarehouse);
  if (data.gerotAdditionalAreas && typeof data.gerotAdditionalAreas === "object") {
    Object.values(data.gerotAdditionalAreas).forEach(applyLatestGerotArea);
  }
  return data;
}
