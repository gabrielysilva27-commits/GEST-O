const INDICATORS = [
  'TML','TEMPO EM ROTA','TEMPO INTERNO - ENTREGA','JORNADA LÍQUIDA','JORNADA LABORAL',
  'MATRIZ DE PRIORIZAÇÃO','EFD','EFC','TMA - MACACU','TMA - NOVA RIO','TMA - PIRAÍ',
  'TMA - REVENDA','TEMPO INTERNO - ARMAZÉM'
];
const text=(value,max=5000)=>String(value??'').trim().slice(0,max);
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const currentUser=(claim,users)=>users.find(user=>String(user.username).toLocaleLowerCase('pt-BR')===String(claim.username).toLocaleLowerCase('pt-BR'));
const canManage=(record,claim,user)=>claim.role==='admin'||(user&&Number(record.reportedBy)===Number(user.id))||String(record.reportedByUsername||'').toLocaleLowerCase('pt-BR')===String(claim.username||'').toLocaleLowerCase('pt-BR');

function validate(item,previous={}) {
  const date=text(item.date??previous.date,10),occurrence=text(item.occurrence??previous.occurrence),indicator=text(item.indicator??previous.indicator,80);
  const whys=Array.from({length:5},(_,index)=>text(item.whys?.[index]??previous.whys?.[index]));
  const actionPlan=text(item.actionPlan??previous.actionPlan);
  if(!validDate(date)||!occurrence||!INDICATORS.includes(indicator)||whys.some(value=>!value)||!actionPlan)return null;
  return {date,occurrence,indicator,whys,actionPlan};
}

export async function anomalyRequest(request,storage,claim,users) {
  const path=new URL(request.url).pathname;
  if(path!=='/api/anomaly-reports'&&!/^\/api\/anomaly-reports\/\d+$/.test(path))return null;
  const data=await storage.get('data')||{};
  data.anomalyReports=Array.isArray(data.anomalyReports)?data.anomalyReports:[];
  data.sequence={...(data.sequence||{})};
  const user=currentUser(claim,users);
  if(!user)return Response.json({error:'Usuário não encontrado.'},{status:403});
  if(request.method==='GET'&&path==='/api/anomaly-reports')return Response.json({items:data.anomalyReports.map(record=>({...record,canManage:canManage(record,claim,user)}))});
  if(request.method==='POST'&&path==='/api/anomaly-reports'){
    const {item}=await request.json().catch(()=>({})),fields=validate(item||{});
    if(!fields)return Response.json({error:'Preencha data, ocorrência, indicador, os cinco porquês e o plano de ação.'},{status:400});
    const id=Math.max(Number(data.sequence.anomalyReports||0),...data.anomalyReports.map(record=>Number(record.id)||0))+1,now=new Date().toISOString();
    const record={id,...fields,reportedBy:Number(user.id),reportedByUsername:user.username,reportedByName:user.title||user.name||user.username,createdAt:now,updatedAt:now};
    data.sequence.anomalyReports=id;data.anomalyReports.push(record);await storage.put('data',data);
    return Response.json({success:true,item:record},{status:201});
  }
  const id=Number(path.split('/').pop()),index=data.anomalyReports.findIndex(record=>Number(record.id)===id),record=data.anomalyReports[index];
  if(!record)return Response.json({error:'Relato de anomalia não encontrado.'},{status:404});
  if(!canManage(record,claim,user))return Response.json({error:'Somente o responsável pelo relato ou ADM pode alterar ou excluir.'},{status:403});
  if(request.method==='DELETE'){
    data.anomalyReports.splice(index,1);await storage.put('data',data);return Response.json({success:true});
  }
  if(request.method==='PATCH'){
    const {item}=await request.json().catch(()=>({})),fields=validate(item||{},record);
    if(!fields)return Response.json({error:'Preencha data, ocorrência, indicador, os cinco porquês e o plano de ação.'},{status:400});
    const updated={...record,...fields,updatedAt:new Date().toISOString(),updatedBy:claim.username};data.anomalyReports[index]=updated;await storage.put('data',data);
    return Response.json({success:true,item:updated});
  }
  return Response.json({error:'Método não permitido.'},{status:405});
}

export {INDICATORS};
