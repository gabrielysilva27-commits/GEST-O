import assert from 'node:assert/strict';
import {databaseStorage} from '../assets/js/database-storage.js';
const values=new Map();
globalThis.localStorage={
 getItem:key=>values.get(key)??null,
 setItem(key,value){if(value.length>5*1024*1024)throw new DOMException('Quota exceeded','QuotaExceededError');values.set(key,String(value));},
 removeItem:key=>values.delete(key)
};
const key='lead-gestao-db-v2';
const legacy=JSON.stringify({users:[{id:1}],sessions:[{token:'local-session'}]});
values.set(key,legacy);
assert.equal(databaseStorage.getItem(key),legacy);
const full=JSON.stringify({actionPlans:Array.from({length:6500},(_,id)=>({id,objective:'Revisão da execução e ação responsável '.repeat(30)})),...JSON.parse(legacy)});
assert.throws(()=>localStorage.setItem(key,full),{name:'QuotaExceededError'});
databaseStorage.setItem(key,full);
assert.equal(databaseStorage.getItem(key),full);
// A fresh module instance must recover all data from persistent storage.
const {databaseStorage:reloaded}=await import('../assets/js/database-storage.js?reload-test');
assert.equal(reloaded.getItem(key),full);
assert.equal(JSON.parse(reloaded.getItem(key)).sessions[0].token,'local-session');
databaseStorage.setItem('lead-gestao-sync-token','unchanged-token');
assert.equal(localStorage.getItem('lead-gestao-sync-token'),'unchanged-token');
console.log('Large database compression, session migration and reload passed');
