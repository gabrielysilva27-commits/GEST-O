import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedStore } from '../dist/server/index.js';
import { completionMarker } from '../worker/complete-imported-actions.js';

test('closes all import stores, preserves site actions, survives restart and stale saves', async () => {
  const imported = (id, source = 'legacy_excel') => ({ id, source, status: 'in_progress', objective: 'Keep text', createdAt: '2026-09-01', legacyStatus: 'EM ANDAMENTO' });
  const native = { id: 9, source: 'meetings', status: 'in_progress', objective: 'Site action' };
  const values = new Map([
    ['data', { actionPlans: [imported(1), native], meetings: [], sequence: {} }],
    ['centralImportOverlay', [imported(2)]], ['liveActions', [imported(3, 'excel_import')]],
    ['actionImport20260914:manifest', { keys: ['chunk'] }], ['chunk', [imported(4)]],
    ['actionImport20260914AptasV1:manifest', { keys: ['apt'] }], ['apt', [imported(5)]],
    ['actionImport20260914b:manifest', {}], ['removedActions2025:20260914', {}],
    ['sessions', { test: { username: 'Gabriely', role: 'admin', expiresAt: Date.now() + 60000 } }]
  ]);
  const storage = { get: async key => structuredClone(values.get(key)), put: async (key, value) => {
    for (const [k, v] of typeof key === 'string' ? [[key, value]] : Object.entries(key)) values.set(k, structuredClone(v));
  } };
  storage.transaction = async fn => fn(storage);
  const request = (path, method = 'GET', body) => new Request('https://lead.test/api/' + path, { method, headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let store = new SharedStore({ storage }, {});
  const first = (await (await store.fetch(request('shared-view'))).json()).data;
  assert.equal(first.actionPlans.length, 6);
  assert.deepEqual(first.actionPlans.find(a => a.id === 9), native);
  for (const action of first.actionPlans.filter(a => a.id !== 9)) {
    assert.equal(action.status, 'done'); assert.ok(action.completedAt);
    assert.equal(action.objective, 'Keep text'); assert.equal(action.legacyStatus, 'EM ANDAMENTO');
  }
  for (const key of ['centralImportOverlay', 'liveActions', 'chunk', 'apt']) assert.equal(values.get(key)[0].status, 'done');
  assert.equal(values.get('data').actionPlans[0].status, 'done');
  assert.equal(values.get(completionMarker).count, 5);
  const revision = values.get('revision');
  store = new SharedStore({ storage }, {});
  assert.deepEqual((await (await store.fetch(request('shared-view'))).json()).data.actionPlans, first.actionPlans);
  assert.equal(values.get('revision'), revision);
  const stale = { ...first, actionPlans: first.actionPlans.map(a => a.id === 1 ? { ...a, status: 'pending' } : a) };
  assert.equal((await store.fetch(request('shared-data', 'PUT', { data: stale, baseRevision: revision }))).status, 200);
  assert.equal(values.get('data').actionPlans.find(a => a.id === 1).status, 'done');
  assert.equal((await store.fetch(request('live-actions', 'POST', { item: imported(3, 'excel_import') }))).status, 200);
  assert.equal(values.get('liveActions')[0].status, 'done');
  assert.equal((await store.fetch(request('live-actions', 'POST', { item: { ...native, id: 10 } }))).status, 200);
  assert.equal(values.get('liveActions').find(a => a.id === 10).status, 'in_progress');
});
