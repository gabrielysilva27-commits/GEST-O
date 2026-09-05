export async function listDtos(storage) {
  const data=await storage.get('data')||{};
  const ids=await storage.get('dtoApplicationIds')||[];
  const records=await Promise.all(ids.map(id=>storage.get('dtoApplication:'+id)));
  const edits=await storage.get('dtoEdits')||{};
  const deleted=new Set(await storage.get('dtoDeletedIds')||[]);
  const map=new Map((data.dtoRecords||[]).filter(r=>r.recordType==='dto_application').map(r=>[Number(r.id),r]));
  records.filter(Boolean).forEach(r=>map.set(Number(r.id),r));
  return [...map.values()].filter(r=>!deleted.has(Number(r.id))).map(r=>edits[r.id]||r);
}
export async function dtoItem(request,storage,claim,users) {
  const match=new URL(request.url).pathname.match(/^\/api\/dto-applications\/(\d+)$/);
  if(!match)return null;
  const record=(await listDtos(storage)).find(r=>Number(r.id)===Number(match[1]));
  if(!record)return Response.json({error:'DTO não encontrado.'},{status:404});
  const user=users.find(u=>u.username.toLowerCase()===String(claim.username).toLowerCase());
  if(claim.role!=='admin'&&(!user||Number(user.id)!==Number(record.applicatorId||record.ownerId)))return Response.json({error:'Somente o responsável ou ADM pode alterar este DTO.'},{status:403});
  if(request.method==='DELETE'){
    const ids=await storage.get('dtoDeletedIds')||[];
    await storage.put('dtoDeletedIds',[...new Set([...ids,Number(record.id)])]);
    return Response.json({success:true});
  }
  if(request.method!=='PATCH')return Response.json({error:'Método não permitido.'},{status:405});
  const {item}=await request.json().catch(()=>({}));
  if(!item)return Response.json({error:'Dados inválidos.'},{status:400});
  const date=String(item.applicationDate||record.applicationDate),employee=String(item.employeeName??record.employeeName).trim();
  const parsed=new Date(date+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==date||!employee||employee.length>160)return Response.json({error:'Verifique data e funcionário.'},{status:400});
  const answers=item.answers??record.answers;
  if(!Array.isArray(answers)||answers.length!==record.answers.length||answers.some(a=>!['OK','NOK'].includes(a.result)))return Response.json({error:'Responda todos os itens.'},{status:400});
  const plan=String(item.actionPlan??record.actionPlan??'');
  if(plan.length>5000)return Response.json({error:'Plano limitado a 5000 caracteres.'},{status:400});
  parsed.setUTCDate(parsed.getUTCDate()+60);
  const next={...record,employeeName:employee,applicationDate:date,actionPlan:plan,answers:answers.map((a,i)=>({...record.answers[i],question:String(a.question||record.answers[i].question),result:a.result})),nextDueDate:parsed.toISOString().slice(0,10),complianceRate:Math.round(100*answers.filter(a=>a.result==='OK').length/answers.length),nokCount:answers.filter(a=>a.result==='NOK').length,updatedAt:new Date().toISOString(),updatedBy:claim.username,textCorrected:true};
  const edits=await storage.get('dtoEdits')||{};
  await storage.put('dtoEdits',{...edits,[record.id]:next});
  return Response.json({success:true,item:next});
}
