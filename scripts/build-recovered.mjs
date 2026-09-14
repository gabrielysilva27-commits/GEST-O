import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';

let runtime = await fs.readFile('recovered/runtime.js', 'utf8');
const readyMarker='    this.ready = Promise.resolve();';
if (!runtime.includes(readyMarker)) throw Error('Missing SharedStore initialization');
runtime=runtime.replace(readyMarker,'    const initializeActions = async () => { await prepareReviewedActionImport(state); await removeActions2025(state); };\n    this.ready = state.blockConcurrencyWhile ? state.blockConcurrencyWhile(initializeActions) : initializeActions();');
const baseMarker='const base = [...Array.isArray(data.actionPlans) ? data.actionPlans : [], ...overlay]';
if (!runtime.includes(baseMarker)) throw Error('Missing central action merge');
runtime=runtime.replace(baseMarker,'const base = [...state.reviewedActionImport || [], ...Array.isArray(data.actionPlans) ? data.actionPlans : [], ...overlay]');
runtime=runtime.replace('Math.max(Number(data.sequence?.actionPlans || 0), ...activeLive','Math.max(Number(data.sequence?.actionPlans || 0), ...(state.reviewedActionImport || []).map(item => Number(item.id) || 0), ...activeLive');
const entries = JSON.parse(await fs.readFile('recovered/live-assets.json', 'utf8'));
entries.push({ route: '/assets/js/dto-controls.js', kind: 'text', contentType: 'application/javascript; charset=utf-8', body: '' });
for (const route of [
  '/assets/js/database-storage.js',
  '/assets/js/vendor/lz-string.js',
  '/assets/js/anomaly-ui.js',
  '/assets/js/anomaly-finish.js',
  '/assets/js/notifications-ui.js',
  '/assets/js/performance-optimizer.js',
  '/assets/js/lazy-features.js'
]) entries.push({ route, kind: 'text', contentType: 'application/javascript; charset=utf-8', body: '' });
for (const file of [
  'gerot-presentation.js',
  'gerot-reference-metadata.js',
  'gerot-source-sync.js',
  'gerot-source-values.js',
  'gerot-delivery-data.js',
  'gerot-delivery-engine.js',
  'gerot-delivery-model.js',
  'gerot-delivery-editor.js',
  'gerot-delivery-launcher.js',
  'gerot-entrega-standalone.js'
]) entries.push({ route: '/assets/js/' + file, kind: 'text', contentType: 'application/javascript; charset=utf-8', body: '' });
entries.push({ route: '/assets/css/gerot-delivery-workspace.css', kind: 'text', contentType: 'text/css; charset=utf-8', body: '' });
entries.push({ route: '/gerot-entrega-editor.html', kind: 'text', contentType: 'text/html; charset=utf-8', body: '' });

for (const entry of entries) {
  const file = entry.route === '/' ? 'index.html' : entry.route.slice(1);
  const bytes = await fs.readFile(file);
  entry.body = entry.kind === 'base64' ? bytes.toString('base64') : bytes.toString('utf8');
}

// Keep the browser database hot in memory after the first sanitize/parse pass.
// Shared synchronization still invalidates the cache because it replaces the raw stored JSON.
const apiAsset = entries.find((entry) => entry.route === '/assets/js/api.js');
if (!apiAsset) throw new Error('Missing browser api asset');
const databaseFunctions = /function loadDatabase\(\) \{[\s\S]*?\n\}\n\nfunction saveDatabase\(database\) \{\n  localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(database\)\);\n\}/;
if (!databaseFunctions.test(apiAsset.body)) throw new Error('Missing browser database functions');
apiAsset.body = apiAsset.body.replace(databaseFunctions, `let databaseMemoryCache = null;
let databaseMemoryRaw = null;
let databaseMemoryDay = "";

function databaseDayKey() {
  const now = new Date();
  return \`${'${now.getFullYear()}'}-${'${String(now.getMonth() + 1).padStart(2, "0")}'}-${'${String(now.getDate()).padStart(2, "0")}'}\`;
}

function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const day = databaseDayKey();
    if (raw && databaseMemoryCache && raw === databaseMemoryRaw && day === databaseMemoryDay) {
      return databaseMemoryCache;
    }
    if (!raw) {
      const seeded = clone(INITIAL_DATABASE);
      ensureMeetingTemplates(seeded);
      ensureImportedActionHistory(seeded);
      applyLatestGerotData(seeded);
      saveDatabase(seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw);
    const sanitized = applyLatestGerotData(sanitizeDatabase(parsed));
    saveDatabase(sanitized);
    return sanitized;
  } catch {
    const seeded = clone(INITIAL_DATABASE);
    applyLatestGerotData(seeded);
    saveDatabase(seeded);
    return seeded;
  }
}

function saveDatabase(database) {
  const raw = JSON.stringify(database);
  localStorage.setItem(STORAGE_KEY, raw);
  databaseMemoryCache = database;
  databaseMemoryRaw = raw;
  databaseMemoryDay = databaseDayKey();
}`);

