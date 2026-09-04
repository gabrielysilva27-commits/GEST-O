import { IMPORTED_ACTION_HISTORY } from "./imported-action-history.js?v=20260828-10";
import { IMPORTED_ACTION_HISTORY_ADDITIONS } from "./imported-action-history-additions.js?v=20260904-01";
import { IMPORTED_ACTION_HISTORY_PENDING } from "./imported-action-history-pending.js?v=20260904-01";
import { IMPORTED_MEETING_SUBJECTS } from "./imported-meeting-subjects.js?v=20260904-01";
import { IMPORTED_GEROT_AREAS } from "./gerot-imports.js?v=20260902-01";

const STORAGE_KEY = "lead-gestao-db-v2";
const SESSION_DURATION_HOURS = 12;
// A versão também executa a limpeza das notificações geradas pelo arquivo legado.
const IMPORTED_ACTION_HISTORY_VERSION = 8;

const ROLE_LABELS = {
  admin: "Administrador",
  manager: "Gerente",
  supervisor: "Supervisor",
  operator: "Operador"
};

const STANDARD_PERMISSIONS = [
  "dashboard.view",
  "audit.view",
  "users.read",
  "users.manage",
  "companies.read",
  "companies.manage",
  "units.read",
  "units.manage",
  "actionPlans.read",
  "actionPlans.manage",
  "meetings.read",
  "meetings.manage",
  "gapa.read",
  "gapa.manage",
  "dto.read",
  "dto.manage",
  "anomalyReports.read",
  "anomalyReports.manage",
  "gerot.read",
  "gerot.manage",
  "notifications.view",
  "history.view"
];

const ROLE_PERMISSIONS = {
  admin: STANDARD_PERMISSIONS,
  manager: STANDARD_PERMISSIONS,
  supervisor: STANDARD_PERMISSIONS,
  operator: STANDARD_PERMISSIONS
};

const NAVIGATION = [
  { id: "dashboard", label: "Dashboard", permission: "dashboard.view" },
  { id: "audit", label: "Painel de auditoria", permission: "audit.view" },
  { id: "administration", label: "Administração", permission: "administration.view" },
  { id: "actionPlans", label: "Ações", permission: "actionPlans.read" },
  { id: "meetings", label: "Reuniões", permission: "meetings.read" },
  { id: "gapa", label: "GAPA", permission: "gapa.read" },
  { id: "dto", label: "DTO - Diagnóstico de tarefa operacional", permission: "dto.read" },
  { id: "anomalyReports", label: "Relato de anomalia", permission: "anomalyReports.read" },
  { id: "gerot", label: "GEROT", permission: "gerot.read" }
];

const PASSWORD_HASH_GABY0739 = "5fab329183a90c4fa0f3d52559f267fc8a7c152c27c8f64a1d5efc25e058ea42";
const GEROT_MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const GEROT_WAREHOUSE_METRIC_ROWS = [
  ["eficiencia-carregamento","IC","EFICIÊNCIA DE CARREGAMENTO","PRODUTIVIDADE","%",.9209,.9678488,.96,"higher",[.975422,.964615,.929775,.790393,.94721,.978689,.998387]],
  ["ressuprimento","IV","% RESSUPRIMENTO","PRODUTIVIDADE","%",.1893,.042375,.0423,"lower",[.0347,.0389,.0318,.0524,.0262,.0253,.0253]],
  ["reabastecimento","IV","% REABASTECIMENTO","PRODUTIVIDADE","",null,.1283,.1282,"lower",[.1209,.1178,.1093,.1236,.1065,.1166,.0982]],
  ["eficiencia-montagem","IV","EFICIÊNCIA DE MONTAGEM","PRODUTIVIDADE","%",.99,.856408,.85,"higher",[.89,.8949,.9,.91,.89,.9725,.9804]],
  ["aderencia-wms","IC","ADERÊNCIA AO WMS (T2P)","PRODUTIVIDADE","",null,.870798,.8709,"higher",[.913978,.9,.877809,.9517,.924586,.9,.956452]],
  ["matriz-priorizacao","IV CRÍTICO","MATRIZ DE PRIORIZAÇÃO","PRODUTIVIDADE","%",.9466,.966744,.96,"higher",[.963134,.981538,.967697,.974277,.960784,.963934,.967742]],
  ["eficiencia-descarga","IC","EFICIÊNCIA DE DESCARGA","PRODUTIVIDADE","%",.9715,.994647,.9,"higher",[1,1,1,1,.995495,.996732,.99839]],
  ["tempo-interno-fisica","IC","TEMPO INTERNO (PC FÍSICA)","PRODUTIVIDADE","%",.9793,.977006,.85,"higher",[.987673,.978618,.9889,.9885,.977778,.9871,.9943]],
  ["tempo-interno-financeira","IC","TEMPO INTERNO (PC FINANCEIRA)","PRODUTIVIDADE","%",.8445,.944635,.85,"higher",[.955316,.935855,.957,.9656,.947009,.9576,.9472]],
  ["tempo-interno-revenda","IC","TEMPO INTERNO (REVENDA)","PRODUTIVIDADE","%",.8479,.933037,.85,"higher",[.946071,.917763,.9506,.9542,.931624,.9502,.9415]],
  ["tempo-interno","IV","TEMPO INTERNO","PRODUTIVIDADE","MIN",.015255,.010333,.020833,"lower",[.006311,.006909,.009722,.009722,.010456,.006944,.007639]],
  ["stock-age","IC","STOCK AGE","QUALIDADE","%",.966,.991011,.9911,"higher",[.992008,.996536,.9969,.982047,.998168,.99573,.996258]],
  ["stock-age-curva-c","IV","STOCK AGE (CURVA C)","QUALIDADE","%",.9612,.978225,.9783,"higher",[.981085,.990904,.9919,.980672,.995592,.999917,.999963]],
  ["quebra-fefo","IV","QUEBRA DE FEFO","QUALIDADE","N°",8,5.75,6,"lower",[9,4,6,7,4,6,7]],
  ["oor","IC","OOR","QUALIDADE","%",.697,.152958,.1529,"lower",[.1539,.1106,.0841,.1325,.0956,.0851,.0973]],
  ["stock-out","IV","STOCK OUT","QUALIDADE","%",.3386,.120608,.1205,"lower",[.150678,.1051,.0794,.1252,.0936,.0825,.0963]],
  ["stock-over","IV","STOCK OVER","QUALIDADE","%",.3592,.032358,.0323,"lower",[.003261,.0055,.0047,.0074,.0021,.0026,.001]],
  ["indisponibilidade","IC","INDISPONIBILIDADE","QUALIDADE","%",null,.05675,.0567,"lower",[.0698,.0512,.0497,.0401,.0342,.0397,.0462]],
  ["inovacao","IC","INOVAÇÃO","QUALIDADE","%",null,.190917,.191,"higher",[.1746,.1495,.1608,.1387,.1572,.1754,.1772]],
  ["ocupacao-estoque","IC","OCUPAÇÃO DO ESTOQUE","QUALIDADE","%",.8085,.640517,.6,"range",[.6544,.607,.6356,.5486,.6762,.8145,.7487],.6,.9],
  ["txr-armazem","IC","TxR (ARMAZÉM)","CUSTOS","",null,.061156,null,"range",[-.020855,-.014634,-.012019,-.013845,-.015495,-.007804,-.014493],-.1,.1],
  ["wlp","IC","WLP","PRODUTIVIDADE","N°",7.24,7.311743,4.78,"higher",[7.440083,8.070028,7.363353,8.267277,6.661119,6.388623,5.184681]],
  ["pnp","IC","PNP","PRODUTIVIDADE","N°",5.11,5.150499,5.16,"higher",[5.283238,5.262943,5.318635,5.239676,4.39758,4.078599,3.876878]],
  ["fnp","IC","FNP","PRODUTIVIDADE","N°",40.92,40.472332,40.48,"higher",[39.011638,41.967381,41.10354,41.166667,29.435644,42.300203,48.208431]],
  ["tqi","IC","TQI ARMAZÉM","QUALIDADE","PPM",149.73,148.764407,148.75,"lower",[167.05376,171.659523,179.559498,186.149134,193.64759,183.418049,171.241195]],
  ["tma","IC","TMA","PRODUTIVIDADE","HORA",.047025,.032952,.109167,"lower",[.031227,.03572,.031806,.040023,.036192,.031563,.028206]],
  ["tr-nova-rio","IC","TR FABRIL NOVA RIO","PRODUTIVIDADE","HORA",.230822,.176872,.176872,"lower",[.141895,.143362,.13191,.148947,.158721,.145625,.135266]],
  ["tr-pirai","IC","TR FABRIL PIRAI","PRODUTIVIDADE","HORA",.117037,.111363,.111363,"lower",[.109896,.098729,.106551,.119444,.105488,.084745,.087616]],
  ["furo-puxada","IC","FURO DE PUXADA","PRODUTIVIDADE","%",.0143,.004992,.1,"lower",[0,0,0,0,.0051,0,.0184]],
  ["eficiencia-puxada","IC","EFICIÊNCIA DE PUXADA","PRODUTIVIDADE","%",.9857,.995008,.9,"higher",[1,1,1,1,.9949,1,.9816]],
  ["produtividade-repack","IC","PRODUTIVIDADE DO REPACK","PRODUTIVIDADE","HORA",.001319,.001221,.001204,"lower",[.001424,.001384,.001134,.0011,.001054,.001076,.001065]],
  ["produtividade-despejo","IV","PRODUTIVIDADE DO DESPEJO","PRODUTIVIDADE","HORA",.029063,.035203,.035203,"lower",[.069979,.044928,.057454,.033171,.026389,.027627,.027083]],
  ["pallets-avariados","IC","PALLETS PUXADO X AVARIADO","QUALIDADE","%",.0879,.048207,.0481,"lower",[.003668,.010913,.004736,.010913,.009467,.007805,.015654]],
  ["ronda-qualidade","IC","RONDA DE QUALIDADE","QUALIDADE","%",.9066,.928025,.9281,"higher",[.9615,.9593,.9615,.9545,.97,.9554,.9844]],
  ["falha-bloqueio","IC","FALHA NO BLOQUEIO","QUALIDADE","N°",0,0,0,"lower",[0,0,0,0,0,0,0]],
  ["cinco-s","IC","5S","QUALIDADE","%",.9214,.929064,.85,"higher",[.9369,.9375,.94,.95,.9422,.9532,.9351]]
].map(([id,type,indicator,product,unit,eoy2024,eoy2025,target,goalMode,monthly,targetMin,targetMax]) => ({ id,type,indicator,product,unit,eoy2024,eoy2025,target,goalMode,targetMin,targetMax,monthly:[...monthly,...Array(12-monthly.length).fill(null)] }));

