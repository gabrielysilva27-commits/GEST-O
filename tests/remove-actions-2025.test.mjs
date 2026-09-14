import test from 'node:test';import assert from 'node:assert/strict';
import {SharedStore} from '../dist/server/index.js';
test('2025 actions stay deleted after restart and stale database saves; 2026 and cadastros survive',async()=>{
 const actions=[{id:1,createdAt:'2025-01-01',meetingExecutionDate:'2025-01-01'},{id:2,createdAt:'2026-01-01',dueDate:'2026-01-02'},{id:3,createdAt:'2025-09-25',meetingExecutionDate:'2026-09-25'},{id:4,createdAt:'2026-12-17',meetingExecutionDate:'2025-01-03'}];
 const data={actionPlans:actions,meetings:[{id:1,subjects:['OTIF']}],notifications:[{id:1,actionPlanId:1},{id:2,actionPlanId:2}]};
 const values=new Map([['data',data],['actionImport20260914:manifest',{keys:[]}]]);
 const storage={get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v)),list:async()=>new Map()};storage.transaction=async fn=>fn(storage);
 const read=async()=>{const store=new SharedStore({storage},{});return (await(await store.fetch(new Request('https://lead.test/api/shared-view'))).json()).data;};
 const first=await read();assert.deepEqual(first.actionPlans,[actions[1]]);assert.deepEqual(first.meetings,data.meetings);assert.deepEqual(values.get('data'),data);
 assert.equal(values.get('removedActions2025:20260914').count,3);
 assert.deepEqual((await read()).actionPlans,first.actionPlans);assert.equal(values.get('revision'),1);
 values.set('data',structuredClone(data));assert.deepEqual((await read()).actionPlans,first.actionPlans);
});
