import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('cached modules refresh after local changes and reuse unchanged action rendering',async()=>{
 let raw='initial',loads=0,renders=0,syncs=0;
 const data={items:[]},state={dataCache:{},actionWorkspace:'list',user:{id:1},lookups:{}};
 const views={actionPlans:{load:async()=>{loads++;return data;},render:()=>{renders++;return '<div>Actions</div>';}}};
 const ctx={state,views,localApi:{},databaseStorage:{getItem:()=>raw},syncOperationalData:async()=>{syncs++;},window:{setTimeout:()=>0,clearTimeout:()=>{},addEventListener:()=>{}},document:{addEventListener:()=>{}},queueMicrotask};
 vm.runInNewContext(readFileSync(new URL('../assets/js/performance-optimizer.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),ctx);
 state.dataCache.actionPlans=await views.actionPlans.load();
 await views.actionPlans.load();assert.equal(loads,1);assert.equal(syncs,1);
 raw='changed';await views.actionPlans.load();assert.equal(loads,2);
 views.actionPlans.render(data,state);views.actionPlans.render(data,state);assert.equal(renders,1);
 state.user={id:2};views.actionPlans.render(data,state);assert.equal(renders,2);
});