const GEROT_WAREHOUSE_SUPPORT_ROWS = [
  ["carros-batidos","CARROS BATIDOS","N°",[635,627,662,543,628,597,619],"sum"], ["total-carros","TOTAL DE CARROS","N°",[651,650,712,687,663,610,620],"sum"],
  ["total-carros-wms","TOTAL DE CARROS","N°",[651,650,712,687,663,610,620],"sum"], ["carros-wms","CARROS WMS","N°",[595,585,625,654,613,549,593],"sum"],
  ["total-carros-priorizados","TOTAL DE CARROS","N°",[651,650,712,622,663,610,620],"sum"], ["carros-priorizados","CARROS PRIORIZADOS","N°",[627,638,689,606,637,588,600],"sum"],
  ["carros-ok","TOTAL DE CARROS OK","N°",[651,650,712,687,663,610,620],"sum"], ["carros-nok","TOTAL DE CARROS NOK","N°",[0,0,0,0,3,2,1],"sum"],
  ["hl-total","HL TOTAL","N°",[29707.87081,24480.11007,24385.73829,26748.85639,22567.07124,37406.68,39704.41],"sum"], ["hl-nok","HL NOK","N°",[237.42655,84.80865,73.59604,480.22,41.35195,159.72,148.56],"sum"],
  ["hl-total-curva-c","HL TOTAL (CURVA C)","N°",[12315.03949,9239.31442,9239.31,9077.30939,8715.80611,7269.88,8049.63],"sum"], ["hl-nok-curva-c","HL NOK (CURVA C)","N°",[237.42655,84.80865,9154.51,178.9,38.59195,.6,.3],"sum"],
  ["txr-tendencia","TENDÊNCIA","N°",[9.79,8.32,8.42,9.52,8.52,9.04,9.1],"average"], ["txr-real","REAL","N°",[9.59,8.2,8.32,9.39,8.39,8.97,8.97],"average"],
  ["wlp-ajudantes","AJUDANTES","N°",[24,24,24,24,24,27,30],"sum"], ["wlp-operadores","OPERADORES","N°",[9,9,9,8,10,10,10],"sum"], ["wlp-volume","VOLUME (HL)","N°",[46931,45031,46447,46683,41622,41708,41170],"sum"], ["wlp-dias","DIAS ÚTEIS","N°",[26,23,26,24,25,24,27],"average"],
  ["pnp-volume","VOLUME (HL)","N°",[46931,45031,46447,46683,41622,41708,41170],"sum"], ["pnp-dias","DIAS ÚTEIS","N°",[25,24,24,24,25,26,27],"average"], ["pnp-ajudantes","AJUDANTES","N°",[28,25,26,27,28,30,30],"sum"], ["pnp-operadores","OPERADORES","N°",[8,10,10,10,10,10,10],"sum"], ["pnp-conferentes","CONFERENTES","N°",[8,9,9,9,9,9,9],"sum"], ["pnp-adm","ADM","N°",[3,3,3,3,3,3,3],"sum"],
  ["fnp-horas","HORAS TRABALHADAS","N°",[1203,1073,1130,1134,1414,986,854],"sum"], ["fnp-volume","VOLUME (HL)","N°",[46931,45031,46447,46683,41622,41708,41170],"sum"],
  ["tqi-hl-baixado","HL BAIXADO","N°",[7.84,7.73,8.34,8.69,8.06,7.65,7.05],"sum"], ["tqi-volume","VOLUME","N°",[46931,45031,46447,46683,41622,41708,41170],"sum"],
  ["pallets-avariados-base","AVARIADO","N°",[20,44,19,44,32,33,68],"average"], ["pallets-puxados","PUXADO","N°",[5452,4032,4012,4032,3380,4228,4344],"average"]
].map(([id,indicator,unit,monthly,aggregation]) => ({ id,type:"",indicator,product:"Memória de cálculo",unit:"",eoy2024:null,eoy2025:null,target:null,goalMode:"none",aggregation,calculationInput:true,monthly:[...monthly,...Array(12-monthly.length).fill(null)] }));

const GEROT_FORMULAS = {
  "eficiencia-carregamento": ["carros-batidos", "total-carros"], "aderencia-wms": ["carros-wms", "total-carros-wms"], "matriz-priorizacao": ["carros-priorizados", "total-carros-priorizados"], "eficiencia-descarga": ["carros-ok", "carros-nok"],
  "stock-age": ["hl-total", "hl-nok"], "stock-age-curva-c": ["hl-total-curva-c", "hl-nok-curva-c"], "txr-armazem": ["txr-tendencia", "txr-real"], "wlp": ["wlp-ajudantes", "wlp-operadores", "wlp-volume", "wlp-dias"],
  "pnp": ["pnp-volume", "pnp-dias", "pnp-ajudantes", "pnp-operadores", "pnp-conferentes", "pnp-adm"], "fnp": ["fnp-volume", "fnp-horas"], "tqi": ["tqi-hl-baixado", "tqi-volume"], "pallets-avariados": ["pallets-avariados-base", "pallets-puxados"]
};
const GEROT_YTD_CALCULATIONS = {
  "stock-age": "average-monthly-result",
  "stock-age-curva-c": "source-value",
  "txr-armazem": "source-value"
};
const GEROT_MONTHLY_SOURCE_OVERRIDES = {
  "aderencia-wms": [3],
  "eficiencia-descarga": [3],
  "stock-age": [2],
  "stock-age-curva-c": [2]
};
const GEROT_YTD_REFERENCE = {
  "eficiencia-carregamento": .9386022207707381, ressuprimento: .03351428571428571, reabastecimento: .11327142857142856, "eficiencia-montagem": .9196857142857143,
  "aderencia-wms": .917483126496843, "matriz-priorizacao": .9684187279151943, "eficiencia-descarga": .9986953685583823, "tempo-interno-fisica": .9861242203479937,
  "tempo-interno-financeira": .9522256686766498, "tempo-interno-revenda": .9417082811132766, "tempo-interno": .008243378059634475, "stock-age": .9939495390447491,
  "stock-age-curva-c": .988, "quebra-fefo": 6.142857142857143, oor: .10844285714285713, "stock-out": .10468255411998333, "stock-over": .003794383289612396,
  indisponibilidade: .047271428571428575, inovacao: .1619142857142857, "ocupacao-estoque": .6692857142857144, "txr-armazem": null, wlp: 6.9603691609008695,
  pnp: 4.740309751111996, fnp: 39.72183731075186, tqi: 178.815990077263, tma: .033533812830687826, "tr-nova-rio": .14367503895680653,
  "tr-pirai": .10178128115175215, "furo-puxada": .003357142857142857, "eficiencia-puxada": .9966428571428573, "produtividade-repack": .0011767325560908888,
  "produtividade-despejo": .04094724367822193, "pallets-avariados": .008819538670284939, "ronda-qualidade": .9638, "falha-bloqueio": 0, "cinco-s": .9421285714285714
};
const GEROT_NUMERIC_FORMATS = { reabastecimento: "%", "aderencia-wms": "%", "txr-armazem": "%" };
const GEROT_WAREHOUSE_ROWS = [...GEROT_WAREHOUSE_METRIC_ROWS, ...GEROT_WAREHOUSE_SUPPORT_ROWS].map((row) => ({ ...row, sourceMonthly: [...row.monthly], monthlySourceOverrides: GEROT_MONTHLY_SOURCE_OVERRIDES[row.id] || [], referenceYtd: GEROT_YTD_REFERENCE[row.id], ytdCalculation: GEROT_YTD_CALCULATIONS[row.id] || "formula", displayFormat: GEROT_NUMERIC_FORMATS[row.id] || row.unit, formulaInputs: GEROT_FORMULAS[row.id] || [] }));
const GEROT_IMPORTED_AREA_TEMPLATES = Object.fromEntries(IMPORTED_GEROT_AREAS.map((area) => {
  const rows = area.rows.map((row) => ({ ...row, sourceMonthly: [...row.monthly], displayFormat: row.unit, goalMode: row.targetMode === "MA" ? "higher" : row.targetMode === "ME" ? "lower" : row.targetMode === "ABS" ? "absolute" : "none" }));
  const idBySheetRow = new Map(rows.map((row) => [row.sheetRow, row.id]));
  return [area.area, {
    ...area,
    rows: rows.map((row) => ({
      ...row,
      formulaInputs: [...new Set((row.formulas || []).join(" ").match(/[A-Z]+(\d+)/g)?.map((reference) => idBySheetRow.get(Number(reference.match(/\d+/)[0]))) || [])]
        .filter((id) => rows.find((item) => item.id === id)?.calculationInput)
    }))
  }];
}));
const ADDITIONAL_SEEDED_USERS = [
  ["CHRISTOFEE DOS SANTOS SILVA ARAUJO", "Christofee", "b489d3cb0b5b0397f6672b9a85090f733140922d3493d637fdf77308edf97161", "CA", "Christofee Araujo", "FROTA"],
  ["DIEGO DA SILVA TEIXEIRA", "Diego", "f4014a4bb63d77adceb23aa3f7dfa7944fb3c31f7e521a51cee71b8b3451227d", "DT", "Diego Teixeira", "CONTROLE"],
  ["GUILHERME OLIVEIRA DE SOUZA", "Guilherme", "8b4dba09e6408be9f3a4d636453964b1777bd29091029b7fc21789435d70d520", "GS", "Guilherme Souza", "TST"],
  ["JOSEPH MARCOS SALES LACERDA", "Joseph", "5efa7f9b686b58f4754b94df0c02cdf6327a4303157aaab7e4b04499b9b1c05a", "JL", "Joseph Lacerda", "CONTROLE"],
  ["LEANDRO DA SILVA", "Leandro", "1d88b9cc30ce83730a7ffdfe0f929a07679749c0052c39cef4c81725b030f77d", "LS", "Leandro Silva", "ARMAZÉM"],
  ["LUCIANO GOMES SARDINHA", "Luciano", "c16c79644323b58acf459c2d8d97c0f2c02c2fc07106e35b81270dbe64df775d", "LS", "Luciano Sardinha", "ENTREGA"],
  ["MAURICIO DO NASCIMENTO FILHO", "Mauricio", "9e95dff76afe977e4075c83d893d0cc2ced1581be9ff33bce77ccdfe32f71417", "MF", "Mauricio Filho", "FROTA"],
  ["MICHAEL FERNANDES AZEVEDO", "Michael", "a6dfd5104fc9f3554871aad3c6b72e9d59dcff3c47cfb5468daf473ea950d8b5", "MA", "Michael Azevedo", "PUXADA"],
  ["NATHAN MARTINS CAPITAO", "Nathan", "d58d5749ddb5c635cb9cf9b227a7d6bdd7ef0a0158f63169da2a8d05cc1115e7", "NC", "Nathan Capitao", "ARMAZÉM"],
  ["GABRIELLE DE MACEDO PONTES DA ROSA", "Gabrielle", "40dde169402e52a306657e56da40de0595d25d0cc9ecaba8a003109bd876a6b9", "GR", "Gabrielle Rosa", "TST"],
  ["ISABELLY DA SILVA COSTA DIAS", "Isabelly", "31a06a8934c52b3ac49641da68c0f8a8b23ba15332612fd8237405a2dcadc91a", "ID", "Isabelly Dias", "TST"],
  ["MANUELLE DE LIMA SERGIO CORREA", "Manuelle", "dcd6e494a82d2b894a303f97c8ff70ba2eed38bdd7ba9abf7e22a59a20c565ad", "MC", "Manuelle Correa", "ENTREGA"],
  ["MATHEUS DE AMORIM VIANNA", "Matheus", "05eaa5156d19a7431bb5bc9a58ebfc28587f153f559b40f6ad1ac243be075db7", "MV", "Matheus Vianna", "ENTREGA"],
  ["RODRIGO CAVALCANTE DOS SANTOS", "Rodrigo", "6eaa010b43abc1da0560917668208487d1ee274549fb856ff2e64348625733fb", "RS", "Rodrigo Santos", "FROTA"],
  ["YURI GUILHERME SOUSA GUSMAO", "Yuri", "86ef22d8e7846102bc7a9fef9cfb4be8657291768a33afe55f5bda1f14971e96", "YG", "Yuri Gusmao", "FROTA"],
  ["ALEX FREIRE DE OLIVEIRA", "Alex", "163b7e7ebddf321750dca1119ff5962503284432fa02f532cb31330d2532afbf", "AO", "Alex Oliveira", "ARMAZÉM"],
  ["CÍNTIA DE MENEZES FELIX", "Cíntia", "e734d73063a7a06497b9031ce248a1df3d6f1ac09d5cc3de644677f5bf67a776", "CF", "Cíntia Felix", "ARMAZÉM"],
  ["LUIS CARLOS MARQUES DA SILVA", "Luis", "2962c9d29be8c1a75e5ce4900698762511c975fa16d224d152f5b08912e0505f", "LS", "Luis Silva", "ARMAZÉM"],
  ["RAISSA CUNHA MARTINS", "Raissa", "4277c636fd05ac44b33c369fc6eab8d82b9495ca642477b35cda30bd036a5f88", "RM", "Raissa Martins", "ARMAZÉM"],
  ["RICARDO GOMES LICURGO", "Ricardo", "44daa0861864693fd0bd8246d3c7cbe873636addc6a49c7a54dc163611dd0177", "RL", "Ricardo Licurgo", "ARMAZÉM"],
  ["RUAN DA SILVA PEREIRA", "Ruan", "d01e801ab7f09d7182b5d54d78116bee556e9c696948089a7db0e99a133f334c", "RP", "Ruan Pereira", "ARMAZÉM"],
  ["TIAGO COSTA RAMOS DA SILVA", "Tiago", "5bb16d924ee6a3136a08e4d99fdb65e96b2c8bf0bb351af0d3a96ca505de5311", "TS", "Tiago Silva", "ARMAZÉM"],
  ["VANDERSON MARQUES", "Vanderson", "535f6010f6b534c7efe99c4b9fa132d306accedf6fb85145d8c4a2ecf8acf941", "VM", "Vanderson Marques", "ARMAZÉM"],
  ["GRACIELLE SILVA DE FARIAS", "Gracielle", "5e0cbd46cf4c3e3d89cb62c8ebfacb76c6ff2ebc257be252d5c66428f990b034", "GF", "Gracielle Farias", "ARMAZÉM"]
].map(([name, username, passwordHash, avatar, title, department], index) => ({
  id: index + 5, name, username, passwordHash, avatar, title, department,
  role: "operator", companyId: 0, unitIds: [], status: "active", createdAt: "2026-09-01T00:00:00.000Z"
}));
const SEEDED_USERS = [
  {
    id: 2,
    name: "IAGO DE OLIVEIRA RODRIGUES",
    username: "Iago",
    role: "operator",
    companyId: 0,
    unitIds: [],
    status: "active",
    passwordHash: "41ba8b3cc4ec12b94cf489c54fd3370d5f88465d9a02876e1d2556445637e6aa",
    avatar: "IO",
    title: "Usuário da plataforma",
    department: "ENTREGA",
    createdAt: "2026-08-31T00:00:00.000Z"
  },
  {
    id: 3,
    name: "MARCOS ANTONIO BARBOSA FERREIRA JUNIOR",
    username: "Marcos",
    role: "operator",
    companyId: 0,
    unitIds: [],
    status: "active",
    passwordHash: "37031ece6c39fb93a4af9dfc153daef36e5f4da7b34949d0cfbb1fcb623fa5ef",
    avatar: "MA",
    title: "Usuário da plataforma",
    department: "ENTREGA",
    createdAt: "2026-08-31T00:00:00.000Z"
  },
  {
    id: 4,
    name: "JOSÉ ALVES TEIXEIRA FILHO",
    username: "José",
    role: "operator",
    companyId: 0,
    unitIds: [],
    status: "active",
    passwordHash: "f10c90456d3c3a91a43197c74f6ca48c28ffc7a707a5d7f84437176757b48e79",
    avatar: "JA",
    title: "Usuário da plataforma",
    department: "",
    createdAt: "2026-08-31T00:00:00.000Z"
  },
  ...ADDITIONAL_SEEDED_USERS
];

