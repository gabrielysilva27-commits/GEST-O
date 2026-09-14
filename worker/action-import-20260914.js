import records from './action-import-20260914-data.js';
const marker='actionImport20260914:manifest';
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
