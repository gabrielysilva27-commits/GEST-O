import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://lead-gestao.gabrielysilva27.workers.dev/');
await page.locator('#login-form input[name=username]').fill(process.env.TEST_USERNAME);
await page.locator('#login-form input[name=password]').fill(process.env.TEST_PASSWORD);
await page.locator('#login-form button[type=submit]').click();
await page.waitForFunction(()=>document.querySelector('#loginRoot')?.hidden===true);
for(const view of ['dashboard','actionPlans','meetings','gapa','dto','gerot']){
 await page.evaluate(v=>{location.hash=v;},view);
 await page.waitForTimeout(2000);
 const text=await page.locator('#page-content').innerText();
 if(/Falha ao autenticar|Não foi possível carregar|Erro ao carregar/.test(text))throw Error(view+': load failure');
 console.log(JSON.stringify({view,contentPresent:text.length>30}));

 if(view==='actionPlans'){
   if(await page.locator('[data-action-filter="meeting"] option').first().textContent() !== 'Selecionar') throw Error('action initial filter must be Selecionar');
   if(!(await page.locator('[data-action-filter-result]').innerText()).includes('Selecione ao menos um filtro')) throw Error('actions must start filtered');
   await page.locator('[data-action-filter="meeting"]').selectOption({index:1});
   if(await page.locator('[data-action-row]:not([hidden])').count()===0) throw Error('action selection did not return results');
 }

 if(view==='gapa'){
   if(await page.locator('[data-audit-filter="pilar"] option').first().textContent() !== 'Selecionar') throw Error('audit initial filter must be Selecionar');
   if(!(await page.locator('[data-audit-filter-result]').innerText()).includes('Selecione ao menos um filtro')) throw Error('audit must start filtered');
   await page.locator('[data-audit-filter="pilar"]').selectOption({index:1});
   if(await page.locator('[data-audit-row]:not([hidden])').count()===0) throw Error('audit selection did not return results');
 }

 if(view==='dto'){
   if(await page.locator('[data-dto2-filter="dto"] option').first().textContent() !== 'Selecionar') throw Error('DTO initial filter must be Selecionar');
   if(!(await page.locator('[data-dto2-list]').innerText()).includes('Selecione ao menos um filtro')) throw Error('DTO must start filtered');
   await page.locator('[data-dto2-filter="dto"]').selectOption({index:1});
   if(await page.locator('[data-dto2-detail]').count()===0) throw Error('DTO selection did not return results');
 }
}
if(errors.length)throw Error(errors.join('\n'));
await browser.close();