const MEETING_TEMPLATES = [
  {
    id: 1,
    title: "Agenda Gerentes CDD",
    subjects: []
  },
  {
    id: 2,
    title: "MPR Armaz\u00e9m_Controle",
    subjects: [
      "TO",
      "Absente\u00edsmo",
      "Banco de Horas >= 40 hrs (Pr\u00f3prio)",
      "RV Equipe de Armaz\u00e9m",
      "% Atingimento de Metas \u00c1rea",
      "Ader\u00eancia ao GSDP",
      "CDP Falta de Produto",
      "OTIF",
      "TMA e EFA",
      "WLP e FLP",
      "OBZ - \u00c1rvores de Efeitos",
      "% Efici\u00eancia de Carregamento",
      "Ader\u00eancia ao WMS - Todos os M\u00f3dulos",
      "IV Cr\u00edtico",
      "Trocas e Reposi\u00e7\u00e3o",
      "Toolkit",
      "Dif. Estoque PA e AG",
      "HL Perdido / HL Vendido",
      "Quebras",
      "Refugo",
      "FEFO + Erro Programa\u00e7\u00e3o + FGLI",
      "WMS - M\u00f3dulo Contagem/erro/360",
      "OBZ Preju\u00edzo + Impairment",
      "GOPs"
    ]
  },
  {
    id: 3,
    title: "RPS Armaz\u00e9m_Controle",
    subjects: [
      "TO",
      "Absenteismo",
      "CDP Falta de Produto",
      "OTIF",
      "Reposi\u00e7\u00e3o e Erros de Montagem",
      "Refugo",
      "Efici\u00eancia de Carregamento",
      "Pallet / Ajudante e Pontua\u00e7\u00e3o WMS - Tratar RV",
      "Efici\u00eancia e Produtividade de Descarga",
      "TMA e EFA",
      "KPI Local"
    ]
  },
  {
    id: 4,
    title: "Team Room Armaz\u00e9m",
    subjects: [
      "TRI",
      "Relato Incidente",
      "Absente\u00edsmo",
      "TMA",
      "Tempo m\u00e9dio de descarga de carreta",
      "Ader\u00eancia ao ressuprimento",
      "Caixas reembaladas",
      "5S por área",
      "Tempo interno",
      "Pallets descarregados",
      "Caixas inspecionadas no refugo",
      "Recomposi\u00e7\u00e3o de garrafeiras at\u00e9 a 22hs",
      "Eficiência de carregamento",
      "Turno C: Carregar Certo*",
      "Eficiência de montagem",
      "Pallets carregados"
    ]
  },
  {
    id: 5,
    title: "Pr\u00e9 Team Room Armaz\u00e9m",
    subjects: []
  },
  {
    id: 6,
    title: "Team Room Mensal Armaz\u00e9m",
    subjects: []
  },
  {
    id: 7,
    title: "Troca de Turno Frota",
    subjects: []
  },
  {
    id: 8,
    title: "RPS Frota",
    subjects: []
  },
  {
    id: 9,
    title: "MPR Distribui\u00e7\u00e3o",
    subjects: []
  },
  {
    id: 10,
    title: "Team Room Distribui\u00e7\u00e3o",
    subjects: [
      "Relatos e Excessos",
      "Jornada L\u00edquida (TML/ TR/ TI)",
      "Tracking / Apontamentos Zerados",
      "Devolu\u00e7\u00e3o PDV",
      "Rating",
      "IV Cr\u00edtico"
    ]
  },
  {
    id: 11,
    title: "Planejamento Di\u00e1rio Rota",
    subjects: []
  },
  {
    id: 12,
    title: "RPS Distribui\u00e7\u00e3o",
    subjects: []
  },
  {
    id: 13,
    title: "Pr\u00e9 Team Room Distribui\u00e7\u00e3o",
    subjects: []
  },
  {
    id: 14,
    title: "Team Room Mensal Distribui\u00e7\u00e3o",
    subjects: []
  },
  {
    id: 15,
    title: "Reuni\u00e3o de Seguran\u00e7a",
    subjects: []
  },
  {
    id: 16,
    title: "Matinal DPO",
    subjects: [
      "TRI",
      "Relatos",
      "Priorizado 1",
      "Volume Vendas",
      "Priorizado 2",
      "Priorizado 3",
      "Disponibilidade"
    ]
  },
  {
    id: 17,
    title: "Reuni\u00e3o DPO",
    subjects: []
  },
  {
    id: 18,
    title: "Pr\u00e9 e P\u00f3s Invent\u00e1rio_SPO + DPO",
    subjects: []
  },
  {
    id: 19,
    title: "RLP_SPO + DPO",
    subjects: []
  },
  {
    id: 20,
    title: "RNS",
    subjects: ["GC", "GAF, GNS/SNS", "GV", "GOD"]
  },
  {
    id: 21,
    title: "KICK OFF_SPO + DPO",
    subjects: ["GC", "GOD", "GG", "GAF", "GNS/SNS", "GG + GVs"]
  },
  {
    id: 22,
    title: "SUPER & PEX DAY_SPO + DPO",
    subjects: ["GC"]
  },
  {
    id: 23,
    title: "RPP_SPO + DPO",
    subjects: ["GC", "GOD", "GG/TST", "GG", "GAF", "GNS/SNS", "GVs"]
  },
  {
    id: 24,
    title: "Team Room God",
    subjects: [
      "TRI", "RELATOS", "TELEMETRIA (FROTA)", "VOLUME DE VENDAS", "OTIF", "CDP",
      "IV CRÍTICO ERRO PÓS CARREGAMENTO (EXTERNO)", "IV CRÍTICO ERRO PÓS CARREGAMENTO (INTERNO - BLITZ)",
      "QUEBRAS", "DIF. DE ESTOQUE PA/AG", "EFC", "OCUPAÇÃO DE ESTOQUE",
      "IV CRÍTICO - ADERÊNCIA A MATRIZ DE PRIORIZAÇÃO", "RONDA DE QUALIDADE", "TML", "JORNADA LÍQUIDA", "DQI",
      "IV CRÍTICO - ATRASOS", "DEVOLUÇÃO PDV", "DEVOLUÇÃO HL", "CHAMADOS", "DISPONIBILIDADE DA FROTA",
      "SOCORRO EM ROTA", "AVARIAS", "IV CRÍTICO - ADERÊNCIA AOS CHECKLISTS", "Aderência ao BEES",
      "BLITZ DE SEGURANÇA DOS CAMINHÕES", "GSA", "CHECKLIST PALETEIRA", "ESCOLINHA DE TELEMETRIA",
      "PRESTAÇÃO DE CONTA", "RETORNO DE ROTA", "LIBERAÇÃO DOS MAPAS (20:40)", "ADIANTAMENTO DA ESCALA (12:00)",
      "DISPONIBILIZAR 5 EMPILHADEIRAS", "LAVAGEM DE EMPILHADEIRAS", "MANUTENÇÃO DE PALETEIRAS", "RETRABALHO DE PALLETS",
      "ILUMINAÇÃO NO ARMAZÉM", "CONTAGEM PA (07:00)", "CONTAGEM AG (07:00)", "RECONTAGEM PA (ATÉ 2X)",
      "RECONTAGEM AG (ATÉ 2X)", "FECHAMENTO DA GRADE (10:00)", "ENTRADA DE NOTAS (07:30)", "ERRO DE CARREGAMENTO",
      "CARROS NÃO RETORNANDO DA PORTARIA", "ENVIO RECLAMAÇÕES NO PRAZO", "CAMINHÃO SIMULADO", "FIDELIZAÇÃO FROTA - ENTREGA",
      "FIDELIZAÇÃO - PUXADA", "BLITZ DE CARREGAMENTO", "ATRASOS", "MANUTENÇÃO DE CARRETAS"
    ]
  }
];

function buildMeetingTemplateRecord(template, id = template.id) {
  return {
    id,
    templateId: template.id,
    title: template.title,
    objective: "Modelo importado de TOR DPO Revendas_2023.xlsx.",
    status: "scheduled",
    companyId: 0,
    unitId: 0,
    ownerId: 1,
    scheduledAt: "",
    lastExecutionDate: "",
    subjects: [...template.subjects],
    importedFrom: "TOR DPO Revendas_2023.xlsx",
    createdBy: 1,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z"
  };
}

