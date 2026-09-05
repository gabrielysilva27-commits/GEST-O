import {state} from './state.js';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function installControls(getRecord,reload) {
 const root=document.querySelector('#page-content');
 const allowed=r=>state.user&&(state.user.role==='admin'||Number(state.user.id)===Number(r.applicatorId||r.ownerId));
 function enhance(){
  const back=root?.querySelector('[data-dto2-back]'),r=getRecord();
  if(!back||!r||!allowed(r)||root.querySelector('[data-dto-controls]'))return;
  const group=document.createElement('div');group.dataset.dtoControls='';group.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  back.before(group);group.innerHTML='<button type="button" class="button secondary" data-edit-dto>Editar DTO</button><button type="button" class="button secondary" data-delete-dto>Excluir DTO</button>';group.append(back);
 }
 async function send(r,method,item){
  const response=await fetch('/api/dto-applications/'+r.id,{method,headers:{'content-type':'application/json',authorization:'Bearer '+localStorage.getItem('lead-gestao-sync-token')},body:item?JSON.stringify({item}):undefined});
  const payload=await response.json();if(!response.ok)throw Error(payload.error||'Não foi possível salvar.');
  return payload;
 }
 document.addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit-dto]'),del=e.target.closest('[data-delete-dto]');if(!edit&&!del)return;
  e.preventDefault();e.stopImmediatePropagation();const r=getRecord();if(!r||!allowed(r))return;
  if(del){if(!confirm('Excluir este DTO?'))return;del.disabled=true;try{await send(r,'DELETE');await reload(null);}catch(error){alert(error.message);del.disabled=false;}return;}
  const dialog=document.createElement('dialog');dialog.style.cssText='width:min(900px,90vw);max-height:90vh;overflow:auto;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);';
  dialog.innerHTML=`<form class="stack"><h2>Editar DTO</h2><label class="field">Data<input type="date" name="applicationDate" value="${esc(r.applicationDate)}" required></label><label class="field">Funcionário<input name="employeeName" value="${esc(r.employeeName)}" maxlength="160" required></label>${r.answers.map((a,i)=>`<label class="field">${esc(a.question)}<select name="answer${i}" required><option ${a.result==='OK'?'selected':''}>OK</option><option ${a.result==='NOK'?'selected':''}>NOK</option></select></label>`).join('')}<label class="field">Plano de ação / observações<textarea name="actionPlan" rows="5" maxlength="5000">${esc(r.actionPlan)}</textarea></label><p role="alert"></p><div style="display:flex;gap:8px"><button type="submit" class="button primary">Salvar DTO</button><button type="button" class="button secondary" data-cancel>Cancelar</button></div></form>`;
  document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();event.stopPropagation();const form=event.target,button=form.querySelector('[type=submit]');button.disabled=true;try{const values=new FormData(form);await send(r,'PATCH',{applicationDate:values.get('applicationDate'),employeeName:values.get('employeeName'),actionPlan:values.get('actionPlan'),answers:r.answers.map((a,i)=>({...a,result:values.get('answer'+i)}))});dialog.close();await reload(r.id);}catch(error){form.querySelector('[role=alert]').textContent=error.message;button.disabled=false;}};
 },true);
 new MutationObserver(enhance).observe(root,{childList:true,subtree:true});enhance();
}
