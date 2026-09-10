import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generalGerotEntries, gerotGoalStatus, gerotTargetLabel } from '../assets/js/gerot-presentation.js';
import { deliveryCellKind } from '../assets/js/gerot-delivery-engine.js';
import { applyGerotReferenceMetadata } from '../assets/js/gerot-reference-metadata.js';
import { applyLatestGerotData, GEROT_SOURCE_REVISION, migrateGerotRowId } from '../assets/js/gerot-source-sync.js';

const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) };
const { api } = await import('../assets/js/api.js');
const { databaseStorage } = await import('../assets/js/database-storage.js');
await assert.rejects(api.login({ username: 'missing-reference-test', password: 'missing' }));
const db = JSON.parse(databaseStorage.getItem('lead-gestao-db-v2'));
db.sessions.push({ id: 29001, token: 'reference-test', userId: db.users.find(u=>u.username==='Gabriely').id, expiresAt:'2099-01-01T00:00:00.000Z' });
store.set('lead-gestao-db-v2', JSON.stringify(db));
const payload = await api.list('reference-test', '/gerot');
const byArea = new Map(payload.areas.map(a=>[a.area,a]));
const row = (area,id) => byArea.get(area).rows.find(r=>r.id===id);
let source = readFileSync(new URL('../assets/js/modules/index.js', import.meta.url),'utf8');
for (const path of ['gerot-delivery-engine.js','gerot-presentation.js']) source = source.replace(`"../${path}"`, JSON.stringify(new URL(`../assets/js/${path}`, import.meta.url).href));
source = source.replace("import {anomalyReportsView} from '../anomaly-ui.js';", 'const anomalyReportsView = () => "";');
const { views, gerotLivePreview } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const format = (v,u,f=u) => f==='%' ? new Intl.NumberFormat('pt-BR',{style:'percent',minimumFractionDigits:2}).format(v) : String(v);

test('all 161 mapped targets match the three supplied source workbooks',()=>{
  const refs=JSON.parse(readFileSync(new URL('./fixtures/gerot-targets-20260910.json',import.meta.url)));
  assert.equal(refs.length,161);
  for(const ref of refs){
    const actual=row(ref.area,ref.id)?.target;
    if(typeof ref.target==='number') assert.ok(Math.abs(actual-ref.target)<1e-12,`${ref.source}!${ref.cell}: ${actual} != ${ref.target}`);
    else assert.equal(actual,ref.target,`${ref.source}!${ref.cell}`);
  }
});
test('metadata repair leaves all stored months, IDs and formulas untouched',async()=>{
  for(const area of payload.areas)for(const r of area.rows){
    const fixed=applyGerotReferenceMetadata(area.area,r);
    for(const key of ['id','monthly','formulas','ytdFormula','referenceYtd'])assert.deepEqual(fixed[key],r[key]);
  }
  const persistedBefore=JSON.parse(databaseStorage.getItem('lead-gestao-db-v2'));
  const again=await api.list('reference-test','/gerot');
  assert.deepEqual(again.areas,payload.areas);
  const after=JSON.parse(databaseStorage.getItem('lead-gestao-db-v2'));
  for(const key of ['actionPlans','meetings','users','notifications'])assert.deepEqual(after[key],persistedBefore[key]);
});
test('targets do not become memory labels; DQI and percentages have the correct scale',()=>{
  for(const [id,label] of [['entrega-32','100,00%'],['entrega-33','6,30%'],['entrega-34','54,40%'],['entrega-38','43,80%'],['entrega-39','6,68%'],['entrega-40','3.09']])
    assert.equal(gerotTargetLabel(row('ENTREGA',id),format),label);
  assert.equal(deliveryCellKind(row('ENTREGA','entrega-40')),'number');
  assert.equal(deliveryCellKind(row('ENTREGA','entrega-38')),'percent');
  assert.equal(gerotTargetLabel({goalMode:'none',calculationInput:true,target:null},format),'Memória');
  assert.equal(gerotTargetLabel({goalMode:'none',calculationInput:false,target:null},format),'–');
  assert.equal(gerotTargetLabel({goalMode:'absolute',target:.2,unit:'%'},format),'± 20,00%');
  assert.equal(gerotGoalStatus({goalMode:'higher',target:null},0),'neutral');
  assert.equal(gerotGoalStatus({goalMode:'lower',target:0},0),'success');
  assert.equal(gerotGoalStatus(row('ENTREGA','entrega-33'),.1),'danger');
  assert.equal(gerotGoalStatus(row('ENTREGA','entrega-38'),.5),'success');
});
test('general view consolidates 12 shared KPIs without changing any area row',()=>{
  const before=structuredClone(payload);
  const entries=generalGerotEntries(payload.areas);
  const all=payload.areas.flatMap(a=>a.rows.filter(r=>!r.calculationInput));
  assert.equal(all.length-entries.length,12);
  assert.equal(entries.filter(e=>e.row.indicator==='OTIF').length,1);
  const otif=entries.find(e=>e.row.indicator==='OTIF');
  assert.equal(otif.area.area,'ENTREGA');
  assert.deepEqual(otif.areas,['ENTREGA','PLANEJAMENTO']);
  assert.equal(entries.filter(e=>e.row.indicator==='5S').length,2);
  assert.equal(entries.filter(e=>e.row.indicator==='NOVOS CADASTROS').length,2);
  assert.equal(entries.filter(e=>e.row.indicator==='JORNADA LÍQUIDA').length,2);
  assert.deepEqual(payload,before);
  for(const name of ['ENTREGA','PLANEJAMENTO'])assert.equal(byArea.get(name).rows.filter(r=>r.indicator==='OTIF').length,1);
});
test('rendered table has one general OTIF and one per area, and renders numeric targets',()=>{
  const html=views.gerot.render(payload,{});
  const general=html.split('<section data-gerot-general>')[1].split('<div data-gerot-panel=')[0];
  assert.equal((general.match(/<strong>OTIF<\/strong>/g)||[]).length,1);
  assert.equal((html.match(/<strong>OTIF<\/strong>/g)||[]).length,3);
  const dqi=general.match(/<tr>[^]*?<strong>DQI<\/strong>([^]*?)<\/tr>/)[1];
  assert.match(dqi,/<td>PPM<\/td>/);
  assert.match(dqi,/<td>3,09<\/td>/);
  assert.doesNotMatch(dqi,/309,00%/);
});
test('cleared memories do not revive an obsolete cached YTD or monthly result',()=>{
  const area=structuredClone(byArea.get('CONTROLE'));
  for(const r of area.rows)r.monthly=Array(12).fill(null);
  area.calculatedYtd=true;
  const preview=gerotLivePreview(area);
  assert.equal(preview.find(r=>r.id==='controle-13').ytd.value,null);
  assert.equal(preview.find(r=>r.id==='controle-13').monthly[0].value,null);
});