const INITIAL_DATABASE = {
  meta: {
    appName: "LEAD Gestao",
    seededAt: "2026-08-26T00:00:00.000Z",
    lastExport: null,
    deletedMeetingTemplateIds: [],
    importedActionHistoryVersion: 0,
    storageVersion: 2
  },
  sequence: {
    users: 28,
    companies: 0,
    units: 0,
    actionPlans: 0,
    meetings: MEETING_TEMPLATES.length,
    gapaRecords: 0,
    dtoRecords: 0,
    anomalyReports: 0,
    gerotRecords: 0,
    notifications: 0,
    history: 0,
    sessions: 0
  },
  users: [
    {
      id: 1,
      name: "Gabriely",
      username: "Gabriely",
      role: "admin",
      companyId: 0,
      unitIds: [],
      status: "active",
      passwordHash: PASSWORD_HASH_GABY0739,
      avatar: "GA",
      title: "Administradora da plataforma",
      department: "ADMINISTRADOR",
      createdAt: "2026-08-01T09:00:00.000Z"
    },
    ...SEEDED_USERS
  ],
  companies: [],
  units: [],
  actionPlans: [],
  meetings: MEETING_TEMPLATES.map((template) => buildMeetingTemplateRecord(template)),
  gapaRecords: [],
  dtoRecords: [],
  anomalyReports: [],
  gerotRecords: [],
  gerotWarehouse: {
    area: "ARMAZÉM",
    year: 2026,
    rows: GEROT_WAREHOUSE_ROWS,
    calculatedYtd: false,
    updatedAt: "2026-09-01T00:00:00.000Z",
    updatedBy: null
  },
  gerotAdditionalAreas: Object.fromEntries(Object.entries(GEROT_IMPORTED_AREA_TEMPLATES).map(([area, template]) => [area, {
    area,
    year: 2026,
    rows: clone(template.rows),
    calculatedYtd: false,
    updatedAt: "2026-09-01T00:00:00.000Z",
    updatedBy: null
  }])),
  notifications: [],
  history: [],
    sessions: [],
    passwordResetRequests: []
};

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function getRolePermissions(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

function isGabrielyAdministrator(userRecord) {
  return String(userRecord?.username || "").trim().toLocaleLowerCase("pt-BR") === "gabriely";
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function nowIso() {
  return new Date().toISOString();
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function todaysDateKey() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function ensureMeetingTemplates(database) {
  database.meetings = arrayValue(database.meetings);
  const deletedTemplateIds = arrayValue(database.meta?.deletedMeetingTemplateIds).map((item) => toInt(item));
  database.sequence.meetings = Math.max(
    toInt(database.sequence?.meetings, 0),
    ...database.meetings.map((item) => toInt(item.id))
  );

  MEETING_TEMPLATES.forEach((template) => {
    const importedSubjects = arrayValue(IMPORTED_MEETING_SUBJECTS[template.title]);
    if (deletedTemplateIds.includes(template.id)) {
      return;
    }

    const existing = database.meetings.find(
      (item) => toInt(item.templateId) === template.id || item.title === template.title
    );

    if (existing) {
      existing.templateId = existing.templateId || template.id;
      existing.subjects = Array.from(new Set([...arrayValue(existing.subjects), ...template.subjects, ...importedSubjects]));
      existing.importedFrom = existing.importedFrom || "TOR DPO Revendas_2023.xlsx";
      existing.updatedAt = existing.updatedAt || "2026-08-28T00:00:00.000Z";
      return;
    }

    database.sequence.meetings += 1;
    database.meetings.push(buildMeetingTemplateRecord({ ...template, subjects: [...template.subjects, ...importedSubjects] }, database.sequence.meetings));
  });
}

function ensureImportedActionHistory(database) {
  const importedVersion = toInt(database.meta?.importedActionHistoryVersion, 0);
  if (importedVersion >= IMPORTED_ACTION_HISTORY_VERSION) {
    return;
  }

  database.actionPlans = arrayValue(database.actionPlans);
  const previousLegacyActionIds = new Set(
    database.actionPlans.filter((item) => item.source === "legacy_excel").map((item) => toInt(item.id))
  );
  // Versões anteriores criaram uma notificação por linha do arquivo. Elas não
  // representam ações novas da plataforma e precisam ser descartadas.
  database.notifications = arrayValue(database.notifications).filter((item) => {
    const isPreviousLegacyAction = previousLegacyActionIds.has(toInt(item.actionPlanId));
    const isLegacyAssignmentAlert = item.link === "actionPlans" && item.title === "Ação sob sua responsabilidade";
    return !isPreviousLegacyAction && !isLegacyAssignmentAlert;
  });
  // Replace only spreadsheet history; manually created actions remain intact.
  database.actionPlans = database.actionPlans.filter((item) => item.source !== "legacy_excel");
  database.sequence.actionPlans = Math.max(
    toInt(database.sequence?.actionPlans, 0),
    ...database.actionPlans.map((item) => toInt(item.id))
  );

  [...IMPORTED_ACTION_HISTORY, ...IMPORTED_ACTION_HISTORY_ADDITIONS, ...IMPORTED_ACTION_HISTORY_PENDING].forEach((item) => {
    const meeting = database.meetings.find((record) => toInt(record.templateId) === toInt(item.meetingTemplateId));
    if (!meeting || !arrayValue(meeting.subjects).includes(item.meetingSubject)) {
      return;
    }

    database.sequence.actionPlans += 1;
    database.actionPlans.push({
      id: database.sequence.actionPlans,
      title: item.meetingSubject,
      objective: item.objective,
      // A planilha é histórico: nenhuma de suas ações fica pendente no sistema.
      status: "done",
      priority: item.priority,
      companyId: 0,
      unitId: 0,
      ownerId: findUserIdByLegacyName(database, item.ownerName),
      requesterId: 0,
      requesterName: item.requesterName,
      legacyOwnerName: item.ownerName,
      createdBy: 1,
      dueDate: item.dueDate || item.openedAt,
      meetingId: toInt(meeting.id),
      meetingTitle: meeting.title,
      meetingSubject: item.meetingSubject,
      meetingExecutionDate: item.executionDate || item.openedAt,
      source: "legacy_excel",
      sourceLabel: "AÇÕES.xlsx",
      legacySourceRow: toInt(item.sourceRow),
      legacyStatus: item.sourceStatus,
      createdAt: `${item.openedAt || "2026-01-01"}T12:00:00.000Z`,
      updatedAt: `${item.openedAt || "2026-01-01"}T12:00:00.000Z`,
      completedAt: `${item.executionDate || item.openedAt || "2026-01-01"}T12:00:00.000Z`
    });
  });

  // Notificações pertencem somente às ações abertas dentro da plataforma.
  const currentLegacyActionIds = new Set(
    database.actionPlans.filter((item) => item.source === "legacy_excel").map((item) => toInt(item.id))
  );
  database.notifications = arrayValue(database.notifications).filter(
    (item) => !currentLegacyActionIds.has(toInt(item.actionPlanId))
  );
  database.meta.importedActionHistoryVersion = IMPORTED_ACTION_HISTORY_VERSION;
}

function normalizePersonName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findUserIdByLegacyName(database, ownerName) {
  const normalizedOwner = normalizePersonName(ownerName);
  if (!normalizedOwner) {
    return 0;
  }

  const ownerTokens = normalizedOwner.split(" ");
  const matches = arrayValue(database.users).filter((user) => {
    const identities = [user.name, user.username, user.title].map(normalizePersonName).filter(Boolean);
    return identities.some((identity) =>
      identity === normalizedOwner || ownerTokens.every((token) => identity.split(" ").includes(token))
    );
  });

  return matches.length === 1 ? toInt(matches[0].id) : 0;
}

function matchesLegacyOwner(user, ownerName) {
  const normalizedOwner = normalizePersonName(ownerName);
  if (!normalizedOwner) {
    return false;
  }

  const ownerTokens = normalizedOwner.split(" ");
  return [user.name, user.username, user.title]
    .map(normalizePersonName)
    .filter(Boolean)
    .some((identity) => identity === normalizedOwner || ownerTokens.every((token) => identity.split(" ").includes(token)));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeDatabase(database) {
  if (!database || database.meta?.storageVersion !== INITIAL_DATABASE.meta.storageVersion) {
    return clone(INITIAL_DATABASE);
  }

  const sanitized = {
    meta: {
      appName: database.meta.appName || INITIAL_DATABASE.meta.appName,
      seededAt: database.meta.seededAt || INITIAL_DATABASE.meta.seededAt,
      lastExport: database.meta.lastExport || null,
      deletedMeetingTemplateIds: arrayValue(database.meta.deletedMeetingTemplateIds),
      importedActionHistoryVersion: toInt(database.meta.importedActionHistoryVersion, 0),
      storageVersion: INITIAL_DATABASE.meta.storageVersion
    },
    sequence: {
      users: toInt(database.sequence?.users, INITIAL_DATABASE.sequence.users),
      companies: toInt(database.sequence?.companies, INITIAL_DATABASE.sequence.companies),
      units: toInt(database.sequence?.units, INITIAL_DATABASE.sequence.units),
      actionPlans: toInt(database.sequence?.actionPlans, INITIAL_DATABASE.sequence.actionPlans),
      meetings: toInt(database.sequence?.meetings, INITIAL_DATABASE.sequence.meetings),
      gapaRecords: toInt(database.sequence?.gapaRecords, INITIAL_DATABASE.sequence.gapaRecords),
      dtoRecords: toInt(database.sequence?.dtoRecords, INITIAL_DATABASE.sequence.dtoRecords),
      anomalyReports: toInt(database.sequence?.anomalyReports, INITIAL_DATABASE.sequence.anomalyReports),
      gerotRecords: toInt(database.sequence?.gerotRecords, INITIAL_DATABASE.sequence.gerotRecords),
      notifications: toInt(database.sequence?.notifications, INITIAL_DATABASE.sequence.notifications),
      history: toInt(database.sequence?.history, INITIAL_DATABASE.sequence.history),
      sessions: toInt(database.sequence?.sessions, 0)
    },
    users: arrayValue(database.users),
    companies: arrayValue(database.companies),
    units: arrayValue(database.units),
    actionPlans: arrayValue(database.actionPlans),
    meetings: arrayValue(database.meetings),
    gapaRecords: arrayValue(database.gapaRecords),
    dtoRecords: arrayValue(database.dtoRecords),
    anomalyReports: arrayValue(database.anomalyReports),
    gerotRecords: arrayValue(database.gerotRecords),
    gerotAdditionalAreas: database.gerotAdditionalAreas || {},
    gerotWarehouse: database.gerotWarehouse?.area === "ARMAZÉM"
      ? database.gerotWarehouse
      : { area: "ARMAZÉM", year: 2026, rows: clone(GEROT_WAREHOUSE_ROWS), updatedAt: null, updatedBy: null },
    notifications: arrayValue(database.notifications),
    history: arrayValue(database.history),
      sessions: arrayValue(database.sessions),
      passwordResetRequests: arrayValue(database.passwordResetRequests)
  };

  SEEDED_USERS.forEach((seededUser) => {
    const existingUser = sanitized.users.find((item) =>
      toInt(item.id) === toInt(seededUser.id)
      || String(item.name || "").trim().toLowerCase() === seededUser.name.toLowerCase()
    );
    if (existingUser) {
      existingUser.name = seededUser.name;
      existingUser.username = seededUser.username;
      existingUser.passwordHash = seededUser.passwordHash;
      existingUser.role = seededUser.role;
      existingUser.status = seededUser.status;
      existingUser.title = seededUser.title;
      existingUser.department = seededUser.department || "";
    } else {
      sanitized.users.push(clone(seededUser));
    }
  });
  sanitized.users.forEach((userRecord) => {
    if (!isGabrielyAdministrator(userRecord) && userRecord.role === "admin") {
      userRecord.role = "operator";
    }
    if (isGabrielyAdministrator(userRecord)) {
      userRecord.department = "ADMINISTRADOR";
    }
  });
  const persistedGerotRows = arrayValue(sanitized.gerotWarehouse?.rows);
  sanitized.gerotWarehouse = {
    area: "ARMAZÉM",
    year: 2026,
    updatedAt: sanitized.gerotWarehouse?.updatedAt || null,
    updatedBy: sanitized.gerotWarehouse?.updatedBy || null,
    calculatedYtd: Boolean(sanitized.gerotWarehouse?.calculatedYtd),
    rows: GEROT_WAREHOUSE_ROWS.map((template) => {
      const persisted = persistedGerotRows.find((item) => item.id === template.id);
      return { ...clone(template), monthly: arrayValue(persisted?.monthly).length ? arrayValue(persisted.monthly) : [...template.monthly] };
    })
  };
  const persistedAdditionalAreas = sanitized.gerotAdditionalAreas || {};
  sanitized.gerotAdditionalAreas = Object.fromEntries(Object.entries(GEROT_IMPORTED_AREA_TEMPLATES).map(([area, template]) => {
    const persistedArea = persistedAdditionalAreas[area] || {};
    const persistedRows = arrayValue(persistedArea.rows);
    return [area, {
      area,
      year: 2026,
      updatedAt: persistedArea.updatedAt || null,
      updatedBy: persistedArea.updatedBy || null,
      calculatedYtd: Boolean(persistedArea.calculatedYtd),
      rows: template.rows.map((row) => {
        const persisted = persistedRows.find((item) => item.id === row.id);
        return { ...clone(row), monthly: arrayValue(persisted?.monthly).length ? arrayValue(persisted.monthly) : [...row.monthly] };
      })
    }];
  }));
  sanitized.sequence.users = Math.max(
    toInt(sanitized.sequence.users, 0),
    ...sanitized.users.map((item) => toInt(item.id, 0))
  );
  ensureMeetingTemplates(sanitized);
  ensureImportedActionHistory(sanitized);
  ensureActionOwnerNotifications(sanitized);
  return sanitized;
}

function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = clone(INITIAL_DATABASE);
      ensureMeetingTemplates(seeded);
      ensureImportedActionHistory(seeded);
      saveDatabase(seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeDatabase(parsed);
    saveDatabase(sanitized);
    return sanitized;
  } catch {
    const seeded = clone(INITIAL_DATABASE);
    saveDatabase(seeded);
    return seeded;
  }
}

function saveDatabase(database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function nextId(database, collectionName) {
  const nextValue = toInt(database.sequence[collectionName], 0) + 1;
  database.sequence[collectionName] = nextValue;
  return nextValue;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "LG";
  }

  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatProfileName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Usuário";
  }

  const formatPart = (part) => {
    const lower = part.toLocaleLowerCase("pt-BR");
    return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
  };

  return parts.length === 1
    ? formatPart(parts[0])
    : `${formatPart(parts[0])} ${formatPart(parts[parts.length - 1])}`;
}

function getCompany(database, companyId) {
  return database.companies.find((item) => toInt(item.id) === toInt(companyId)) || null;
}

function getUnit(database, unitId) {
  return database.units.find((item) => toInt(item.id) === toInt(unitId)) || null;
}

function getUserById(database, userId) {
  return database.users.find((item) => toInt(item.id) === toInt(userId)) || null;
}

function getUserByUsername(database, username) {
  const normalized = String(username || "").trim().toLowerCase();
  return database.users.find((item) => String(item.username || "").trim().toLowerCase() === normalized) || null;
}

function getUserProfile(database, userRecord) {
  const company = getCompany(database, userRecord.companyId);
  const units = database.units.filter((item) => arrayValue(userRecord.unitIds).includes(toInt(item.id)));
  const permissions = getRolePermissions(userRecord.role);

  if (userRecord.role === "admin" && isGabrielyAdministrator(userRecord)) {
    permissions.push("administration.view", "administration.manage");
  }

  return {
    id: toInt(userRecord.id),
    name: formatProfileName(userRecord.name),
    username: userRecord.username,
    role: userRecord.role,
    roleLabel: getRoleLabel(userRecord.role),
    companyId: toInt(userRecord.companyId),
    companyName: company?.name || null,
    unitIds: arrayValue(userRecord.unitIds).map((item) => toInt(item)),
    unitNames: units.map((item) => item.name),
    status: userRecord.status || "active",
    avatar: userRecord.avatar || getInitials(userRecord.name),
    title: userRecord.title || "Usuario da plataforma",
    department: userRecord.department || "",
    permissions
  };
}

function getScopedCollection(database, user, collectionName) {
  return arrayValue(database[collectionName]).filter((record) => testCollectionScope(collectionName, record, user));
}

function testCollectionScope(collectionName, record, user) {
  if (collectionName === "notifications") {
    return toInt(record.userId) === toInt(user.id);
  }

  // A consulta e a operação dos módulos são compartilhadas por toda a equipe.
  // Notificações continuam individuais e Administração continua protegida por permissão.
  if (collectionName !== "notifications") {
    return true;
  }

  const userUnitIds = arrayValue(user.unitIds).map((item) => toInt(item));

  switch (collectionName) {
    case "users":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return (
          toInt(record.companyId) === toInt(user.companyId) &&
          arrayValue(record.unitIds).some((unitId) => userUnitIds.includes(toInt(unitId)))
        );
      }
      return toInt(record.id) === toInt(user.id);
    case "companies":
      return toInt(record.id) === toInt(user.companyId);
    case "units":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      return userUnitIds.includes(toInt(record.id));
    case "actionPlans":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return (
        toInt(record.ownerId) === toInt(user.id) ||
        toInt(record.createdBy) === toInt(user.id) ||
        (record.source === "legacy_excel" && matchesLegacyOwner(user, record.legacyOwnerName))
      );
    case "meetings":
      if (record.templateId) {
        return true;
      }
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.ownerId) === toInt(user.id) || toInt(record.createdBy) === toInt(user.id);
    case "gapaRecords":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.ownerId) === toInt(user.id) || toInt(record.createdBy) === toInt(user.id);
    case "dtoRecords":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.ownerId) === toInt(user.id) || toInt(record.createdBy) === toInt(user.id);
    case "anomalyReports":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.reportedBy) === toInt(user.id) || userUnitIds.includes(toInt(record.unitId));
    case "gerotRecords":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.ownerId) === toInt(user.id) || toInt(record.createdBy) === toInt(user.id);
    case "history":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.actorId) === toInt(user.id);
    default:
      return true;
  }
}

