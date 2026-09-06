import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { GEROT_DELIVERY } = await import('../assets/js/gerot-delivery-data.js');
const modulePath = new URL('../assets/js/modules/index.js', import.meta.url);
const source = await fs.readFile(modulePath, 'utf8');
const isolated = source.replace('"../gerot-delivery-engine.js"', JSON.stringify(new URL('../assets/js/gerot-delivery-engine.js', import.meta.url).href)).replace(
  "import {anomalyReportsView} from '../anomaly-ui.js';",
  "const anomalyReportsView = () => '';"
);
const tempModule = path.join(os.tmpdir(), `gerot-module-test-${Date.now()}.mjs`);
await fs.writeFile(tempModule, isolated);
const { gerotLivePreview } = await import(pathToFileURL(tempModule).href);
await fs.unlink(tempModule).catch(() => {});

const area = GEROT_DELIVERY;
assert(area, 'GEROT ENTREGA não encontrado');
const bySheet = new Map(area.rows.map((row) => [Number(row.sheetRow), row]));
assert.equal(bySheet.get(8)?.indicator, 'DIAS ÚTEIS');
assert.equal(bySheet.get(8)?.formulas?.filter(Boolean).length, 0);
assert.equal(bySheet.get(16)?.formulas?.[0], '35*O8');
assert.equal(bySheet.get(17)?.formulas?.[0], 'O16*2');
assert.equal(bySheet.get(11)?.formulas?.[0], 'IFERROR(O18/O19,"")');

let preview = new Map(gerotLivePreview(area).map((row) => [row.id, row]));
assert(Math.abs(preview.get('entrega-11').monthly[0].value - (108 / 2730)) < 1e-12, 'IV crítico JAN incorreto');
assert(Math.abs(preview.get('entrega-11').monthly[6].value - (259 / 2835)) < 1e-12, 'IV crítico JUL incorreto');
assert.equal(preview.get('entrega-11').monthly[8].value, null, 'Mês sem preenchimento não pode virar 0%');

preview = new Map(gerotLivePreview(area, {
  'entrega-8': { 7: 26 },
  'entrega-14': { 7: 10 },
  'entrega-15': { 7: 20 },
  // In the attached workbook these August cells are manual, unlike Jan–Jul.
  'entrega-16': { 7: 910 },
  'entrega-17': { 7: 1820 }
}).map((row) => [row.id, row]));
assert.equal(preview.get('entrega-16').monthly[7].value, 910, 'TT Motorista não recalculou pelos dias úteis');
assert.equal(preview.get('entrega-17').monthly[7].value, 1820, 'TT Ajudante não recalculou');
assert.equal(preview.get('entrega-18').monthly[7].value, 30, 'TT Atrasos não recalculou');
assert.equal(preview.get('entrega-19').monthly[7].value, 2730, 'TT Funcionários não recalculou');
assert(Math.abs(preview.get('entrega-11').monthly[7].value - (30 / 2730)) < 1e-12, 'IV crítico não recalculou automaticamente');
console.log('GEROT ENTREGA: IV crítico, células vazias e fórmulas automáticas validados');
