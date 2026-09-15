import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
let source = readFileSync(new URL('../assets/js/modules/index.js', import.meta.url), 'utf8');
for (const path of ['gerot-delivery-engine.js','gerot-presentation.js']) source = source.replace(`"../${path}"`, JSON.stringify(new URL(`../assets/js/${path}`, import.meta.url).href));
source = source.replace("import {anomalyReportsView} from '../anomaly-ui.js';", 'const anomalyReportsView = () => "";');
const { views, applyDashboardFilters } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('dashboard renders the eight requested columns, full action and escaped content', () => {
 const today = new Date(); const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const html = views.dashboard.render({ actionPlans: [{ id:1, meetingExecutionDate:date, objective:'<script>alert(1)</script>',sector:'CONTROLE',requesterName:'José',legacyOwnerName:'João' }] },{lookups:{}});
 for(const col of ['Data','Reunião','Assunto','Solicitante','Responsável','Ações','Setor','Status']) assert.ok(html.includes(`scope="col">${col}</th>`));
 assert.ok(html.includes('opened-today'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert'));
 assert.equal((html.match(/data-dashboard-filter=/g)||[]).length,9);
});

test('combined filters ignore accents, support dates, empty result and reset', () => {
 const inputs = [{dataset:{dashboardFilter:'search'},value:'JOSE'},{dataset:{dashboardFilter:'from'},value:'2026-09-15'},{dataset:{dashboardFilter:'sector'},value:'controle'}];
 const rows = [{dataset:{date:'2026-09-15',search:'José estoque',sector:'CONTROLE'}},{dataset:{date:'2026-09-14',search:'José estoque',sector:'CONTROLE'}},{dataset:{date:'2026-09-15',search:'José estoque',sector:'ENTREGA'}}];
 const count={},empty={};const card={querySelectorAll:q=>q==='[data-dashboard-filter]'?inputs:rows,querySelector:q=>q==='[data-dashboard-count]'?count:empty};const root={querySelector:()=>card};
 applyDashboardFilters(root);assert.deepEqual(rows.map(r=>r.hidden),[false,true,true]);assert.equal(count.textContent,'1 de 3 ações');
 inputs[0].value='inexistente';applyDashboardFilters(root);assert.ok(rows.every(r=>r.hidden));assert.equal(empty.hidden,false);
 applyDashboardFilters(root,true);assert.ok(rows.every(r=>!r.hidden));assert.equal(count.textContent,'3 de 3 ações');
});