function ensurePermission(user, permission) {
  if (!arrayValue(user.permissions).includes(permission)) {
    throw new ApiError("Seu perfil não tem permissão para esta ação.", 403);
  }
}

function parseSubjects(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function meetingSortOrder(record) {
  return record.templateId ? toInt(record.templateId, 9999) : 9999;
}

function ensureGabrielyAdministration(user) {
  ensurePermission(user, "administration.manage");
  if (user.username !== "Gabriely" || user.role !== "admin") {
    throw new ApiError("A administração de reuniões é exclusiva da Gabriely.", 403);
  }
}

function canEditWarehouseGerot(user) {
  const department = String(user?.department || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return isGabrielyAdministrator(user) || department === "ARMAZEM";
}

function canEditGerotArea(user, area) {
  const department = String(user?.department || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return isGabrielyAdministrator(user) || department === String(area).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function updateWarehouseGerot(database, user, payload) {
  ensurePermission(user, "gerot.read");
  if (!canEditWarehouseGerot(user)) {
    throw new ApiError("A edição do GEROT Armazém é permitida somente ao setor Armazém e à Gabriely.", 403);
  }
  const warehouse = database.gerotWarehouse;
  const updates = arrayValue(payload?.rows);
  updates.forEach((update) => {
    const row = warehouse.rows.find((item) => item.id === update.id);
    if (!row || arrayValue(row.formulaInputs).length || !Array.isArray(update.monthly)) return;
    row.monthly = GEROT_MONTHS.map((_, index) => {
      const value = update.monthly[index];
      return value === "" || value === null || typeof value === "undefined" ? null : Number(value);
    });
  });
  warehouse.updatedAt = nowIso();
  warehouse.updatedBy = toInt(user.id);
  warehouse.calculatedYtd = true;
  addHistoryEntry(database, {
    module: "gerot",
    action: "updated",
    entityId: 1,
    actorId: user.id,
    companyId: 0,
    unitId: 0,
    description: "GEROT Armazém atualizado."
  });
  return { item: warehouse };
}

function updateGerotArea(database, user, payload) {
  const area = String(payload?.area || "ARMAZÉM").toUpperCase();
  if (area === "ARMAZÉM") return updateWarehouseGerot(database, user, payload);
  ensurePermission(user, "gerot.read");
  if (!canEditGerotArea(user, area)) throw new ApiError("A edição deste GEROT é permitida somente ao setor correspondente e à Gabriely.", 403);
  const record = database.gerotAdditionalAreas?.[area];
  if (!record) throw new ApiError("Área do GEROT não encontrada.", 404);
  arrayValue(payload.rows).forEach((update) => {
    const row = record.rows.find((item) => item.id === update.id);
    if (!row || arrayValue(row.formulas).some(Boolean) || !Array.isArray(update.monthly)) return;
    row.monthly = GEROT_MONTHS.map((_, index) => update.monthly[index] === null || update.monthly[index] === "" || typeof update.monthly[index] === "undefined" ? null : Number(update.monthly[index]));
  });
  record.updatedAt = nowIso(); record.updatedBy = toInt(user.id); record.calculatedYtd = true;
  return { item: record };
}

function buildLookups(database, user) {
  return {
    users: getScopedCollection(database, user, "users").map((record) => {
      const profile = getUserProfile(database, record);
      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        role: profile.role,
        roleLabel: profile.roleLabel,
        companyId: profile.companyId,
        unitIds: profile.unitIds
      };
    }),
    responsibleUsers: database.users
      .filter((record) => (record.status || "active") === "active")
      .map((record) => {
        const profile = getUserProfile(database, record);
        return {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          role: profile.role,
          roleLabel: profile.roleLabel,
          companyId: profile.companyId,
          unitIds: profile.unitIds
        };
      }),
    companies: getScopedCollection(database, user, "companies").map((record) => ({
      id: toInt(record.id),
      name: record.name,
      segment: record.segment,
      headquarters: record.headquarters
    })),
    units: getScopedCollection(database, user, "units").map((record) => ({
      id: toInt(record.id),
      name: record.name,
      companyId: toInt(record.companyId),
      city: record.city,
      state: record.state
    })),
    roles: Object.entries(ROLE_LABELS)
      .filter(([id]) => id !== "admin")
      .map(([id, label]) => ({ id, label })),
    navigation: NAVIGATION.map((item) => ({ ...item }))
  };
}

function addHistoryEntry(database, values) {
  const entry = {
    id: nextId(database, "history"),
    module: values.module,
    action: values.action,
    entityId: toInt(values.entityId),
    actorId: toInt(values.actorId),
    companyId: toInt(values.companyId),
    unitId: toInt(values.unitId),
    description: values.description,
    createdAt: nowIso()
  };

  database.history.push(entry);
  return entry;
}

function addNotification(database, values) {
  const notification = {
    id: nextId(database, "notifications"),
    userId: toInt(values.userId),
    actionPlanId: toInt(values.actionPlanId, 0),
    title: values.title,
    message: values.message,
    level: values.level || "info",
    link: values.link || "dashboard",
    read: false,
    createdAt: nowIso()
  };

  database.notifications.push(notification);
  return notification;
}

function ensureActionOwnerNotifications(database) {
  arrayValue(database.actionPlans).forEach((action) => {
    const ownerId = toInt(action.ownerId, 0);
    if (
      !ownerId ||
      action.source === "legacy_excel" ||
      action.status === "done" ||
      action.notificationCreated ||
      database.notifications.some((item) => toInt(item.actionPlanId, 0) === toInt(action.id))
    ) {
      return;
    }
    addNotification(database, {
      userId: ownerId,
      actionPlanId: action.id,
      title: "Ação sob sua responsabilidade",
      message: action.title || action.objective || "Uma ação foi atribuída a você.",
      level: "warning",
      link: "actionPlans"
    });
  });
}

function resolveCompanyIdForRecord(database, user, companyId, unitId = 0) {
  if (user.role !== "admin") {
    return toInt(user.companyId);
  }

  if (toInt(unitId) > 0) {
    const unit = getUnit(database, unitId);
    if (unit) {
      return toInt(unit.companyId);
    }
  }

  return toInt(companyId);
}

function bootstrapPayload(database, user) {
  return {
    user,
    lookups: buildLookups(database, user)
  };
}

function buildProgressSeries(items) {
  const max = Math.max(...items.map((item) => toInt(item.value)), 1);
  return items.map((item) => ({
    ...item,
    progress: Math.round((toInt(item.value) / max) * 100)
  }));
}

function isPastDue(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = todaysDateKey();
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function buildDashboard(database, user) {
  // O dashboard é coletivo: qualquer usuário autenticado acompanha os mesmos
  // itens ativos, independentemente de autoria ou responsabilidade.
  const actionPlans = arrayValue(database.actionPlans);
  const openActions = actionPlans.filter((item) => item.status !== "done");
  const inProgressActions = actionPlans.filter((item) => item.status === "in_progress");
  const meetings = arrayValue(database.meetings);
  const activeMeetings = meetings.filter(
    (item) => item.scheduledAt && !["held", "closed", "done"].includes(item.status)
  );
  const gapaRecords = getScopedCollection(database, user, "gapaRecords");
  const dtoRecords = getScopedCollection(database, user, "dtoRecords");
  const anomalyReports = getScopedCollection(database, user, "anomalyReports");
  const gerotRecords = getScopedCollection(database, user, "gerotRecords");
  const notifications = getScopedCollection(database, user, "notifications");
  const overdueItems = [
    ...actionPlans
      .filter((item) => item.status !== "done" && isPastDue(item.dueDate))
      .map((item) => ({
        title: item.title,
        module: "Ações",
        dueDate: item.dueDate,
        status: item.status
      })),
    ...dtoRecords
      .filter((item) => item.status !== "completed" && isPastDue(item.dueDate))
      .map((item) => ({
        title: item.title,
        module: "DTO",
        dueDate: item.dueDate,
        status: item.status
      })),
    ...anomalyReports
      .filter((item) => item.status !== "resolved" && isPastDue(item.dueDate))
      .map((item) => ({
        title: item.title,
        module: "Relato de anomalia",
        dueDate: item.dueDate,
        status: item.status
      })),
    ...gerotRecords
      .filter((item) => item.status !== "closed" && isPastDue(item.dueDate))
      .map((item) => ({
        title: item.title,
        module: "GEROT",
        dueDate: item.dueDate,
        status: item.status
      }))
  ].sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)));

  const moduleLoad = buildProgressSeries([
    { label: "Ações", value: actionPlans.length },
    { label: "GAPA", value: gapaRecords.length },
    { label: "DTO", value: dtoRecords.length },
    { label: "GEROT", value: gerotRecords.length }
  ]);

  return {
    kpis: [
      {
        label: "Ações em andamento",
        value: openActions.length,
        helper: "Ações abertas da equipe"
      },
      {
        label: "Reuniões em andamento",
        value: activeMeetings.length,
        helper: "Reuniões agendadas ou em execução"
      }
    ],
    charts: {
      actionPlansByStatus: buildProgressSeries([
        { label: "Em andamento", value: inProgressActions.length }
      ])
    },
    highlights: {
      overdueItems: overdueItems.slice(0, 6),
      priorityAnomalies: anomalyReports
        .filter((item) => ["critical", "high"].includes(item.severity) && item.status !== "resolved")
        .slice(0, 6)
        .map((item) => ({
          ...item,
          unitName: getUnit(database, item.unitId)?.name || "Não definida"
        })),
      unreadNotifications: notifications.filter((item) => !item.read).length
    },
    actionPlans: [...openActions].sort((left, right) =>
      String(right.meetingExecutionDate || right.createdAt).localeCompare(String(left.meetingExecutionDate || left.createdAt))
    ),
    meetings: [...activeMeetings].sort((left, right) =>
      String(left.scheduledAt).localeCompare(String(right.scheduledAt))
    ),
    inProgressActions,
    feed: getScopedCollection(database, user, "history")
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
      .slice(0, 6)
  };
}

function buildReportsSummary(database, user) {
  const tasks = getScopedCollection(database, user, "tasks");
  const safety = getScopedCollection(database, user, "safetyReports");
  const trainings = getScopedCollection(database, user, "trainings");
  const tickets = getScopedCollection(database, user, "tickets");
  const checklists = getScopedCollection(database, user, "checklists");
  const checklistAverage =
    checklists.length > 0
      ? Math.round(
          checklists.reduce((total, item) => total + toInt(item.complianceRate), 0) / checklists.length
        )
      : 0;

  return {
    generatedAt: nowIso(),
    cards: [
      { label: "Conformidade de checklists", value: checklistAverage, unit: "%" },
      { label: "Treinamentos concluídos", value: trainings.filter((item) => item.status === "completed").length, unit: "" },
      { label: "Relatos resolvidos", value: safety.filter((item) => item.status === "resolved").length, unit: "" },
      { label: "Chamados em SLA", value: tickets.filter((item) => ["open", "in_progress"].includes(item.status)).length, unit: "" }
    ],
    breakdown: {
      tasks: {
        open: tasks.filter((item) => item.status === "open").length,
        inProgress: tasks.filter((item) => item.status === "in_progress").length,
        done: tasks.filter((item) => item.status === "done").length
      },
      safety: {
        open: safety.filter((item) => item.status === "open").length,
        investigating: safety.filter((item) => item.status === "investigating").length,
        resolved: safety.filter((item) => item.status === "resolved").length
      },
      trainings: {
        scheduled: trainings.filter((item) => item.status === "scheduled").length,
        inProgress: trainings.filter((item) => item.status === "in_progress").length,
        completed: trainings.filter((item) => item.status === "completed").length
      }
    }
  };
}

function csvEscape(value) {
  const normalized =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

function toCsv(items) {
  if (!items.length) {
    return "";
  }

  const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  const rows = items.map((item) => keys.map((key) => csvEscape(item[key])).join(","));
  return [keys.join(","), ...rows].join("\n");
}

function getSession(database, token) {
  return database.sessions.find((item) => item.token === token) || null;
}

function removeSession(database, token) {
  database.sessions = database.sessions.filter((item) => item.token !== token);
}

function getCurrentUser(database, token) {
  if (!token) {
    return null;
  }

  const session = getSession(database, token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    removeSession(database, token);
    saveDatabase(database);
    return null;
  }

  const userRecord = getUserById(database, session.userId);
  return userRecord ? getUserProfile(database, userRecord) : null;
}

function getAuthContext(token) {
  const database = loadDatabase();
  const user = getCurrentUser(database, token);
  if (!user) {
    throw new ApiError("Sessão inválida ou expirada. Faça login novamente.", 401);
  }

  return { database, user };
}

async function createUser(database, user, payload) {
  ensurePermission(user, "users.manage");

  if (!payload?.name?.trim() || !payload?.username?.trim() || !payload?.department?.trim() || !payload?.role?.trim()) {
    throw new ApiError("Nome, usuário, setor e perfil são obrigatórios.", 400);
  }

  if (payload.role === "admin") {
    throw new ApiError("O perfil Administrador é exclusivo da Gabriely.", 403);
  }

  if (getUserByUsername(database, payload.username)) {
    throw new ApiError("Já existe um usuário com este nome de usuário.", 409);
  }

  const defaultUnitIds =
    payload.role === "admin"
      ? arrayValue(database.units).map((item) => toInt(item.id))
      : arrayValue(user.unitIds).length > 0
        ? arrayValue(user.unitIds).map((item) => toInt(item))
        : arrayValue(database.units).map((item) => toInt(item.id));
  const companyId = user.companyId || database.companies[0]?.id || 0;
  const passwordHash = await sha256(payload.password?.trim() || "Senha@123");
  const record = {
    id: nextId(database, "users"),
    name: payload.name.trim(),
    username: payload.username.trim(),
    role: payload.role,
    companyId: resolveCompanyIdForRecord(database, user, companyId, defaultUnitIds[0] || 0),
    unitIds: defaultUnitIds,
    status: "active",
    passwordHash,
    avatar: getInitials(payload.name),
    title: "Usuário da plataforma",
    department: payload.department.trim(),
    createdAt: nowIso()
  };

  database.users.push(record);
  addHistoryEntry(database, {
    module: "users",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitIds[0] || 0,
    description: `Usuário ${record.name} criado com perfil ${getRoleLabel(record.role)}.`
  });

  return { item: getUserProfile(database, record) };
}

function createActionPlan(database, user, payload) {
  ensurePermission(user, "actionPlans.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.ownerId) {
    throw new ApiError("Título, unidade e responsável são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "actionPlans"),
    title: payload.title.trim(),
    objective: payload.objective?.trim() || "",
    status: payload.status || "open",
    priority: payload.priority || "medium",
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    ownerId: toInt(payload.ownerId),
    createdBy: toInt(user.id),
    dueDate: payload.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    source: "platform",
    notificationCreated: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("actionPlans", record, user)) {
    throw new ApiError("O plano precisa estar dentro da sua área de atuação.", 403);
  }

  database.actionPlans.push(record);
  addHistoryEntry(database, {
    module: "actionPlans",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Ação '${record.title}' criada.`
  });
  addNotification(database, {
    userId: record.ownerId,
    actionPlanId: record.id,
    title: "Nova ação",
    message: record.title,
    level: "info",
    link: "actionPlans"
  });

  return { item: record };
}

function createMeeting(database, user, payload) {
  ensurePermission(user, "meetings.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.ownerId || !payload?.scheduledAt?.trim()) {
    throw new ApiError("Título, unidade, data e condução são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "meetings"),
    title: payload.title.trim(),
    objective: payload.objective?.trim() || "",
    status: payload.status || "scheduled",
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    ownerId: toInt(payload.ownerId),
    scheduledAt: payload.scheduledAt,
    createdBy: toInt(user.id),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("meetings", record, user)) {
    throw new ApiError("A reunião precisa estar dentro do seu escopo.", 403);
  }

  database.meetings.push(record);
  addHistoryEntry(database, {
    module: "meetings",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Reunião '${record.title}' registrada.`
  });
  addNotification(database, {
    userId: record.ownerId,
    title: "Nova reunião",
    message: record.title,
    level: "info",
    link: "meetings"
  });

  return { item: record };
}

function createAdministrationMeeting(database, user, payload) {
  ensureGabrielyAdministration(user);

  if (!payload?.title?.trim()) {
    throw new ApiError("Informe o nome da reunião.", 400);
  }

  const subjects = parseSubjects(payload.subjects);
  const record = {
    id: nextId(database, "meetings"),
    templateId: null,
    title: payload.title.trim(),
    objective: "Reunião cadastrada pela administração.",
    status: "scheduled",
    companyId: 0,
    unitId: 0,
    ownerId: toInt(user.id),
    scheduledAt: "",
    lastExecutionDate: "",
    subjects,
    importedFrom: "",
    createdBy: toInt(user.id),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  database.meetings.push(record);
  addHistoryEntry(database, {
    module: "meetings",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: 0,
    unitId: 0,
    description: `Reunião '${record.title}' cadastrada pela administração.`
  });

  return { item: record };
}

function deleteAdministrationMeeting(database, user, meetingId) {
  ensureGabrielyAdministration(user);

  const meeting = database.meetings.find((item) => toInt(item.id) === toInt(meetingId));
  if (!meeting) {
    throw new ApiError("Reunião não encontrada.", 404);
  }

  database.meetings = database.meetings.filter((item) => toInt(item.id) !== toInt(meetingId));

  if (meeting.templateId) {
    database.meta.deletedMeetingTemplateIds = Array.from(
      new Set([...arrayValue(database.meta.deletedMeetingTemplateIds), toInt(meeting.templateId)])
    );
  }

  addHistoryEntry(database, {
    module: "meetings",
    action: "deleted",
    entityId: meeting.id,
    actorId: user.id,
    companyId: meeting.companyId,
    unitId: meeting.unitId,
    description: `Reunião '${meeting.title}' excluída pela administração.`
  });

  return { success: true };
}

function createMeetingAction(database, user, payload) {
  ensurePermission(user, "meetings.manage");
  ensurePermission(user, "actionPlans.manage");

  if (!payload?.meetingId || !payload?.subject?.trim() || !payload?.actionPlan?.trim() || !payload?.ownerId) {
    throw new ApiError("Reunião, assunto, plano de ação e responsável são obrigatórios.", 400);
  }

  const meeting = database.meetings.find((item) => toInt(item.id) === toInt(payload.meetingId));
  if (!meeting || !testCollectionScope("meetings", meeting, user)) {
    throw new ApiError("Reunião não encontrada.", 404);
  }

  const subjects = arrayValue(meeting.subjects);
  const subject = payload.subject.trim();
  if (!subjects.includes(subject)) {
    throw new ApiError("O assunto selecionado não pertence à reunião.", 400);
  }

  let attachment = null;
  if (payload.attachment) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(payload.attachment.type)) {
      throw new ApiError("O documento deve ser PDF, JPG, JPEG ou PNG.", 400);
    }
    if (toInt(payload.attachment.size) > 5 * 1024 * 1024 || typeof payload.attachment.data !== "string") {
      throw new ApiError("O documento deve ter no máximo 5 MB.", 400);
    }
    attachment = {
      name: String(payload.attachment.name || "documento"),
      type: payload.attachment.type,
      size: toInt(payload.attachment.size),
      data: payload.attachment.data
    };
  }

  const fallbackUnitId = arrayValue(user.unitIds)[0] || meeting.unitId || 0;
  const unit = fallbackUnitId ? getUnit(database, fallbackUnitId) : null;
  const unitId = unit ? toInt(unit.id) : toInt(fallbackUnitId);
  const companyId = unit
    ? toInt(unit.companyId)
    : toInt(user.companyId || meeting.companyId || 0);
  const record = {
    id: nextId(database, "actionPlans"),
    title: subject,
    objective: payload.actionPlan.trim(),
    status: "open",
    priority: payload.priority || "medium",
    companyId,
    unitId,
    ownerId: toInt(payload.ownerId || 0),
    requesterId: toInt(user.id),
    requesterName: user.name,
    createdBy: toInt(user.id),
    dueDate: payload.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    meetingId: toInt(meeting.id),
    meetingTitle: meeting.title,
    meetingSubject: subject,
    meetingExecutionDate: payload.executionDate || "",
    attachment,
    source: "meetings",
    notificationCreated: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("actionPlans", record, user)) {
    throw new ApiError("A ação precisa estar dentro da sua área de atuação.", 403);
  }

  database.actionPlans.push(record);
  addHistoryEntry(database, {
    module: "actionPlans",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Ação '${record.title}' criada na reunião '${meeting.title}'.`
  });
  if (record.ownerId) {
    addNotification(database, {
      userId: record.ownerId,
      actionPlanId: record.id,
      title: "Nova ação de reunião",
      message: `${meeting.title}: ${record.title}`,
      level: "info",
      link: "actionPlans"
    });
  }

  return { item: record };
}

function closeMeeting(database, user, meetingId, payload = {}) {
  ensurePermission(user, "meetings.manage");

  const meeting = database.meetings.find((item) => toInt(item.id) === toInt(meetingId));
  if (!meeting || !testCollectionScope("meetings", meeting, user)) {
    throw new ApiError("Reunião não encontrada.", 404);
  }

  if (!payload.executionDate?.trim()) {
    throw new ApiError("Informe a data de execução antes de encerrar a reunião.", 400);
  }

  meeting.status = "held";
  meeting.lastExecutionDate = payload.executionDate;
  meeting.updatedAt = nowIso();
  addHistoryEntry(database, {
    module: "meetings",
    action: "closed",
    entityId: meeting.id,
    actorId: user.id,
    companyId: meeting.companyId,
    unitId: meeting.unitId,
    description: `Reunião '${meeting.title}' encerrada em ${payload.executionDate}.`
  });

  return { item: meeting };
}

function createGapaRecord(database, user, payload) {
  ensurePermission(user, "gapa.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.ownerId) {
    throw new ApiError("Título, unidade e responsável são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "gapaRecords"),
    title: payload.title.trim(),
    category: payload.category?.trim() || "Geral",
    summary: payload.summary?.trim() || "",
    status: payload.status || "open",
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    ownerId: toInt(payload.ownerId),
    createdBy: toInt(user.id),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("gapaRecords", record, user)) {
    throw new ApiError("O registro GAPA precisa estar dentro do seu escopo.", 403);
  }

  database.gapaRecords.push(record);
  addHistoryEntry(database, {
    module: "gapa",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Registro GAPA '${record.title}' criado.`
  });
  addNotification(database, {
    userId: record.ownerId,
    title: "Novo registro GAPA",
    message: record.title,
    level: "info",
    link: "gapa"
  });

  return { item: record };
}

function createDtoRecord(database, user, payload) {
  ensurePermission(user, "dto.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.ownerId) {
    throw new ApiError("Título, unidade e responsável são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "dtoRecords"),
    title: payload.title.trim(),
    diagnosis: payload.diagnosis?.trim() || "",
    status: payload.status || "analysis",
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    ownerId: toInt(payload.ownerId),
    createdBy: toInt(user.id),
    dueDate: payload.dueDate || new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("dtoRecords", record, user)) {
    throw new ApiError("O DTO precisa estar dentro da sua área de atuação.", 403);
  }

  database.dtoRecords.push(record);
  addHistoryEntry(database, {
    module: "dto",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `DTO '${record.title}' registrado.`
  });
  addNotification(database, {
    userId: record.ownerId,
    title: "Novo DTO",
    message: record.title,
    level: "info",
    link: "dto"
  });

  return { item: record };
}

function createAnomalyReport(database, user, payload) {
  ensurePermission(user, "anomalyReports.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.severity?.trim()) {
    throw new ApiError("Título, unidade e severidade são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "anomalyReports"),
    title: payload.title.trim(),
    source: payload.source?.trim() || "Operação",
    severity: payload.severity,
    status: payload.status || "open",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    reportedBy: toInt(user.id),
    description: payload.description?.trim() || "",
    createdAt: nowIso(),
    dueDate: payload.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  };

  if (!testCollectionScope("anomalyReports", record, user)) {
    throw new ApiError("A anomalia precisa estar dentro do seu escopo.", 403);
  }

  database.anomalyReports.push(record);
  addHistoryEntry(database, {
    module: "anomalyReports",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Relato de anomalia '${record.title}' registrado.`
  });
  addNotification(database, {
    userId: user.id,
    title: "Anomalia registrada",
    message: record.title,
    level: "warning",
    link: "anomalyReports"
  });

  return { item: record };
}

function createGerotRecord(database, user, payload) {
  ensurePermission(user, "gerot.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.ownerId) {
    throw new ApiError("Título, unidade e responsável são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "gerotRecords"),
    title: payload.title.trim(),
    front: payload.front?.trim() || "Geral",
    notes: payload.notes?.trim() || "",
    status: payload.status || "open",
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    ownerId: toInt(payload.ownerId),
    createdBy: toInt(user.id),
    dueDate: payload.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("gerotRecords", record, user)) {
    throw new ApiError("O registro GEROT precisa estar dentro do seu escopo.", 403);
  }

  database.gerotRecords.push(record);
  addHistoryEntry(database, {
    module: "gerot",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Registro GEROT '${record.title}' criado.`
  });
  addNotification(database, {
    userId: record.ownerId,
    title: "Novo registro GEROT",
    message: record.title,
    level: "info",
    link: "gerot"
  });

  return { item: record };
}

function createTask(database, user, payload) {
  ensurePermission(user, "tasks.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.assigneeId) {
    throw new ApiError("Título, unidade e responsável são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "tasks"),
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    status: payload.status || "open",
    priority: payload.priority || "medium",
    dueDate: payload.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    assigneeId: toInt(payload.assigneeId),
    createdBy: toInt(user.id),
    tags: arrayValue(payload.tags),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("tasks", record, user)) {
    throw new ApiError("A tarefa precisa estar dentro da sua área de atuação.", 403);
  }

  database.tasks.push(record);
  addHistoryEntry(database, {
    module: "tasks",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Tarefa '${record.title}' criada.`
  });
  addNotification(database, {
    userId: record.assigneeId,
    title: "Nova tarefa atribuida",
    message: record.title,
    level: "info",
    link: "tasks"
  });

  return { item: record };
}

function createChecklist(database, user, payload) {
  ensurePermission(user, "checklists.manage");

  const unitIds = arrayValue(payload.unitIds).map((item) => toInt(item)).filter((item) => item > 0);
  if (!payload?.name?.trim() || !payload?.category?.trim() || unitIds.length === 0) {
    throw new ApiError("Nome, categoria e ao menos uma unidade sao obrigatorios.", 400);
  }

  const items = arrayValue(payload.items)
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: index + 1,
      label,
      required: true,
      description: "Item criado pela interface"
    }));

  if (items.length === 0) {
    throw new ApiError("Inclua ao menos um item no checklist.", 400);
  }

  const record = {
    id: nextId(database, "checklists"),
    name: payload.name.trim(),
    category: payload.category.trim(),
    companyId: resolveCompanyIdForRecord(database, user, payload.companyId || user.companyId, unitIds[0]),
    unitIds,
    complianceRate: 0,
    lastRunAt: null,
    items,
    createdBy: toInt(user.id),
    createdAt: nowIso()
  };

  if (!testCollectionScope("checklists", record, user)) {
    throw new ApiError("Checklist fora do escopo permitido.", 403);
  }

  database.checklists.push(record);
  addHistoryEntry(database, {
    module: "checklists",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitIds[0] || 0,
    description: `Checklist '${record.name}' criado.`
  });

  return { item: record };
}

function createSafetyReport(database, user, payload) {
  ensurePermission(user, "safety.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.severity?.trim()) {
    throw new ApiError("Título, unidade e severidade são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "safetyReports"),
    title: payload.title.trim(),
    type: payload.type || "Desvio",
    severity: payload.severity,
    status: payload.status || "open",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    reportedBy: toInt(user.id),
    description: payload.description?.trim() || "",
    createdAt: nowIso(),
    dueDate: payload.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  };

  if (!testCollectionScope("safetyReports", record, user)) {
    throw new ApiError("Relato fora do seu escopo.", 403);
  }

  database.safetyReports.push(record);
  addHistoryEntry(database, {
    module: "safety",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Relato '${record.title}' registrado.`
  });
  addNotification(database, {
    userId: user.id,
    title: "Relato registrado",
    message: `Ocorrencia '${record.title}' adicionada com sucesso.`,
    level: "success",
    link: "safety"
  });

  return { item: record };
}

function createTraining(database, user, payload) {
  ensurePermission(user, "trainings.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.dueDate?.trim()) {
    throw new ApiError("Título, unidade e data são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const participants = arrayValue(payload.participantIds)
    .map((item) => toInt(item))
    .filter((item) => item > 0)
    .map((userId) => ({
      userId,
      status: "pending",
      completedAt: null,
      score: null
    }));

  const record = {
    id: nextId(database, "trainings"),
    title: payload.title.trim(),
    category: payload.category?.trim() || "Operação",
    status: payload.status || "scheduled",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    dueDate: payload.dueDate,
    instructor: payload.instructor?.trim() || user.name,
    targetRoles: arrayValue(payload.targetRoles).length > 0 ? arrayValue(payload.targetRoles) : [user.role],
    participants,
    createdBy: toInt(user.id),
    createdAt: nowIso()
  };

  if (!testCollectionScope("trainings", record, user)) {
    throw new ApiError("Treinamento fora do escopo permitido.", 403);
  }

  database.trainings.push(record);
  addHistoryEntry(database, {
    module: "trainings",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Treinamento '${record.title}' cadastrado.`
  });

  for (const participant of participants) {
    addNotification(database, {
      userId: participant.userId,
      title: "Novo treinamento",
      message: record.title,
      level: "info",
      link: "trainings"
    });
  }

  return { item: record };
}

function createTicket(database, user, payload) {
  ensurePermission(user, "tickets.manage");

  if (!payload?.title?.trim() || !payload?.unitId) {
    throw new ApiError("Título e unidade são obrigatórios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada não existe.", 404);
  }

  const record = {
    id: nextId(database, "tickets"),
    title: payload.title.trim(),
    category: payload.category?.trim() || "Operação",
    priority: payload.priority || "medium",
    status: payload.status || "open",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    requesterId: toInt(user.id),
    ownerId: payload.ownerId ? toInt(payload.ownerId) : toInt(user.id),
    description: payload.description?.trim() || "",
    openedAt: nowIso(),
    dueDate: payload.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  };

  if (!testCollectionScope("tickets", record, user)) {
    throw new ApiError("Chamado fora do escopo permitido.", 403);
  }

  database.tickets.push(record);
  addHistoryEntry(database, {
    module: "tickets",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Chamado '${record.title}' aberto.`
  });
  addNotification(database, {
    userId: record.ownerId,
    title: "Novo chamado",
    message: record.title,
    level: "warning",
    link: "tickets"
  });

  return { item: record };
}

function listPath(database, user, path) {
  switch (path) {
    case "/users":
      ensurePermission(user, "users.read");
      {
        const response = {
          items: getScopedCollection(database, user, "users").map((record) => getUserProfile(database, record))
        };
        if (user.role === "admin") {
          response.passwordResetRequests = arrayValue(database.passwordResetRequests)
            .filter((request) => request.status !== "used")
            .map(({ id, username, status, createdAt, expiresAt }) => ({ id, username, status, createdAt, expiresAt }));
        }
        return response;
      }
    case "/administration/meetings":
      ensurePermission(user, "administration.view");
      return {
        users: database.users.map((record) => getUserProfile(database, record)),
        items: arrayValue(database.meetings).sort((left, right) => {
          const leftOrder = meetingSortOrder(left);
          const rightOrder = meetingSortOrder(right);
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return String(left.title).localeCompare(String(right.title), "pt-BR");
        })
      };
    case "/action-plans":
      ensurePermission(user, "actionPlans.read");
      return {
        items: getScopedCollection(database, user, "actionPlans").sort((left, right) =>
          String(left.dueDate).localeCompare(String(right.dueDate))
        )
      };
    case "/meetings":
      ensurePermission(user, "meetings.read");
      return {
        items: getScopedCollection(database, user, "meetings").sort((left, right) => {
          const leftOrder = meetingSortOrder(left);
          const rightOrder = meetingSortOrder(right);
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return String(left.title).localeCompare(String(right.title), "pt-BR");
        })
      };
    case "/meetings/history":
      ensurePermission(user, "meetings.read");
      return {
        items: getScopedCollection(database, user, "meetings")
          .filter((item) => item.status === "held" && item.lastExecutionDate)
          .sort((left, right) => String(right.lastExecutionDate).localeCompare(String(left.lastExecutionDate)))
      };
    case "/gapa":
      ensurePermission(user, "gapa.read");
      return {
        items: getScopedCollection(database, user, "gapaRecords").sort((left, right) =>
          String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt))
        )
      };
    case "/dto":
      ensurePermission(user, "dto.read");
      return {
        items: getScopedCollection(database, user, "dtoRecords").sort((left, right) =>
          String(left.dueDate).localeCompare(String(right.dueDate))
        )
      };
    case "/anomaly-reports":
      ensurePermission(user, "anomalyReports.read");
      return {
        items: getScopedCollection(database, user, "anomalyReports").sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt))
        )
      };
    case "/gerot":
      ensurePermission(user, "gerot.read");
      return {
        areas: [database.gerotWarehouse, ...Object.values(database.gerotAdditionalAreas || {})].map((record) => ({
          ...record,
          canEdit: canEditGerotArea(user, record.area)
        }))
      };
    case "/notifications": {
      ensurePermission(user, "notifications.view");
      const items = getScopedCollection(database, user, "notifications").sort((left, right) =>
        String(right.createdAt).localeCompare(String(left.createdAt))
      );
      return {
        items,
        unreadCount: items.filter((item) => !item.read).length
      };
    }
    case "/history":
      ensurePermission(user, "history.view");
      return {
        items: getScopedCollection(database, user, "history")
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
          .slice(0, 40)
      };
    case "/reports/summary":
      ensurePermission(user, "reports.view");
      return buildReportsSummary(database, user);
    default:
      throw new ApiError("Endpoint não encontrado.", 404);
  }
}

function createPath(database, user, path, body) {
  switch (path) {
    case "/users":
      return createUser(database, user, body);
    case "/action-plans":
      return Promise.resolve(createActionPlan(database, user, body));
    case "/meetings":
      return Promise.resolve(createMeeting(database, user, body));
    case "/administration/meetings":
      return Promise.resolve(createAdministrationMeeting(database, user, body));
    case "/meetings/actions":
      return Promise.resolve(createMeetingAction(database, user, body));
    case "/gapa":
      return Promise.resolve(createGapaRecord(database, user, body));
    case "/dto":
      return Promise.resolve(createDtoRecord(database, user, body));
    case "/anomaly-reports":
      return Promise.resolve(createAnomalyReport(database, user, body));
    case "/gerot":
      return Promise.resolve(createGerotRecord(database, user, body));
    default:
      throw new ApiError("Endpoint não encontrado.", 404);
  }
}

function completeActionPlan(database, user, actionId) {
  ensurePermission(user, "actionPlans.manage");
  const action = database.actionPlans.find((item) => toInt(item.id) === toInt(actionId));
  if (!action || !testCollectionScope("actionPlans", action, user)) {
    throw new ApiError("Ação não encontrada.", 404);
  }
  if (toInt(action.ownerId) !== toInt(user.id)) {
    throw new ApiError("Somente o responsável pode concluir esta ação.", 403);
  }
  if (action.status === "done") {
    return { item: action };
  }

  action.status = "done";
  action.completedAt = nowIso();
  action.updatedAt = nowIso();
  addHistoryEntry(database, {
    module: "actionPlans",
    action: "completed",
    entityId: action.id,
    actorId: user.id,
    companyId: action.companyId,
    unitId: action.unitId,
    description: `Ação '${action.title}' concluída pelo responsável.`
  });
  return { item: action };
}

function patchPath(database, user, path, body = {}) {
  const approveResetMatch = path.match(/^\/password-reset-requests\/([^/]+)\/approve$/);
  if (approveResetMatch) {
    return approvePasswordReset(database, user, approveResetMatch[1]);
  }

  const completeActionMatch = path.match(/^\/action-plans\/(\d+)\/complete$/);
  if (completeActionMatch) {
    return completeActionPlan(database, user, completeActionMatch[1]);
  }

  const notificationMatch = path.match(/^\/notifications\/(\d+)\/read$/);
  if (notificationMatch) {
    ensurePermission(user, "notifications.view");
    const notificationId = toInt(notificationMatch[1]);
    const notification = database.notifications.find((item) => toInt(item.id) === notificationId);
    if (!notification || toInt(notification.userId) !== toInt(user.id)) {
      throw new ApiError("Notificação não encontrada.", 404);
    }

    notification.read = true;
    return { item: notification };
  }

  const closeMeetingMatch = path.match(/^\/meetings\/(\d+)\/close$/);
  if (closeMeetingMatch) {
    return closeMeeting(database, user, closeMeetingMatch[1], body);
  }

  const deleteMeetingMatch = path.match(/^\/administration\/meetings\/(\d+)\/delete$/);
  if (deleteMeetingMatch) {
    return deleteAdministrationMeeting(database, user, deleteMeetingMatch[1]);
  }

  if (path === "/gerot/warehouse") {
    return updateGerotArea(database, user, body);
  }

  throw new ApiError("Endpoint não encontrado.", 404);
}

function createTemporaryCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1000000).padStart(6, "0");
}