test('latest GEROT source refresh keeps user entries and fills the new August reference',()=>{
  const data={
    gerotWarehouse: structuredClone(byArea.get('ARMAZÉM')),
    gerotAdditionalAreas: Object.fromEntries(['ENTREGA','CONTROLE','PLANEJAMENTO'].map(name=>[name,structuredClone(byArea.get(name))]))
  };
  const custom=data.gerotAdditionalAreas.ENTREGA.rows.find(r=>r.id==='entrega-14');
  custom.monthly[7]=999;
  applyLatestGerotData(data);
  assert.equal(data.gerotAdditionalAreas.ENTREGA.sourceRevision,GEROT_SOURCE_REVISION);
  assert.equal(custom.monthly[7],999,'a manual August value must not be overwritten');
  assert.equal(data.gerotAdditionalAreas.ENTREGA.rows.find(r=>r.id==='entrega-15').monthly[7],237);
  assert.equal(data.gerotWarehouse.rows.find(r=>r.id==='eficiencia-carregamento').monthly[7],1);
  assert.equal(data.gerotWarehouse.rows.find(r=>r.id==='wlp-dias').monthly[7],26);
});

test('latest Planning structure follows the supplied Control/Planning workbook',()=>{
  const data={gerotAdditionalAreas:{PLANEJAMENTO:structuredClone(byArea.get('PLANEJAMENTO'))}};
  applyLatestGerotData(data);
  const planning=data.gerotAdditionalAreas.PLANEJAMENTO;
  assert.equal(planning.rows.find(r=>r.id==='planejamento-41')?.indicator,'CDP SEM FALTA');
  assert.equal(planning.rows.find(r=>r.id==='planejamento-97')?.indicator,'ANS - VOLUME DE VENDAS');
  assert.equal(planning.rows.some(r=>r.indicator==='OTIF'),false);
  assert.equal(migrateGerotRowId('PLANEJAMENTO','planejamento-68'),'planejamento-41');
  assert.equal(planning.rows.find(r=>r.id==='planejamento-86')?.indicator,'ICV');
  assert.equal(planning.rows.find(r=>r.id==='planejamento-89')?.indicator,'ICE');
});

test('source-only conditional presentation is restored without changing numeric goal rules',()=>{
  const data={gerotAdditionalAreas:{CONTROLE:structuredClone(byArea.get('CONTROLE'))}};
  applyLatestGerotData(data);
  const trocas=data.gerotAdditionalAreas.CONTROLE.rows.find(r=>r.id==='controle-38');
  assert.equal(trocas.indicator,'TROCAS');
  assert.equal(trocas.sourceStatusFallback,'success');
  assert.equal(gerotGoalStatus(trocas,trocas.referenceYtd),'success');
  const fgli=data.gerotAdditionalAreas.CONTROLE.rows.find(r=>r.id==='controle-31');
  assert.equal(gerotGoalStatus(fgli,fgli.referenceYtd),'danger','real target logic keeps priority over source fallback');
});
