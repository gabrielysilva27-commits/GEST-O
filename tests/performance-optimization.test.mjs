import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const shared = readFileSync(new URL('../assets/js/shared-api.js', import.meta.url), 'utf8');
const optimizer = readFileSync(new URL('../assets/js/performance-optimizer.js', import.meta.url), 'utf8');
const lazy = readFileSync(new URL('../assets/js/lazy-features.js', import.meta.url), 'utf8');
const build = readFileSync(new URL('../scripts/build-recovered.mjs', import.meta.url), 'utf8');
const builtWorker = readFileSync(new URL('../dist/server/index.js', import.meta.url), 'utf8');

// Core modules are requested in parallel, while route-only enhancements no longer block startup.
for (const moduleName of ['state.js', 'database-storage.js', 'shared-api.js', 'api.js', 'modules/index.js']) {
  assert.match(index, new RegExp(`rel="modulepreload" href="assets/js/${moduleName.replace('.', '\\.')}`));
}
assert.match(index, /assets\/js\/performance-optimizer\.js/);
assert.match(index, /assets\/js\/lazy-features\.js/);
assert.doesNotMatch(index, /<script[^>]+src="assets\/js\/dto-module\.js/);
assert.doesNotMatch(index, /<script[^>]+src="assets\/js\/dto-ui\.js/);
assert.doesNotMatch(index, /<script[^>]+src="assets\/js\/dto-compact\.js/);
assert.doesNotMatch(index, /<script[^>]+src="assets\/js\/anomaly-finish\.js/);
assert.doesNotMatch(index, /<script[^>]+src="assets\/js\/notifications-ui\.js/);

// Reads no longer block module changes on a full shared-database download.
assert.match(shared, /let syncInFlight = null/);
assert.match(shared, /SYNC_FRESH_MS = 8000/);
assert.match(shared, /scheduleSharedRefresh/);
assert.match(shared, /requestIdleCallback/);
assert.match(shared, /if \(!fresh && hasLocalDatabase\(\)\)/);
assert.match(shared, /lastRemoteSnapshot/);
assert.match(shared, /remoteSnapshot === lastRemoteSnapshot/);
assert.match(shared, /if \(syncInFlight\) return syncInFlight/);
assert.match(shared, /presence: \(\.\.\.args\) => api\.presence\(\.\.\.args\)/);
assert.match(shared, /requireSharedSync\(\{ force: true \}\)/);
assert.match(shared, /me: \(\.\.\.args\) => readMethod\("me", args, \{ fresh: true \}\)/);

// The large local database is parsed/sanitized once and reused until storage or the calendar day changes.
assert.match(build, /databaseMemoryCache/);
assert.match(build, /raw === databaseMemoryRaw/);
assert.match(builtWorker, /databaseMemoryCache/);
assert.match(builtWorker, /databaseMemoryDay/);

// Ações keeps the exact existing row HTML, but does not insert thousands of rows until a filter is selected.
assert.match(optimizer, /cacheActionRows/);
assert.match(optimizer, /return html\.slice\(0, tbodyStart \+ 7\) \+ html\.slice\(tbodyEnd\)/);
assert.match(optimizer, /const hasFilters = Object\.values\(filters\)\.some\(Boolean\)/);
assert.match(optimizer, /actionRows\.filter\(\(row\) => matchesAction\(row, filters\)\)/);

// Navigation intent and browser idle time warm module data without starting network synchronization.
assert.match(optimizer, /VIEW_CACHE_TTL_MS/);
assert.match(optimizer, /wrapViewLoads/);
assert.match(optimizer, /view\.load\(localApi, state\.token\)/);
assert.match(optimizer, /warmViewsWhenReady/);
assert.match(optimizer, /pointerdown/);
assert.match(optimizer, /pointerover/);
assert.match(optimizer, /requestIdleCallback/);
assert.match(optimizer, /lead:shared-synced/);

// DTO, anomalia and notificações are loaded on demand or on navigation intent.
assert.match(lazy, /import\('\.\/dto-module\.js'\)/);
assert.match(lazy, /import\('\.\/anomaly-finish\.js'\)/);
assert.match(lazy, /import\('\.\/notifications-ui\.js'\)/);
assert.match(lazy, /pointerover/);

console.log('Performance: local-first navigation, hot cache, idle shared sync, lazy features and filtered action rendering validated');