async function requestPasswordReset(credentials) {
  const username = credentials?.username?.trim();
  if (!username) {
    throw new ApiError("Informe seu nome de usuário para continuar.", 400);
  }

  const database = loadDatabase();
  const userRecord = getUserByUsername(database, username);
  const activeRequest = arrayValue(database.passwordResetRequests).find(
    (item) => item.username.toLowerCase() === username.toLowerCase() && ["pending", "approved"].includes(item.status)
  );
  if (!userRecord) {
    return { success: true, message: "Se o usuário existir, a solicitação será encaminhada para validação do ADM." };
  }
  if (activeRequest && new Date(activeRequest.expiresAt).getTime() > Date.now()) {
    return { success: true, message: "Solicitação já registrada. Aguarde a validação do ADM." };
  }

  const now = new Date();
  database.passwordResetRequests = arrayValue(database.passwordResetRequests).filter(
    (item) => !(item.username.toLowerCase() === username.toLowerCase() && item.status !== "used")
  );
  database.passwordResetRequests.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: userRecord.username,
    code: createTemporaryCode(),
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  });
  saveDatabase(database);
  return { success: true, message: "Solicitação registrada. O ADM precisa aprovar o código antes da troca de senha." };
}

function approvePasswordReset(database, user, requestId) {
  ensurePermission(user, "users.manage");
  if (user.role !== "admin") {
    throw new ApiError("Somente um usuário com perfil Administrador pode validar o código.", 403);
  }

  const request = arrayValue(database.passwordResetRequests).find((item) => String(item.id) === String(requestId));
  if (!request || request.status !== "pending") {
    throw new ApiError("Solicitação não encontrada ou já processada.", 404);
  }
  if (new Date(request.expiresAt).getTime() < Date.now()) {
    request.status = "expired";
    throw new ApiError("A solicitação expirou. O usuário deve solicitar um novo código.", 400);
  }

  request.status = "approved";
  request.approvedAt = nowIso();
  request.approvedBy = user.id;
  return { success: true, code: request.code };
}

