import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://lead-gestao.gabrielysilva27.workers.dev',browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
let id,token;
const errors=[];page.on('pageerror',error=>errors.push(error.message));
if(process.env.LOCAL_ASSETS==='1'){
 const {default:worker}=await import('../dist/server/index.js');
 const {anomalyRequest}=await import('../worker/anomaly-items.js'),values=new Map([['data',{sequence:{anomalyReports:0},anomalyReports:[]}]]),storage={get:async key=>structuredClone(values.get(key)),put:async(key,value)=>values.set(key,structuredClone(value))},users=[{id:1,username:'Gabriely',title:'Gabriely'}];
 await page.route(base+'/**',async route=>{const path=new URL(route.request().url()).pathname;if(path.startsWith('/api/anomaly-reports')){const source=route.request(),response=await anomalyRequest(new Request(source.url(),{method:source.method(),headers:source.headers(),body:['GET','HEAD'].includes(source.method())?undefined:source.postDataBuffer()}),storage,{username:'Gabriely',role:'admin'},users);return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});}if(path.startsWith('/api/'))return route.continue();const response=await worker.fetch(new Request(route.request().url()),{});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
}
try{
 await page.goto(base);await page.locator('#login-form input[name=username]').fill(process.env.TEST_USERNAME);await page.locator('#login-form input[name=password]').fill(process.env.TEST_PASSWORD);await page.locator('#login-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#loginRoot').hidden);
 token=await page.evaluate(()=>localStorage.getItem('lead-gestao-sync-token'));const auth={authorization:'Bearer '+token};
 if(process.env.LOCAL_ASSETS!=='1'){const stale=await fetch(base+'/api/anomaly-reports',{headers:auth}).then(response=>response.json());for(const record of stale.items||[])if(String(record.occurrence).startsWith('Teste temporário '))await fetch(base+'/api/anomaly-reports/'+record.id,{method:'DELETE',headers:auth});}
 await page.evaluate(()=>location.hash='anomalyReports');await page.locator('[data-anomaly-apply]').waitFor({timeout:60000});
 assert.ok((await page.locator('[data-anomaly-list]').innerText()).includes('Selecione ao menos um filtro'));
 await page.locator('[data-anomaly-apply]').click();const occurrence='Teste temporário '+crypto.randomUUID();
 await page.locator('[name=date]').fill('2026-09-06');await page.locator('[name=indicator]').selectOption('TML');await page.locator('[name=occurrence]').fill(occurrence);
 for(let index=1;index<=5;index++)await page.locator(`[name=why${index}]`).fill(`Causa ${index}`);
 await page.locator('[name=actionPlan]').fill('Plano temporário');await page.locator('[data-anomaly-form] button[type=submit]').click();await page.getByText('Relato aplicado.',{exact:true}).waitFor({timeout:60000});
 id=Number(await page.locator('[data-anomaly-edit]').getAttribute('data-anomaly-edit'));assert.ok(id>0);assert.ok((await page.locator('.anomaly-causes').innerText()).includes('Causa 5'));
 await page.locator('[data-anomaly-edit]').click();await page.locator('[name=actionPlan]').fill('Plano temporário editado');await page.locator('[data-anomaly-form] button[type=submit]').click();await page.getByText('Relato atualizado.',{exact:true}).waitFor({timeout:60000});
 await page.reload();await page.locator('[data-anomaly-filter="indicator"]').waitFor({timeout:60000});await page.locator('[data-anomaly-filter="indicator"]').selectOption('TML');await page.locator('[data-anomaly-filter="text"]').fill(occurrence);assert.equal(await page.locator(`[data-anomaly-open="${id}"]`).count(),1);await page.evaluate(value=>window.__openAnomaly(value),id);await page.locator('.anomaly-causes').waitFor({timeout:60000});assert.ok((await page.locator('.anomaly-view').innerText()).includes('Plano temporário editado'));
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-anomaly-delete]').click();await page.getByText('Relato excluído.',{exact:true}).waitFor({timeout:60000});
 if(process.env.LOCAL_ASSETS!=='1'){const records=await fetch(base+'/api/anomaly-reports',{headers:auth}).then(response=>response.json());assert.equal(records.items.some(record=>Number(record.id)===id),false);}id=null;assert.deepEqual(errors,[]);
 console.log(JSON.stringify({mode:process.env.LOCAL_ASSETS==='1'?'preview':'production',initialFiltersEmpty:true,create:true,detail:true,edit:true,reload:true,delete:true}));
}finally{if(id&&token)await fetch(base+'/api/anomaly-reports/'+id,{method:'DELETE',headers:{authorization:'Bearer '+token}});await browser.close();}
