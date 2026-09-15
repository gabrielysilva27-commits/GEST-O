import fs from 'node:fs/promises';

await fs.copyFile('worker/action-import-20260914-aptas.js','dist/server/action-import-20260914-aptas.js');
for (let i=1;i<=10;i++) {
  const suffix=String(i).padStart(2,'0');
  await fs.copyFile(`worker/action-import-20260914-aptas-data-${suffix}.js`,`dist/server/action-import-20260914-aptas-data-${suffix}.js`);
}

const path='dist/server/index.js';
let source=await fs.readFile(path,'utf8');

const importMarkers=[
  'import {prepareReviewedActionImport,prepareReviewedActionImportB} from "./action-import-20260914.js";',
  'import {prepareReviewedActionImport} from "./action-import-20260914.js";'
];
const importMarker=importMarkers.find(marker=>source.includes(marker));
if(!importMarker) throw new Error('Missing reviewed action import marker');
if(!source.includes('prepareAptActionImport')){
  source=source.replace(importMarker, importMarker+'\nimport {prepareAptActionImport} from "./action-import-20260914-aptas.js";');
}

const initMarkers=[
  'await prepareReviewedActionImport(state); await prepareReviewedActionImportB(state); await removeActions2025(state);',
  'await prepareReviewedActionImport(state); await removeActions2025(state);'
];
const initMarker=initMarkers.find(marker=>source.includes(marker));
if(!initMarker) throw new Error('Missing SharedStore action initialization marker');
const initReplacement=initMarker.includes('prepareReviewedActionImportB')
  ? 'await prepareReviewedActionImport(state); await prepareReviewedActionImportB(state); await prepareAptActionImport(state); await removeActions2025(state);'
  : 'await prepareReviewedActionImport(state); await prepareAptActionImport(state); await removeActions2025(state);';
source=source.replace(initMarker,initReplacement);

const baseMarker='const base = [...state.reviewedActionImport || [], ...Array.isArray(data.actionPlans) ? data.actionPlans : [], ...overlay]';
if(!source.includes(baseMarker)) throw new Error('Missing central action merge marker');
source=source.replace(baseMarker,'const base = [...state.reviewedAptActionImport || [], ...state.reviewedActionImport || [], ...Array.isArray(data.actionPlans) ? data.actionPlans : [], ...overlay]');

const seqMarker='Math.max(Number(data.sequence?.actionPlans || 0), ...(state.reviewedActionImport || []).map(item => Number(item.id) || 0), ...activeLive';
if(!source.includes(seqMarker)) throw new Error('Missing action sequence marker');
source=source.replace(seqMarker,'Math.max(Number(data.sequence?.actionPlans || 0), ...(state.reviewedAptActionImport || []).map(item => Number(item.id) || 0), ...(state.reviewedActionImport || []).map(item => Number(item.id) || 0), ...activeLive');

await fs.writeFile(path,source);
console.log('Applied reviewed apt actions import patch');

// Run after every historical batch is available, including persisted chunks.
await fs.copyFile('worker/complete-imported-actions.js','dist/server/complete-imported-actions.js');
source = 'import {completeImportedActions,completeImportedAction} from "./complete-imported-actions.js";\n' + source;
function replaceRequired(before, after) {
  if (!source.includes(before)) throw new Error('Missing imported completion marker: ' + before);
  source = source.replace(before, after);
}
replaceRequired('await removeActions2025(state);', 'await removeActions2025(state); await completeImportedActions(state);');
// Old browser saves must not reopen imported history after migration.
replaceRequired('actionPlans: [...byId.values()]', 'actionPlans: [...byId.values()].map(action => completeImportedAction(action, state.importedActionsCompletedAt || new Date().toISOString()))');
replaceRequired('      this.applySharedActionImport(body.data);', '      this.applySharedActionImport(body.data);\n      body.data.actionPlans = (body.data.actionPlans || []).map(action => completeImportedAction(action, this.state.importedActionsCompletedAt || new Date().toISOString()));');
replaceRequired('      if (existing >= 0) live[existing] = item;', '      item = completeImportedAction(item, this.state.importedActionsCompletedAt || new Date().toISOString());\n      if (existing >= 0) live[existing] = item;');
await fs.writeFile(path,source);
console.log('Applied imported history completion migration');
