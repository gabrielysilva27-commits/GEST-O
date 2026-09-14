const marker='removedActions2025:20260914';
export const isAction2025=action=>['meetingExecutionDate','createdAt','dueDate'].some(key=>String(action?.[key]||'').startsWith('2025-'));
export async function removeActions2025(state){
 const storage=state.storage;
 if(await storage.get(marker))return;
 const data=await storage.get('data');
 if(!data?.actionPlans)return;
 const reviewed=state.reviewedActionImport||[];
 const overlay=await storage.get('centralImportOverlay')||[],live=await storage.get('liveActions')||[];
 const actions=new Map([...reviewed,...data.actionPlans,...overlay,...live].map(a=>[Number(a.id),a]));
 const ids=[...actions.values()].filter(isAction2025).map(a=>Number(a.id));
 if(!ids.length)return;
 await storage.transaction(async tx=>{
   if(await tx.get(marker))return;
   const deleted=new Set(await tx.get('deletedLiveActionIds')||[]);
   for(const id of ids)deleted.add(id);
   await tx.put('deletedLiveActionIds',[...deleted]);
   await tx.put(marker,{ids,count:ids.length,removedAt:new Date().toISOString(),criterion:'2025 in meetingExecutionDate, createdAt or dueDate'});
   await tx.put('revision',Number(await tx.get('revision')||0)+1);
 });
}
