import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://lead-gestao.gabrielysilva27.workers.dev';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
let testId, token;
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
if(process.env.LOCAL_ASSETS==='1'){
 const {default:worker}=await import('../dist/server/index.js');
 await page.route(base+'/**',async route=>{
   if(new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();
   const response=await worker.fetch(new Request(route.request().url()),{});
   await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
 });
}
try {
 await page.goto(base);
 await page.locator('#login-form input[name=username]').fill(process.env.TEST_USERNAME);
 await page.locator('#login-form input[name=password]').fill(process.env.TEST_PASSWORD);
 await page.locator('#login-form button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#loginRoot').hidden);
 console.log('Login validado');
 token=await page.evaluate(()=>localStorage.getItem('lead-gestao-sync-token'));
 const headers={authorization:'Bearer '+token,'content-type':'application/json'};
 const read=async()=>{
   const response=await fetch(base+'/api/shared-data',{headers});
   assert.equal(response.status,200);
   return (await response.json()).data;
 };
 const before=await read();
 const title='Verificação temporária de edição '+crypto.randomUUID();
 const initial={id:Math.max(...before.actionPlans.map(a=>Number(a.id)))+1,syncId:crypto.randomUUID(),title,meetingSubject:title,objective:title,status:'done',priority:'medium',dueDate:'2026-09-30',createdAt:new Date().toISOString(),ownerId:1,requesterId:1,createdBy:1,companyId:0,unitId:0};
 const created=await fetch(base+'/api/live-actions',{method:'POST',headers,body:JSON.stringify({item:initial})});
 assert.equal(created.status,200);
 testId=(await created.json()).item.id;
 console.log('Registro temporário criado');
 await page.evaluate(()=>location.hash='actionPlans');
 await page.locator('[data-action-filter="subject"]').waitFor({timeout:60000});
 console.log('Lista carregada');
 await page.locator('[data-action-filter="subject"]').selectOption({label:title});
 const prompts=[title+' — editada','2026-10-01','high'];
 const editDialog=async dialog=>dialog.accept(prompts.shift());
 page.on('dialog',editDialog);
 await page.locator(`[data-edit-owned-action="${testId}"]`).click();
 await page.getByText('Ação atualizada.',{exact:true}).waitFor({timeout:60000});
 console.log('Edição confirmada pela tela');
 page.off('dialog',editDialog);
 const edited=(await read()).actionPlans.find(a=>Number(a.id)===Number(testId));
 assert.equal(edited.objective,title+' — editada');
 assert.equal(edited.dueDate,'2026-10-01');
 assert.equal(edited.priority,'high');
 await page.reload();
 await page.locator('[data-action-filter="subject"]').waitFor({timeout:60000});
 await page.locator('[data-action-filter="subject"]').selectOption({label:title});
 assert.ok((await page.locator(`[data-action-row]`).filter({has:page.locator(`[data-delete-owned-action="${testId}"]`)}).innerText()).includes('— editada'));
 page.once('dialog',dialog=>dialog.accept());
 await page.locator(`[data-delete-owned-action="${testId}"]`).click();
 await page.getByText('Ação excluída.',{exact:true}).waitFor({timeout:60000});
 const after=await read();
 assert.equal(after.actionPlans.some(a=>Number(a.id)===Number(testId)),false);
 const existing=new Map(after.actionPlans.map(a=>[a.id,a]));
 for(const item of before.actionPlans)assert.deepEqual(existing.get(item.id),item);
 assert.equal(after.actionPlans.length,before.actionPlans.length);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({mode:process.env.LOCAL_ASSETS==='1'?'preview':'production',edit:true,reload:true,delete:true,existingActionsPreserved:before.actionPlans.length,compressedCharacters:await page.evaluate(()=>localStorage.getItem('lead-gestao-db-v2').length)}));
} finally {
 if(testId&&token){
   const cleanup=await fetch(base+'/api/live-actions/'+testId,{method:'DELETE',headers:{authorization:'Bearer '+token}});
   if(!cleanup.ok)throw new Error('Não foi possível remover o registro temporário '+testId);
 }
 await browser.close();
}