// Version the complete module graph together so existing browsers also migrate.
const release = createHash('sha256').update(entries.map((entry) => entry.body).join('')).update(runtime).update(await fs.readFile('scripts/build-recovered.mjs')).digest('hex').slice(0, 12);
for (const entry of entries) {
  if (entry.kind === 'text' && (entry.route === '/' || entry.route.endsWith('.js'))) {
    entry.body = entry.body.replace(/(["'])(\.{0,2}\/[^"'\s]+\.js|assets\/[^"'\s]+\.js)(?:\?[^"'\s]*)?\1/g, (_, quote, path) => `${quote}${path}?v=${release}${quote}`);
  }
}

const api = entries.find((entry) => entry.route === '/assets/js/api.js').body;
const start = api.indexOf('const ADDITIONAL_SEEDED_USERS =');
const end = api.indexOf('\n];', api.indexOf('const SEEDED_USERS =', start)) + 3;
const users = vm.runInNewContext(api.slice(start, end) + ';SEEDED_USERS').map(({ id, username }) => ({ id, username }));
const browserUsers = vm.runInNewContext(api.slice(start, end) + ';SEEDED_USERS');
users.splice(0, users.length, ...browserUsers.map(({ id, username, name, title, department }) => ({ id, username, name, title, department })));
users.push({ id: 1, username: 'Gabriely', name: 'Gabriely', title: 'Gabriely' });

// Keep independently loaded modules sharing their existing instances. Compact
// their output without changing exports or the lazy-loading architecture.
for (const entry of entries) {
  entry.release = release;
  // The archived DTO importer is not in the active module graph; retain it verbatim.
  if (entry.kind === 'text' && /\.(js|css)$/.test(entry.route) && entry.route !== '/assets/js/dto-external-sync.js') {
    entry.body = (await transform(entry.body, {
      loader: entry.route.endsWith('.css') ? 'css' : 'js',
      minifyWhitespace: true,
      charset: 'utf8',
      legalComments: 'none'
    })).code;
  }
  if (entry.kind === 'text' && (entry.route === '/' || entry.route.endsWith('.html'))) {
    entry.body = entry.body.replace(/((?:src|href)=["'])(assets\/[^"'?]+)(?:\?[^"']*)?(["'])/g, (_, prefix, route, quote) => `${prefix}${route}?v=${release}${quote}`);
  }
  entry.etag = '"' + createHash('sha256').update(entry.body).digest('hex').slice(0, 20) + '"';
}

const gerotMergeMarker = '  if (!data) return data;\n  if (data.gerotAdditionalAreas?.ENTREGA) repairGerotEntrega(data.gerotAdditionalAreas.ENTREGA);';
if (!runtime.includes(gerotMergeMarker)) throw Error('Missing GEROT merge marker');
runtime = runtime.replace(gerotMergeMarker, '  if (!data) return data;\n  applyLatestGerotData(data);\n  if (gerotData) applyLatestGerotData(gerotData);\n  if (data.gerotAdditionalAreas?.ENTREGA) repairGerotEntrega(data.gerotAdditionalAreas.ENTREGA);');
const gerotSaveMarker = '      const savedGerot = await this.state.storage.get("gerotData") || {};';
if (!runtime.includes(gerotSaveMarker)) throw Error('Missing GEROT save marker');
runtime = runtime.replace(gerotSaveMarker, gerotSaveMarker + '\n      applyLatestGerotData(data);\n      applyLatestGerotData(savedGerot);');

runtime = runtime.replace('/* ASSET_MAP */', 'var assets = new Map(' + JSON.stringify(entries) + '.map(e=>[e.route,e]));');
runtime = runtime.replace('async function dtoApplicationsFor(state) {', 'async function dtoApplicationsFor(state) { return listDtos(state.storage);\n/*');
runtime = runtime.replace('__name(dtoApplicationsFor, "dtoApplicationsFor");', '*/}\n__name(dtoApplicationsFor, "dtoApplicationsFor");');
const marker = '    const liveActionDelete =';
if (!runtime.includes(marker)) throw Error('Missing dispatch marker');
runtime = runtime.replace(marker, '    const anomalyResponse = await anomalyRequest(request,this.state.storage,claim,DTO_USERS); if(anomalyResponse)return anomalyResponse;\n    const dtoResponse = await dtoItem(request,this.state.storage,claim,DTO_USERS); if(dtoResponse)return dtoResponse;\n' + marker);
runtime = runtime.replace('if (pathname === "/api/session"', 'if (pathname.startsWith("/api/anomaly-reports") || pathname.startsWith("/api/dto-applications/") || pathname === "/api/session"');

await fs.mkdir('dist/server', { recursive: true });
await fs.copyFile('worker/dto-items.js', 'dist/server/dto-items.js');
await fs.copyFile('worker/anomaly-items.js', 'dist/server/anomaly-items.js');
await fs.copyFile('worker/action-import-20260914.js', 'dist/server/action-import-20260914.js');
await fs.copyFile('worker/remove-actions-2025.js', 'dist/server/remove-actions-2025.js');
await fs.copyFile('worker/action-import-20260914-data.js', 'dist/server/action-import-20260914-data.js');
for (const file of ['gerot-reference-metadata.js', 'gerot-source-sync.js', 'gerot-source-values.js', 'gerot-delivery-data.js', 'gerot-delivery-engine.js', 'gerot-delivery-model.js']) {
  await fs.copyFile('assets/js/' + file, 'dist/server/' + file);
}
await fs.writeFile(
  'dist/server/index.js',
  'import {removeActions2025} from "./remove-actions-2025.js";\nimport {prepareReviewedActionImport} from "./action-import-20260914.js";\nimport {hydrateDeliveryArea,applyDeliveryCells} from "./gerot-delivery-model.js";\nimport {applyLatestGerotData} from "./gerot-source-sync.js";\nimport {listDtos,dtoItem} from "./dto-items.js";\nimport {anomalyRequest} from "./anomaly-items.js";\nconst DTO_USERS=' + JSON.stringify(users) + ';\n' + runtime
);
console.log('Rebuilt production assets and runtime');
