import records from './action-import-20260914-data.js';
import { REVIEWED_ACTION_IMPORT_B_GZIP_BASE64 } from './action-import-20260914b-data.js';
const marker='actionImport20260914:manifest';
const markerB='actionImport20260914b:manifest';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'');
// Immutable, transactionally persisted chunks keep this import separate from
// full-database saves. Existing base/live records override imported defaults.
export async function prepareReviewedActionImport(state) {
  const storage=state.storage;
  const previous=await storage.get(marker);
  if(previous){state.reviewedActionImport=(await Promise.all(previous.keys.map(key=>storage.get(key)))).flat();return;}
  const data=await storage.get('data');
  if(!data?.meetings?.length){state.reviewedActionImport=[];return;}
  await storage.transaction(async tx=>{
    const saved=await tx.get(marker);
    if(saved){state.reviewedActionImport=(await Promise.all(saved.keys.map(key=>tx.get(key)))).flat();return;}
    const current=await tx.get('data');
    const live=await tx.get('liveActions')||[],overlay=await tx.get('centralImportOverlay')||[];
    const all=[...(current.actionPlans||[]),...overlay,...live];
    const known=new Set(all.map(a=>a.legacyImportKey).filter(Boolean));
    let id=Math.max(999999,Number(current.sequence?.actionPlans)||0,...all.map(a=>Number(a.id)||0));
    const imported=[];
    for(const record of records){
      if(known.has(record.legacyImportKey))continue;
      const meeting=current.meetings.find(m=>Number(m.id)===record.meetingId&&norm(m.title)===norm(record.meetingTitle));
      const subject=meeting?.subjects?.find(s=>norm(s)===norm(record.meetingSubject));
      if(!subject)continue;
      imported.push({...record,id:++id,title:subject,meetingTitle:meeting.title,meetingSubject:subject});
      known.add(record.legacyImportKey);
    }
    const keys=[];let chunk=[],bytes=2;
    async function flush(){if(!chunk.length)return;const key='actionImport20260914:chunk:'+String(keys.length).padStart(4,'0');await tx.put(key,chunk);keys.push(key);chunk=[];bytes=2;}
    for(const item of imported){const size=new TextEncoder().encode(JSON.stringify(item)).length+1;if(bytes+size>80000)await flush();chunk.push(item);bytes+=size;}
    await flush();
    await tx.put(marker,{keys,count:imported.length,createdAt:new Date().toISOString()});
    await tx.put('revision',Number(await tx.get('revision')||0)+1);
    state.reviewedActionImport=imported;
  });
}

let reviewedPayloadB=null;
async function loadReviewedPayloadB(){
  if(reviewedPayloadB)return reviewedPayloadB;
  const bytes=Uint8Array.from(atob(REVIEWED_ACTION_IMPORT_B_GZIP_BASE64),char=>char.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  reviewedPayloadB=JSON.parse(await new Response(stream).text());
  return reviewedPayloadB;
}
function actionSignature(meetingId,subject,objective,date){return [Number(meetingId)||0,norm(subject),norm(objective),String(date||'').slice(0,10)].join('|');}

// Second reviewed batch: reuses existing aliases, registers only genuinely
// missing subjects, and persists the imported actions in the central overlay.
export async function prepareReviewedActionImportB(state){
  const storage=state.storage;
  if(await storage.get(markerB))return;
  const payload=await loadReviewedPayloadB();
  await storage.transaction(async tx=>{
    if(await tx.get(markerB))return;
    const current=await tx.get('data');
    if(!current?.meetings?.length)return;
    current.meetings=Array.isArray(current.meetings)?current.meetings:[];
    let subjectsAdded=0;
    for(const [meetingId,subjectName] of payload.registrations||[]){
      const meeting=current.meetings.find(m=>Number(m.id)===Number(meetingId));
      if(!meeting)continue;
      meeting.subjects=Array.isArray(meeting.subjects)?meeting.subjects:[];
      if(!meeting.subjects.some(subject=>norm(subject)===norm(subjectName))){meeting.subjects.push(subjectName);subjectsAdded++;}
    }
    const live=await tx.get('liveActions')||[];
    const overlay=await tx.get('centralImportOverlay')||[];
    const prior=Array.isArray(state.reviewedActionImport)?state.reviewedActionImport:[];
    const all=[...(current.actionPlans||[]),...overlay,...live,...prior];
    const knownKeys=new Set(all.map(action=>action.legacyImportKey).filter(Boolean));
    const signatures=new Set(all.map(action=>actionSignature(action.meetingId,action.meetingSubject||action.title,action.objective,action.meetingExecutionDate||action.createdAt)));
    let id=Math.max(1999999,Number(current.sequence?.actionPlans)||0,...all.map(action=>Number(action.id)||0));
    const imported=[];
    for(const row of payload.rows||[]){
      const [date,meetingId,subjectIndex,requesterIndex,ownerIndex,ownerId,objective,sourceRow]=row;
      const meeting=current.meetings.find(m=>Number(m.id)===Number(meetingId));
      const requestedSubject=payload.subjects?.[subjectIndex];
      const subject=meeting?.subjects?.find(item=>norm(item)===norm(requestedSubject));
      if(!meeting||!subject)continue;
      const requesterName=payload.people?.[requesterIndex]||'';
      const ownerName=payload.people?.[ownerIndex]||'';
      const importKey='review20260914b-row-'+sourceRow;
      const signature=actionSignature(meeting.id,subject,objective,date);
      if(knownKeys.has(importKey)||signatures.has(signature))continue;
      const opened=new Date(date+'T12:00:00.000Z');
      const due=new Date(opened.getTime()+86400000).toISOString().slice(0,10);
      const done=String(date)<= '2026-09-14';
      const record={
        id:++id,title:subject,objective,status:done?'done':'pending',priority:'medium',companyId:0,unitId:0,
        ownerId:Number(ownerId)||0,requesterId:0,requesterName,legacyOwnerName:ownerName,createdBy:1,dueDate:due,
        meetingId:Number(meeting.id)||0,meetingTitle:meeting.title,meetingSubject:subject,meetingExecutionDate:date,
        source:'legacy_excel',sourceLabel:'174_acoes_nao_importadas_LEAD_20260914(1).xlsx',legacySourceRow:Number(sourceRow)||0,
        legacyStatus:done?'CONCLUÍDO':'PENDENTE',legacyImportBatch:'review20260914b',legacyImportKey:importKey,
        createdAt:opened.toISOString(),updatedAt:opened.toISOString(),completedAt:done?opened.toISOString():null
      };
      imported.push(record);knownKeys.add(importKey);signatures.add(signature);
    }
    if(subjectsAdded)await tx.put('data',current);
    if(imported.length)await tx.put('centralImportOverlay',[...overlay,...imported]);
    await tx.put(markerB,{count:imported.length,subjectsAdded,createdAt:new Date().toISOString()});
    await tx.put('revision',Number(await tx.get('revision')||0)+1);
  });
}
