import p1 from './action-import-20260914-aptas-data-01.js';
import p2 from './action-import-20260914-aptas-data-02.js';
import p3 from './action-import-20260914-aptas-data-03.js';
import p4 from './action-import-20260914-aptas-data-04.js';
import p5 from './action-import-20260914-aptas-data-05.js';
import p6 from './action-import-20260914-aptas-data-06.js';
import p7 from './action-import-20260914-aptas-data-07.js';
import p8 from './action-import-20260914-aptas-data-08.js';
import p9 from './action-import-20260914-aptas-data-09.js';
import p10 from './action-import-20260914-aptas-data-10.js';
const rawRecords=[...p1,...p2,...p3,...p4,...p5,...p6,...p7,...p8,...p9,...p10];
const marker='actionImport20260914AptasV1:manifest';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'');
const records=rawRecords.map(([legacyImportKey,date,meetingId,meetingTitle,meetingSubject,requesterName,legacyOwnerName,objective])=>({
  legacyImportKey,title:meetingSubject,objective,status:'done',priority:'medium',companyId:0,unitId:0,ownerId:0,requesterId:0,
  requesterName,legacyOwnerName,createdBy:1,dueDate:date,meetingId,meetingTitle,meetingSubject,meetingExecutionDate:date,
  source:'legacy_excel',sourceLabel:'Acoes_nao_importadas_LEAD_20260914_REVISADO.xlsx',legacyStatus:'CONCLUÍDO',
  legacyImportBatch:'aptas-20260914-v1',createdAt:date+'T12:00:00.000Z',updatedAt:date+'T12:00:00.000Z',completedAt:date+'T12:00:00.000Z'
}));
export async function prepareAptActionImport(state) {
  const storage=state.storage;
  const previous=await storage.get(marker);
  if(previous){state.reviewedAptActionImport=(await Promise.all(previous.keys.map(key=>storage.get(key)))).flat();return;}
  const data=await storage.get('data');
  if(!data?.meetings?.length){state.reviewedAptActionImport=[];return;}
  await storage.transaction(async tx=>{
    const saved=await tx.get(marker);
    if(saved){state.reviewedAptActionImport=(await Promise.all(saved.keys.map(key=>tx.get(key)))).flat();return;}
    const current=await tx.get('data');
    const live=await tx.get('liveActions')||[],overlay=await tx.get('centralImportOverlay')||[];
    const all=[...(current.actionPlans||[]),...overlay,...live,...(state.reviewedActionImport||[])];
    const known=new Set(all.map(a=>a.legacyImportKey).filter(Boolean));
    const signature=new Set(all.map(a=>[norm(a.objective),norm(a.meetingSubject),String(a.meetingExecutionDate||a.createdAt||'').slice(0,10)].join('|')));
    let id=Math.max(1199999,Number(current.sequence?.actionPlans)||0,...all.map(a=>Number(a.id)||0));
    const imported=[];
    for(const record of records){
      if(known.has(record.legacyImportKey))continue;
      const meeting=current.meetings.find(m=>Number(m.id)===record.meetingId&&norm(m.title)===norm(record.meetingTitle));
      const subject=meeting?.subjects?.find(s=>norm(s)===norm(record.meetingSubject));
      if(!subject)continue;
      const sig=[norm(record.objective),norm(subject),String(record.meetingExecutionDate||'').slice(0,10)].join('|');
      if(signature.has(sig))continue;
      imported.push({...record,id:++id,title:subject,meetingTitle:meeting.title,meetingSubject:subject});
      known.add(record.legacyImportKey);signature.add(sig);
    }
    const keys=[];let chunk=[],bytes=2;
    async function flush(){if(!chunk.length)return;const key='actionImport20260914AptasV1:chunk:'+String(keys.length).padStart(4,'0');await tx.put(key,chunk);keys.push(key);chunk=[];bytes=2;}
    for(const item of imported){const size=new TextEncoder().encode(JSON.stringify(item)).length+1;if(bytes+size>80000)await flush();chunk.push(item);bytes+=size;}
    await flush();
    await tx.put(marker,{keys,count:imported.length,createdAt:new Date().toISOString()});
    await tx.put('revision',Number(await tx.get('revision')||0)+1);
    state.reviewedAptActionImport=imported;
  });
}
