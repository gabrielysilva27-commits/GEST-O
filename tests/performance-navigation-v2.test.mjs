import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shared = readFileSync(new URL('../assets/js/shared-api.js', import.meta.url), 'utf8');
const optimizer = readFileSync(new URL('../assets/js/performance-optimizer.js', import.meta.url), 'utf8');

assert.match(shared, /scheduleSharedRefresh/);
assert.match(shared, /requestIdleCallback/);
assert.match(shared, /if \(hasLocalDatabase\(\)\) \{\s*scheduleSharedRefresh\(\);\s*return api\[method\]\(\.\.\.args\);/s);
assert.match(shared, /lastRemoteSnapshot/);
assert.match(shared, /remoteSnapshot === lastRemoteSnapshot/);
assert.match(shared, /lead:shared-synced/);
assert.match(shared, /me: \(\.\.\.args\) => readMethod\("me", args, \{ fresh: true \}\)/);

assert.match(optimizer, /VIEW_CACHE_TTL_MS/);
assert.match(optimizer, /wrapViewLoads/);
assert.match(optimizer, /pointerdown/);
assert.match(optimizer, /warmViewsWhenReady/);
assert.match(optimizer, /requestIdleCallback/);
assert.match(optimizer, /view\.load\(localApi, state\.token\)/);
assert.match(optimizer, /lead:shared-synced/);

console.log('Performance navigation v2: local-first reads, idle synchronization and warm module caches validated');
