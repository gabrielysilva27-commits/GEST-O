import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedStore} from '../dist/server/index.js';
import records from '../worker/action-import-20260914-data.js';
function fixture(){
 const meetings=[...new Map(records.map(r=>[r.meetingId,{id:r.meetingId,title:r.meetingTitle,subjects:records.filter(a=>a.meetingId===r.meetingId).map(a=>a.meetingSubject)}])).values()];
 const original={meetings,actionPlans:[{id:42,objective:'Preservar',status:'in_progress'}],sequence:{actionPlans:42}};
 const values=new Map([['data',structuredClone(original)],['removedActions2025:20260914',{count:0}]]);
 const storage={get:async k=>structuredClone(values.get(k)),put:async(k,v)=>{for(const [key,value] of typeof k==='string'?[[k,v]]:Object.entries(k)){assert.ok(Buffer.byteLength(JSON.stringify(value))<128000);values.set(key,structuredClone(value));}},list:async({prefix}={})=>new Map([...values].filter(([k])=>!prefix||k.startsWith(prefix)))};
 storage.transaction=async fn=>fn(storage);
 const read=async()=>{const store=new SharedStore({storage},{});return (await (await store.fetch(new Request('https://lead.test/api/shared-view'))).json()).data;};
 return {values,storage,original,read};
}
test('reviewed import persists across restart without changing cadastros or existing actions',async()=>{
 const f=fixture();const first=await f.read();assert.equal(first.actionPlans.length,records.length+1);assert.deepEqual(f.values.get('data'),f.original);
 const second=await f.read();assert.deepEqual(second.actionPlans,first.actionPlans);assert.equal(f.values.get('revision'),1);
 const ids=first.actionPlans.map(a=>a.id);assert.equal(new Set(ids).size,ids.length);
 const imported=first.actionPlans.find(a=>a.legacyImportKey);
 f.values.set('liveActions',[{...imported,status:'done',objective:'Atualização posterior'}]);
 assert.equal((await f.read()).actionPlans.find(a=>a.id===imported.id).objective,'Atualização posterior');
 f.values.set('deletedLiveActionIds',[imported.id]);
 assert.ok(!(await f.read()).actionPlans.some(a=>a.id===imported.id));
});
test('removed subject is skipped; import never creates missing cadastros',async()=>{
 const f=fixture();const d=f.values.get('data');d.meetings[0].subjects=[];
 const before=structuredClone(d.meetings);const actual=await f.read();
 assert.ok(actual.actionPlans.length<records.length+1);assert.deepEqual(actual.meetings,before);
});