async function resetPassword(credentials) {
  const username = credentials?.username?.trim();
  const code = credentials?.code?.trim();
  const newPassword = credentials?.newPassword?.trim();

  if (!username || !code || !newPassword) {
    throw new ApiError("Informe usuário, código temporário e nova senha.", 400);
  }

  if (newPassword.length < 8) {
    throw new ApiError("A nova senha deve ter ao menos 8 caracteres.", 400);
  }

  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new ApiError("A nova senha deve conter letras e números.", 400);
  }

  const database = loadDatabase();
  const userRecord = getUserByUsername(database, username);
  const request = arrayValue(database.passwordResetRequests).find(
    (item) => item.username.toLowerCase() === username.toLowerCase() && item.code === code
  );
  if (!userRecord || !request || request.status !== "approved") {
    throw new ApiError("Código temporário inválido ou ainda não aprovado pelo ADM.", 401);
  }
  if (new Date(request.expiresAt).getTime() < Date.now()) {
    request.status = "expired";
    saveDatabase(database);
    throw new ApiError("O código temporário expirou. Solicite um novo código.", 401);
  }

  userRecord.passwordHash = await sha256(newPassword);
  userRecord.updatedAt = nowIso();
  request.status = "used";
  request.usedAt = nowIso();
  database.sessions = arrayValue(database.sessions).filter((session) => toInt(session.userId) !== toInt(userRecord.id));
  saveDatabase(database);
  return { success: true };
}

