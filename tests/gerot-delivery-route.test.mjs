import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const launcher = readFileSync(new URL("../assets/js/gerot-delivery-launcher.js", import.meta.url), "utf8");
const editor = readFileSync(new URL("../assets/js/gerot-delivery-editor.js", import.meta.url), "utf8");

test("all GEROT pillars open in internal LEAD routes instead of browser tabs", () => {
  for (const route of ["#gerot-entrega-editor", "#gerot-armazem-editor", "#gerot-planejamento-editor", "#gerot-controle-editor"]) {
    assert.match(launcher, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const area of ["ENTREGA", "ARMAZÉM", "PLANEJAMENTO", "CONTROLE"]) assert.match(launcher, new RegExp(area));
  assert.match(launcher, /history\.pushState/);
  assert.match(launcher, /openDeliveryEditor/);
  assert.match(launcher, /gerotLivePreview/);
  assert.match(launcher, /body\.gerot-delivery-internal-route > #app/);
  assert.match(launcher, /position:\s*fixed\s*!important/);
  assert.match(launcher, /height:\s*100dvh\s*!important/);
  assert.match(launcher, /area\.area === "ENTREGA"/);
  assert.match(launcher, /rows:\s*changedRowsFromCells/);
  assert.doesNotMatch(launcher, /window\.open\s*\(/);
  assert.doesNotMatch(launcher, /gerot-entrega-editor\.html/);
});

test("shared spreadsheet editor keeps formulas automatic and non-formula cells editable in every pillar", () => {
  assert.match(editor, /function isCalculatedCell/);
  assert.match(editor, /data\.area\)\.toUpperCase\(\) === "ARMAZÉM"/);
  assert.match(editor, /row\.formulaInputs\.length > 0/);
  assert.match(editor, /Boolean\(row\.formulas\?\.\[month\]\)/);
  assert.match(editor, /typeof calculatePreview === "function"/);
  assert.match(editor, /data-delivery-input/);
  assert.match(editor, /data-delivery-calculated|delivery-calculated/);
  assert.match(editor, /Fórmulas e acumulados são recalculados automaticamente/);
  assert.doesNotMatch(editor, /GEROT · ENTREGA<\/span>/);
});
