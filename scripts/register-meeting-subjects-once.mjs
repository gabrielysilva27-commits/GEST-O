import fs from"node:fs";
const additions=[{"id":4,"title":"Team Room Armazém","subjects":["5S por area","Eficiencia de carregamento","Eficiencia de montagem"]},{"id":5,"title":"Pré Team Room Armazém","subjects":["GEROT com todos os KPI's da área (Distribuição ou Armazém)"]},{"id":6,"title":"Team Room Mensal Armazém","subjects":["GEROT com todos os KPI's da área (Distribuição ou Armazém)"]},{"id":7,"title":"Troca de Turno Frota","subjects":["Disponibilidade de Frota","% de Caminhões abastecidos","Média de Consumo","% Caminhões Lavados","% Caminhões Calibrados","Estratificação do check list","Corretiva na Liberação - Impacto TML D-0","Caminhões/ Empilhadeiras em Corretiva","Caminhões/ Empilhadeiras em Preventiva","Socorro em rota"]},{"id":8,"title":"RPS Frota","subjects":["Disponibilidade de Frota","Média de Consumo e % de Caminhões Abastecidos","N° de Caminhões Lavados","Aderência ao Cronograma de Preventivas","Corretivas e Checklist","Socorro em rota","Multas","Gestão de Peças","Pneus","Calibragem e Milimetragem"]},{"id":9,"title":"MPR Distribuição","subjects":["% Atingimento de Metas Área","Pessoas Abaixo de 65%","Jornada Líquida (TML/ TR/ TI)","Aderência ao Tracking/Foxtrot","CDP/OTIF - sem falta","Devolução PDV","Devolução HL","DQI","Meu Cliente / Bees","Rating","TLP","Caixa Viagem","Utilização TT","ICV/ICE","IV Crítico"]},{"id":11,"title":"Planejamento Diário Rota","subjects":["TML (min e %) D0","TR (min e %) Previsto","Previsão de Jornada Líquida","% recargas","Disponibilidade","Jornada líquida","Disp KM","Disp Tempo","Aderência Foxtrot","Devolução PDV","IV crítico"]},{"id":12,"title":"RPS Distribuição","subjects":["TO","Absenteísmo","Rotinas OBZ Rota (Quinzenal)","TML (pareto de motivos) + TI (aberto fis e fin)","TR","4a) Dispersão de KM","4b) Dispersão de Tempo","4c) Telemetria","4d) PNP's","4e) Repasses","4f) Tempos de Entrega (Espera + Descarga)","Tracking e Foxtrot","Devolução PDV e HL + DQI","TLP e TTP + Fator Ajudante","Caixa Viagem","SAC SAVs + n° de reposições e trocas","Utilização","Rating","On Time","Prontuário do motorista","Disp. KM","Disp. Tempo","Devolução PDV (Logística)","Cx Viagem FF e Spot"]},{"id":13,"title":"Pré Team Room Distribuição","subjects":["GEROT com todos os KPI's da área (Distribuição ou Armazém)"]},{"id":14,"title":"Team Room Mensal Distribuição","subjects":["GEROT com todos os KPI's da área (Distribuição ou Armazém)"]},{"id":15,"title":"Reunião de Segurança","subjects":["SIF/LTI/TRI","Relatos de Segurança","Multas - aplicação da MDT","Telemetria","Status Frota Legal","GSD/GSA","Treinamento","GSP","Excessos de peso"]},{"id":17,"title":"Reunião DPO","subjects":["Caixa / Homem / Hora","Caixa / Viagem","% Utilização","Devolução Hl","CDP","ICV - Volume For a de Faixa","Warehouse Quality Index","WNP","WNP Empilhadeira","LTI","TRI","TO","Absenteísmo"]}];
const sharedMeetingSubjectSeed=Object.fromEntries(additions.map(x=>[x.title,x.subjects]));
function endBracket(s,o){let d=0,q=null,e=false;for(let i=o;i<s.length;i++){const c=s[i];if(q){if(e)e=false;else if(c==="\\")e=true;else if(c===q)q=null;continue}if(c==='"'||c==="'"||c==="`"){q=c;continue}if(c==="[")d++;else if(c==="]"&&!--d)return i}throw Error("Unclosed array")}
function mergeMeeting(s,x){const m=`id: ${x.id},`,catalog=s.indexOf("const MEETING_TEMPLATES = ["),i=s.indexOf(m,catalog);if(i<0)throw Error("Meeting id not found "+x.id);const n=s.indexOf("\n  {\n    id:",i+m.length),z=n>=0?n:s.indexOf("\n];",i),p=s.indexOf("subjects:",i);if(p<0||p>z)throw Error("subjects not found "+x.title);const a=s.indexOf("[",p),b=endBracket(s,a),cur=Function(`return (${s.slice(a,b+1)})`)(),all=[...new Set([...cur,...x.subjects])],rep=all.length?"[\n"+all.map(v=>"      "+JSON.stringify(v)).join(",\n")+"\n    ]":"[]";return s.slice(0,a)+rep+s.slice(b+1)}
let api=fs.readFileSync("assets/js/api.js","utf8");for(const x of additions)api=mergeMeeting(api,x);fs.writeFileSync("assets/js/api.js",api);
let build=fs.readFileSync("scripts/build-site.mjs","utf8");
if(!build.includes("const SHARED_MEETING_SUBJECT_SEED =")){const k='const projectRoot = process.cwd();',v=`const SHARED_MEETING_SUBJECT_SEED_VERSION = 1;\nconst SHARED_MEETING_SUBJECT_SEED = ${JSON.stringify(sharedMeetingSubjectSeed,null,2)};\n\n`;if(!build.includes(k))throw Error("projectRoot marker");build=build.replace(k,v+k)}
if(!build.includes("serializedMeetingSubjectSeed")){const k='  const serializedAuditActions = JSON.stringify(AUDIT_ACTIONS);';if(!build.includes(k))throw Error("audit serialize marker");build=build.replace(k,k+'\n  const serializedMeetingSubjectSeed = JSON.stringify(SHARED_MEETING_SUBJECT_SEED);')}
if(!build.includes("const meetingSubjectSeed =")){const k='const auditSeedVersion = 1;';if(!build.includes(k))throw Error("audit version marker");build=build.replace(k,k+'\nconst meetingSubjectSeed = ${serializedMeetingSubjectSeed};\nconst meetingSubjectSeedVersion = ${SHARED_MEETING_SUBJECT_SEED_VERSION};')}
const ctor='  constructor(state, env) { this.state = state; this.env = env; }';
if(build.includes(ctor))build=build.replace(ctor,`  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ready = state.blockConcurrencyWhile(() => this.ensureMeetingSubjects());
  }
  async ensureMeetingSubjects() {
    const version = Number((await this.state.storage.get("meetingSubjectSeedVersion")) || 0);
    if (version >= meetingSubjectSeedVersion) return;
    const data = (await this.state.storage.get("data")) || null;
    if (!data || !Array.isArray(data.meetings)) return;
    let changed = false;
    for (const [title, subjects] of Object.entries(meetingSubjectSeed)) {
      const meeting = data.meetings.find((item) => String(item?.title || "") === title);
      if (!meeting) continue;
      const current = Array.isArray(meeting.subjects) ? meeting.subjects : [];
      const merged = Array.from(new Set([...current, ...subjects]));
      if (merged.length !== current.length) { meeting.subjects = merged; changed = true; }
    }
    if (changed) await this.state.storage.put("data", data);
    await this.state.storage.put("meetingSubjectSeedVersion", meetingSubjectSeedVersion);
  }`);else if(!build.includes("ensureMeetingSubjects()"))throw Error("SharedStore ctor marker");
const fk='  async fetch(request) {\n    const path = new URL(request.url).pathname;';
if(build.includes(fk))build=build.replace(fk,'  async fetch(request) {\n    await this.ready;\n    const path = new URL(request.url).pathname;');else if(!build.includes('await this.ready;\n    const path = new URL(request.url).pathname;'))throw Error("SharedStore fetch marker");
fs.writeFileSync("scripts/build-site.mjs",build);
function repl(p,a,b){const s=fs.readFileSync(p,"utf8");if(!s.includes(a))throw Error("version marker "+p);fs.writeFileSync(p,s.replace(a,b))}
repl("assets/js/app.js",'./api.js?v=20260904-05','./api.js?v=20260904-06');
repl("index.html",'assets/js/app.js?v=20260904-06','assets/js/app.js?v=20260904-07');
fs.rmSync("scripts/register-meeting-subjects-once.mjs",{force:true});fs.rmSync(".github/workflows/register-meeting-subjects-once.yml",{force:true});
console.log("Registered "+additions.reduce((n,x)=>n+x.subjects.length,0)+" missing subjects across "+additions.length+" meetings.");