export const api = {
  async requestPasswordReset(credentials) {
    return requestPasswordReset(credentials);
  },

  async login(credentials) {
    const database = loadDatabase();
    if (!credentials?.username?.trim() || !credentials?.password?.trim()) {
      throw new ApiError("Informe usuário e senha para continuar.", 400);
    }

    const userRecord = getUserByUsername(database, credentials.username);
    if (!userRecord) {
      throw new ApiError("Credenciais inválidas.", 401);
    }

    const passwordHash = await sha256(credentials.password.trim());
    if (passwordHash !== userRecord.passwordHash) {
      throw new ApiError("Credenciais inválidas.", 401);
    }

    const issuedAt = new Date();
    const session = {
      id: nextId(database, "sessions"),
      token: `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`,
      userId: toInt(userRecord.id),
      createdAt: issuedAt.toISOString(),
      expiresAt: addHours(issuedAt, SESSION_DURATION_HOURS).toISOString()
    };

    database.sessions.push(session);
    saveDatabase(database);

    const user = getUserProfile(database, userRecord);
    return {
      token: session.token,
      user,
      lookups: buildLookups(database, user)
    };
  },

  async resetPassword(credentials) {
    return resetPassword(credentials);
  },

  async me(token) {
    const { database, user } = getAuthContext(token);
    return bootstrapPayload(database, user);
  },

  async logout(token) {
    const database = loadDatabase();
    removeSession(database, token);
    saveDatabase(database);
    return { success: true };
  },

  async dashboard(token) {
    const { database, user } = getAuthContext(token);
    ensurePermission(user, "dashboard.view");
    return buildDashboard(database, user);
  },

  async presence(token, module) {
    const { database, user } = getAuthContext(token);
    const response = await fetch("/api/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: user.id, name: user.name, module })
    });
    if (!response.ok) {
      throw new ApiError("Não foi possível atualizar a presença.", response.status);
    }
    return response.json();
  },

  async list(token, path) {
    const { database, user } = getAuthContext(token);
    return listPath(database, user, path);
  },

  async create(token, path, body) {
    const { database, user } = getAuthContext(token);
    const payload = await createPath(database, user, path, body);
    saveDatabase(database);
    return payload;
  },

  async patch(token, path, body = {}) {
    const { database, user } = getAuthContext(token);
    const payload = patchPath(database, user, path, body);
    saveDatabase(database);
    return payload;
  },

  async exportCsv(token, entity) {
    const { database, user } = getAuthContext(token);
    if (entity === "users") {
      ensureGabrielyAdministration(user);
      return toCsv(database.users.map((record) => {
        const profile = getUserProfile(database, record);
        return {
          nome: profile.name,
          usuario: profile.username,
          setor: profile.department,
          perfil: profile.roleLabel,
          status: profile.status,
          empresa: profile.companyName || "",
          unidades: profile.unitNames.join(", "),
          criadoEm: record.createdAt || ""
        };
      }));
    }
    if (entity === "meetings") {
      ensureGabrielyAdministration(user);
      return toCsv(arrayValue(database.meetings).flatMap((meeting) => {
        const subjects = arrayValue(meeting.subjects);
        const baseRecord = {
          reuniao: meeting.title || "",
          ultimaExecucao: meeting.lastExecutionDate || "",
          origem: meeting.importedFrom ? "Planilha" : "Manual"
        };

        return subjects.length
          ? subjects.map((subject) => ({ ...baseRecord, assunto: subject }))
          : [{ ...baseRecord, assunto: "" }];
      }));
    }
    ensurePermission(user, "reports.export");

    const map = {
      tasks: "tasks",
      checklists: "checklists",
      safetyReports: "safetyReports",
      trainings: "trainings",
      tickets: "tickets"
    };

    const collectionName = map[entity];
    if (!collectionName) {
      throw new ApiError("Escolha um tipo de exportação válido.", 400);
    }

    const items = getScopedCollection(database, user, collectionName);
    database.meta.lastExport = nowIso();
    saveDatabase(database);
    return toCsv(items);
  }
};
