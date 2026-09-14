import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { SharedStore } from '../dist/server/index.js';
import { databaseStorage } from '../assets/js/database-storage.js';

test('release files support revalidation, HEAD and versioned cache without stale unversioned assets', async () => {
  const response = await worker.fetch(new Request('https://lead.test/'));
  const html = await response.text();
  const script = html.match(/src="(assets\/js\/app.js\?v=[^"]+)"/)[1];
  const asset = await worker.fetch(new Request(new URL(script, 'https://lead.test/')));
  assert.match(asset.headers.get('cache-control'), /immutable/);
  const unchanged = await worker.fetch(new Request('https://lead.test/', { headers: { 'if-none-match': response.headers.get('etag') } }));
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '');
  const plain = await worker.fetch(new Request('https://lead.test/assets/js/app.js'));
  assert.equal(plain.headers.get('cache-control'), 'no-cache');
  const head = await worker.fetch(new Request('https://lead.test/assets/js/app.js', { method: 'HEAD' }));
  assert.equal(await head.text(), '');
});

test('old full-database revisions cannot replace a teammate save', async () => {
  const values = new Map([
    ['data', { meetings: [], actionPlans: [], sequence: {} }],
    ['sessions', { test: { username: 'Gabriely', role: 'admin', expiresAt: Date.now() + 60000 } }]
  ]);
  const storage = {
    get: async key => structuredClone(values.get(key)),
    put: async (key, value) => { for (const [k, v] of typeof key === 'string' ? [[key, value]] : Object.entries(key)) values.set(k, structuredClone(v)); }
  };
  const store = new SharedStore({ storage }, {});
  const request = (method, body) => new Request('https://lead.test/api/shared-data', { method, headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const initial = await (await store.fetch(request('GET'))).json();
  assert.equal(initial.revision, 0);
  assert.equal((await store.fetch(request('PUT', { data: { ...initial.data, gapaRecords: [{ id: 1 }] }, baseRevision: 0 }))).status, 200);
  assert.equal((await store.fetch(request('PUT', { data: initial.data, baseRevision: 0 }))).status, 409);
  assert.deepEqual(values.get('data').gapaRecords, [{ id: 1 }]);
  assert.equal((await store.fetch(new Request('https://lead.test/api/shared-data'))).status, 401);
});

test('unchanged sessions receive a tiny revision response and live actions invalidate it', async () => {
  const values = new Map([
    ['data', { meetings: [], actionPlans: [{ id: 1, status: 'done' }], notifications: [], sequence: { actionPlans: 1 } }],
    ['revision', 7],
    ['sessions', { test: { username: 'Gabriely', role: 'admin', expiresAt: Date.now() + 60000 } }]
  ]);
  const storage = {
    get: async key => structuredClone(values.get(key)),
    put: async (key, value) => { for (const [k, v] of typeof key === 'string' ? [[key, value]] : Object.entries(key)) values.set(k, structuredClone(v)); }
  };
  const store = new SharedStore({ storage }, {});
  const auth = { authorization: 'Bearer test' };
  const unchanged = await (await store.fetch(new Request('https://lead.test/api/shared-data?revision=7', { headers: auth }))).json();
  assert.deepEqual(unchanged, { unchanged: true, revision: 7 });
  const item = { id: 2, syncId: 'fast-test', status: 'in_progress', ownerId: 1, createdAt: '2026-09-14T12:00:00.000Z' };
  await store.fetch(new Request('https://lead.test/api/live-actions', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ item }) }));
  assert.equal(values.get('revision'), 8);
  const changed = await (await store.fetch(new Request('https://lead.test/api/shared-data?revision=7', { headers: auth }))).json();
  assert.equal(changed.revision, 8);
  assert.ok(changed.data.actionPlans.some(action => action.id === 2));
});

test('queued writes preserve both edits and hot reads wait for confirmation', async (t) => {
  const values = new Map([['lead-gestao-sync-token', 'test']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  } });
  t.after(() => { delete globalThis.localStorage; });
  let central = { gapaRecords: [], sequence: {} }, revision = 0, release;
  databaseStorage.setItem('lead-gestao-db-v2', JSON.stringify(central));
  t.mock.method(globalThis, 'fetch', async (_url, options = {}) => {
    if (options.method === 'PUT') {
      if (!revision) await new Promise(resolve => { release = resolve; });
      const body = JSON.parse(options.body);
      assert.equal(body.baseRevision, revision);
      central = body.data;
      return Response.json({ revision: ++revision });
    }
    return Response.json({ data: central, revision });
  });
  const { createSharedApi } = await import('../assets/js/shared-api.js');
  const api = createSharedApi({
    create: async (_token, _path, item) => {
      const data = JSON.parse(databaseStorage.getItem('lead-gestao-db-v2'));
      data.gapaRecords.push(item);
      databaseStorage.setItem('lead-gestao-db-v2', JSON.stringify(data));
      return { success: true };
    },
    list: async () => JSON.parse(databaseStorage.getItem('lead-gestao-db-v2')).gapaRecords
  });
  const first = api.create('test', '/gapa', { id: 1 });
  await new Promise(resolve => setImmediate(resolve));
  const second = api.create('test', '/gapa', { id: 2 });
  const read = api.list('test', '/gapa');
  release();
  await Promise.all([first, second]);
  assert.deepEqual(await read, [{ id: 1 }, { id: 2 }]);
  assert.equal(revision, 2);
});
