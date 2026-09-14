import fs from 'node:fs/promises';

await fs.copyFile('worker/action-import-20260914-aptas.js','dist/server/action-import-20260914-aptas.js');
for (let i=1;i<=10;i++) {
  const suffix=String(i).padStart(2,'0');
  await fs.copyFile(`worker/action-import-20260914-aptas-data-${suffix}.js`,`dist/server/action-import-20260914-aptas-data-${suffix}.js`);
}

const path='dist/server/index.js';
let source=await fs.readFile(path,'utf8');

const importMarker='import {prepareReviewedActionImport} from "./action-import-20260914.js";';
if(!source.includes(importMarker)) throw new Error('Missing reviewed action import marker');
if(!source.includes('prepareAptActionImport')){
  source=source.replace(importMarker, importMarker+'\nimport {prepareAptActionImport} from "./action-import-20260914-aptas.js";');
}

const initMarker='await prepareReviewedActionImport(state); await removeActions2025(state);';
if(!source.includes(initMarker)) throw new Error('Missing SharedStore action initialization marker');
source=source.replace(initMarker,'await prepareReviewedActionImport(state); await prepareAptActionImport(state); await removeActions2025(state);');

const baseMarker='const base = [...state.reviewedActionImport || [], ...Array.isArray(data.actionPlans) ? data.actionPlans : [], ...overlay]';
if(!source.includes(baseMarker)) throw new Error('Missing central action merge marker');
source=source.replace(baseMarker,'const base = [...state.reviewedAptActionImport || [], ...state.reviewedActionImport || [], ...Array.isArray(data.actionPlans) ? data.actionPlans : [], ...overlay]');

const seqMarker='Math.max(Number(data.sequence?.actionPlans || 0), ...(state.reviewedActionImport || []).map(item => Number(item.id) || 0), ...activeLive';
if(!source.includes(seqMarker)) throw new Error('Missing action sequence marker');
source=source.replace(seqMarker,'Math.max(Number(data.sequence?.actionPlans || 0), ...(state.reviewedAptActionImport || []).map(item => Number(item.id) || 0), ...(state.reviewedActionImport || []).map(item => Number(item.id) || 0), ...activeLive');

await fs.writeFile(path,source);
console.log('Applied reviewed apt actions import patch');
