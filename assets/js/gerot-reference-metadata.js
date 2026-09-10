// Reference: supplied GEROT ARMAZÉM.xlsb.xlsx, GEROT 2026!J10:J75.
// Metadata only: never replace monthly values, IDs, formulas or persisted area records.
const warehouseTargets = {
  "eficiencia-carregamento": 0.96,
  "carros-batidos": null,
  "total-carros": null,
  "ressuprimento": 0.0423,
  "reabastecimento": 0.1282,
  "eficiencia-montagem": 0.85,
  "aderencia-wms": 0.8709,
  "total-carros-wms": null,
  "carros-wms": null,
  "matriz-priorizacao": 0.96,
  "total-carros-priorizados": null,
  "carros-priorizados": null,
  "eficiencia-descarga": 0.9,
  "carros-ok": null,
  "carros-nok": null,
  "tempo-interno-fisica": 0.85,
  "tempo-interno-financeira": 0.85,
  "tempo-interno-revenda": 0.85,
  "tempo-interno": 0.020833333333333332,
  "stock-age": 0.9911,
  "hl-total": null,
  "hl-nok": null,
  "stock-age-curva-c": 0.9783,
  "hl-total-curva-c": null,
  "hl-nok-curva-c": null,
  "quebra-fefo": 6,
  "oor": 0.1529,
  "stock-out": 0.1205,
  "stock-over": 0.0323,
  "indisponibilidade": 0.0567,
  "inovacao": 0.191,
  "ocupacao-estoque": 0.6,
  "txr-armazem": 0.1,
  "txr-tendencia": null,
  "txr-real": null,
  "wlp": 4.78,
  "wlp-ajudantes": 298,
  "wlp-operadores": 111,
  "wlp-volume": 551476,
  "wlp-dias": 25.083333333333332,
  "pnp": 5.16,
  "pnp-volume": 551476,
  "pnp-dias": 25.166666666666668,
  "pnp-ajudantes": 305,
  "pnp-operadores": 111,
  "pnp-conferentes": 98,
  "pnp-adm": 47,
  "fnp": 40.48,
  "fnp-horas": null,
  "fnp-volume": null,
  "tqi": 148.75,
  "tqi-hl-baixado": null,
  "tqi-volume": null,
  "tma": 0.10916666666666666,
  "tr-nova-rio": 0.1768720023148148,
  "tr-pirai": 0.1113633101851852,
  "furo-puxada": 0.1,
  "eficiencia-puxada": 0.9,
  "produtividade-repack": 0.0012037037037037038,
  "produtividade-despejo": 0.035203356481481485,
  "pallets-avariados": 0.0481,
  "pallets-avariados-base": null,
  "pallets-puxados": null,
  "ronda-qualidade": 0.9281,
  "falha-bloqueio": 0,
  "cinco-s": 0.85
};
const deliveryModes = {
  32: "MA", 33: "ME", 35: "MA", 38: "MA", 39: "ME", 43: "MA",
  81: "ME", 85: "MA", 107: "MA", 138: "ME", 139: "ME", 140: "MA"
};
// Missing M-column rules above are recovered from the green/red conditional rules
// in GEROT DPO DISTRIBUIÇÃO 2026.xlsx. Row 34 has no rule: show its target neutrally.
export function applyGerotReferenceMetadata(area, row) {
  const result = { ...row };
  if (area === "ARMAZÉM" && Object.hasOwn(warehouseTargets, row.id)) result.target = warehouseTargets[row.id];
  if (area === "ENTREGA") {
    const mode = deliveryModes[row.sheetRow];
    if (mode) { result.targetMode = mode; result.goalMode = mode === "MA" ? "higher" : "lower"; }
    if ([33, 34, 38].includes(row.sheetRow)) {
      result.displayFormat = "%";
      result.formats = Array(12).fill("0.00%");
    }
    if (row.sheetRow === 40) {
      // DQI = returned HL / billed HL * 1,000,000: 3.09 PPM must not become 309%.
      result.unit = "PPM";
      result.displayFormat = "number";
      result.formats = Array(12).fill("0.00");
    }
    if ([41, 42].includes(row.sheetRow)) result.unit = "HL";
    if (row.sheetRow === 11 || row.sheetRow === 12 || row.sheetRow === 13) result.unit = "%";
  }
  if (area === "PLANEJAMENTO" && row.id === "planejamento-123") {
    result.unit = "%"; result.displayFormat = "%";
  }
  return result;
}
