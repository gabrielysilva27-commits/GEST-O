import { promises as fs } from "node:fs";
import path from "node:path";
import { AUDIT_ACTIONS } from "../assets/js/audit-actions-data.js";

const SHARED_MEETING_SUBJECT_SEED_VERSION = 2;
const SHARED_MEETING_SUBJECT_SEED = {
  "Team Room Armazém": [
    "5S por area",
    "Eficiencia de carregamento",
    "Eficiencia de montagem"
  ],
  "Pré Team Room Armazém": [
    "GEROT com todos os KPI's da área (Distribuição ou Armazém)"
  ],
  "Team Room Mensal Armazém": [
    "GEROT com todos os KPI's da área (Distribuição ou Armazém)"
  ],
  "Troca de Turno Frota": [
    "Disponibilidade de Frota",
    "% de Caminhões abastecidos",
    "Média de Consumo",
    "% Caminhões Lavados",
    "% Caminhões Calibrados",
    "Estratificação do check list",
    "Corretiva na Liberação - Impacto TML D-0",
    "Caminhões/ Empilhadeiras em Corretiva",
    "Caminhões/ Empilhadeiras em Preventiva",
    "Socorro em rota"
  ],
  "RPS Frota": [
    "Disponibilidade de Frota",
    "Média de Consumo e % de Caminhões Abastecidos",
    "N° de Caminhões Lavados",
    "Aderência ao Cronograma de Preventivas",
    "Corretivas e Checklist",
    "Socorro em rota",
    "Multas",
    "Gestão de Peças",
    "Pneus",
    "Calibragem e Milimetragem"
  ],
  "MPR Distribuição": [
    "% Atingimento de Metas Área",
    "Pessoas Abaixo de 65%",
    "Jornada Líquida (TML/ TR/ TI)",
    "Aderência ao Tracking/Foxtrot",
    "CDP/OTIF - sem falta",
    "Devolução PDV",
    "Devolução HL",
    "DQI",
    "Meu Cliente / Bees",
    "Rating",
    "TLP",
    "Caixa Viagem",
    "Utilização TT",
    "ICV/ICE",
    "IV Crítico"
  ],
  "Planejamento Diário Rota": [
    "TML (min e %) D0",
    "TR (min e %) Previsto",
    "Previsão de Jornada Líquida",
    "% recargas",
    "Disponibilidade",
    "Jornada líquida",
    "Disp KM",
    "Disp Tempo",
    "Aderência Foxtrot",
    "Devolução PDV",
    "IV crítico"
  ],
  "RPS Distribuição": [
    "TO",
    "Absenteísmo",
    "Rotinas OBZ Rota (Quinzenal)",
    "TML (pareto de motivos) + TI (aberto fis e fin)",
    "TR",
    "4a) Dispersão de KM",
    "4b) Dispersão de Tempo",
    "4c) Telemetria",
    "4d) PNP's",
    "4e) Repasses",
    "4f) Tempos de Entrega (Espera + Descarga)",
    "Tracking e Foxtrot",
    "Devolução PDV e HL + DQI",
    "TLP e TTP + Fator Ajudante",
    "Caixa Viagem",
    "SAC SAVs + n° de reposições e trocas",
    "Utilização",
    "Rating",
    "On Time",
    "Prontuário do motorista",
    "Disp. KM",
    "Disp. Tempo",
    "Devolução PDV (Logística)",
    "Cx Viagem FF e Spot"
  ],
  "Pré Team Room Distribuição": [
    "GEROT com todos os KPI's da área (Distribuição ou Armazém)"
  ],
  "Team Room Mensal Distribuição": [
    "GEROT com todos os KPI's da área (Distribuição ou Armazém)"
  ],
  "Reunião de Segurança": [
    "SIF/LTI/TRI",
    "Relatos de Segurança",
    "Multas - aplicação da MDT",
    "Telemetria",
    "Status Frota Legal",
    "GSD/GSA",
    "Treinamento",
    "GSP",
    "Excessos de peso"
  ],
  "Reunião DPO": [
    "Caixa / Homem / Hora",
    "Caixa / Viagem",
    "% Utilização",
    "Devolução Hl",
    "CDP",
    "ICV - Volume For a de Faixa",
    "Warehouse Quality Index",
    "WNP",
    "WNP Empilhadeira",
    "LTI",
    "TRI",
    "TO",
    "Absenteísmo"
  ]
};

const projectRoot = process.cwd();
const sourceIndexPath = path.join(projectRoot, "index.html");
const sourceAssetsPath = path.join(projectRoot, "assets");
const distPath = path.join(projectRoot, "dist");
const distServerPath = path.join(distPath, "server");

const textExtensions = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function listFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

async function buildAssetMap() {
  const files = await listFiles(sourceAssetsPath);
  const assets = [];

  const indexHtml = await fs.readFile(sourceIndexPath, "utf8");
  assets.push({
    route: "/",
    kind: "text",
    contentType: "text/html; charset=utf-8",
    body: indexHtml
  });
  assets.push({
    route: "/index.html",
    kind: "text",
    contentType: "text/html; charset=utf-8",
    body: indexHtml
  });

  for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath).split(path.sep).join("/");
    const route = `/${relativePath}`;
    const contentType = contentTypeFor(filePath);

    if (textExtensions.has(path.extname(filePath).toLowerCase())) {
      assets.push({
        route,
        kind: "text",
        contentType,
        body: await fs.readFile(filePath, "utf8")
      });
      continue;
    }

    assets.push({
      route,
      kind: "base64",
      contentType,
      body: (await fs.readFile(filePath)).toString("base64")
    });
  }

  return assets.sort((left, right) => left.route.localeCompare(right.route));
}

async function buildPendingSharedActionImport() {
  const files = Array.from({ length: 11 }, (_, index) => path.join(sourceAssetsPath, "js", `imported-action-history-pending-${String(index + 1).padStart(2, "0")}.js`));
  const parts = await Promise.all(files.map(async (file) => {
    const source = await fs.readFile(file, "utf8");
    const match = source.match(/=\s*([\s\S]*);\s*$/);
    if (!match) throw new Error(`Não foi possível ler a importação central: ${file}`);
    return JSON.parse(match[1]);
  }));
  return parts.flat().map((item) => ({ ...item, importKey: `retry20260904v2-row-${item.sourceRow}` }));
}

function renderServerModule(assets, sharedActionImport) {
  const serializedAssets = JSON.stringify(assets);
  const serializedAuditActions = JSON.stringify(AUDIT_ACTIONS);
  const serializedMeetingSubjectSeed = JSON.stringify(SHARED_MEETING_SUBJECT_SEED);
  const serializedSharedActionImport = JSON.stringify(sharedActionImport);
  const serializedCentralMeetingSubjectSeed = JSON.stringify({"RPS Distribuição":["Atrasos","TML (pareto de motivos) + TI (aberto fis e fin)","TR","Aderência ao BEES","Devolução PDV","Devolução HL","On Time","Jornada Líquida"],"Pré e Pós Inventário_SPO + DPO":["DIF. DE ESTOQUE PA/AG"],"Reunião de Segurança":["GSD/GSA","Relatos de Segurança","Controle de multas","Prontuário do condutor - gestão CNH","Treinamento","Gestão de ASOs","Gestão no trajeto"],"Team Room God":["ILUMINAÇÃO NO ARMAZÉM","Relatos de Segurança","IV CRÍTICO -  ADERÊNCIA A MATRIZ DE PRIORIZAÇÃO","RETORNO DE ROTA","OTIF","MANUTENÇÃO DE PALETEIRAS","DISPONIBILIZAR 5 EMPILHADEIRAS","RONDA DE QUALIDADE","JORNADA LÍQUIDA","BLITZ DE CARREGAMENTO"],"Reunião DPO":["GOP"],"MPR Armazém_Controle":["RV Equipe de Armazém","Alerta de Qualidade","Erro de Carregamento","Atrasos","Quebras","CDP Falta de Produto","Aderência ao GSDP","Refugo"],"RPS Armazém_Controle":["Atrasos","Quebras","Matriz de Priorização","FEFO","OOR"],"MPR Distribuição":["Absenteísmo","Atrasos","Meu Cliente / Bees","Utilização TT"]});

  return `const assets = new Map(${serializedAssets}.map((entry) => [entry.route, entry]));
const auditActionSeed = ${serializedAuditActions};
const auditSeedVersion = 1;
const meetingSubjectSeed = ${serializedMeetingSubjectSeed};
const meetingSubjectSeedVersion = ${SHARED_MEETING_SUBJECT_SEED_VERSION};
const sharedActionImportSeed = ${serializedSharedActionImport};
const centralMeetingSubjectSeed = ${serializedCentralMeetingSubjectSeed};
const sharedActionImportBatch = "missing-registration-retry-20260904-v2";

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function cacheControlFor(route) {
  if (route === "/" || route.endsWith(".html")) {
    return "no-cache";
  }

  return "no-cache";
}

function buildResponse(asset) {
  if (!asset) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers({
    "content-type": asset.contentType,
    "cache-control": cacheControlFor(asset.route)
  });

  const body = asset.kind === "base64" ? decodeBase64(asset.body) : asset.body;
  return new Response(body, { status: 200, headers });
}

export class Presence {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const now = Date.now();
    const current = (await this.state.storage.get("users")) || [];
    const users = current.filter((item) => now - Number(item.lastSeenAt || 0) < 90000);
    const events = ((await this.state.storage.get("events")) || [])
      .filter((item) => now - Number(item.occurredAt || 0) < 60000);

    if (request.method === "POST") {
      const body = await request.json();
      if (!body || !body.userId || !body.name || !body.module) {
        return Response.json({ error: "Presença inválida." }, { status: 400 });
      }
      const entry = {
        userId: String(body.userId),
        name: String(body.name).slice(0, 120),
        module: String(body.module).slice(0, 80),
        lastSeenAt: now
      };
      const previous = users.find((item) => item.userId === entry.userId);
      const next = users.filter((item) => item.userId !== entry.userId);
      next.push(entry);
      if (!previous || previous.module !== entry.module) {
        events.push({ ...entry, occurredAt: now });
      }
      await this.state.storage.put("users", next);
      await this.state.storage.put("events", events);
      return Response.json({ users: next, events });
    }

    await this.state.storage.put("users", users);
    await this.state.storage.put("events", events);
    return Response.json({ users, events });
  }
}

export class AuditStore {
  constructor(state) {
    this.state = state;
    this.ready = state.blockConcurrencyWhile(() => this.ensureSeeded());
  }

  async ensureSeeded() {
    const storedVersion = Number((await this.state.storage.get("seedVersion")) || 0);
    const current = (await this.state.storage.get("actions")) || [];
    if (storedVersion >= auditSeedVersion && current.length) return;

    const currentById = new Map(current.map((item) => [Number(item.id), item]));
    const merged = auditActionSeed.map((seed) => {
      const persisted = currentById.get(Number(seed.id));
      return persisted ? { ...seed, ...persisted } : { ...seed, updatedAt: null, updatedBy: null };
    });
    await this.state.storage.put("actions", merged);
    await this.state.storage.put("seedVersion", auditSeedVersion);
  }

  async fetch(request) {
    await this.ready;
    const username = String(request.headers.get("x-lead-username") || "").trim();
    const role = String(request.headers.get("x-lead-role") || "").trim();
    const teamEditor = ["Diego", "Nathan", "Iago", "Ruan"].includes(username);
    const actions = (await this.state.storage.get("actions")) || [];

    if (request.method === "GET") {
      return Response.json({ items: actions, syncedAt: new Date().toISOString() });
    }

    if (request.method !== "PATCH") {
      return Response.json({ error: "Método não permitido." }, { status: 405 });
    }

    const body = await request.json();
    const action = actions.find((item) => Number(item.id) === Number(body?.actionId));
    if (!action) return Response.json({ error: "Ação não encontrada." }, { status: 404 });
    const nextStatus = String(body?.status || "");
    const adminClose = role === "admin" && nextStatus === "done" && action.status !== "done";
    if (!username || (!teamEditor && action.username !== username && !adminClose)) {
      return Response.json({ error: "Você não possui permissão para movimentar esta ação." }, { status: 403 });
    }

    const allowed = (action.status === "pending" && nextStatus === "in_progress")
      || (action.status === "in_progress" && nextStatus === "done")
      || adminClose;
    if (!allowed) return Response.json({ error: "Transição de status inválida." }, { status: 409 });

    action.status = nextStatus;
    action.updatedAt = new Date().toISOString();
    action.updatedBy = username;
    await this.state.storage.put("actions", actions);
    return Response.json({ item: action, syncedAt: action.updatedAt });
  }
}

function normalizeUsername(username) {
  return String(username || "").trim().toLocaleLowerCase("pt-BR");
}

function sourceUser(username) {
  const source = assets.get("/assets/js/api.js")?.body || "";
  const requested = normalizeUsername(username);
  if (!requested) return null;
  if (requested === "gabriely") {
    const hash = /PASSWORD_HASH_GABY0739\\s*=\\s*"([a-f0-9]{64})"/i.exec(source)?.[1];
    return hash ? { username: "Gabriely", role: "admin", hash } : null;
  }

  const tuplePattern = /\\["[^"]+",\\s*"([^"]+)",\\s*"([a-f0-9]{64})"/gi;
  for (const match of source.matchAll(tuplePattern)) {
    if (normalizeUsername(match[1]) === requested) {
      return { username: match[1], role: "operator", hash: match[2] };
    }
  }

  const objectPattern = /username:\\s*"([^"]+)"([\\s\\S]{0,1200}?)passwordHash:\\s*"([a-f0-9]{64})"/gi;
  for (const match of source.matchAll(objectPattern)) {
    if (normalizeUsername(match[1]) === requested) {
      const role = /role:\\s*"([^"]+)"/i.exec(match[2])?.[1] || "operator";
      return { username: match[1], role, hash: match[3] };
    }
  }

  return null;
}
async function passwordHash(password) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(password || ""))); return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join(""); }

export class SharedStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ready = state.blockConcurrencyWhile(async () => { await this.ensureMeetingSubjects(); await this.ensureSharedActionImport(); });
  }
  applyMeetingSubjects(data) {
    if (!data || !Array.isArray(data.meetings)) return false;
    let changed = false;
    const subjectEntries = new Map(Object.entries(meetingSubjectSeed));
    for (const [title, subjects] of Object.entries(centralMeetingSubjectSeed)) {
      subjectEntries.set(title, [...new Set([...(subjectEntries.get(title) || []), ...subjects])]);
    }
    for (const [title, subjects] of subjectEntries) {
      const meeting = data.meetings.find((item) => String(item?.title || "") === title);
      if (!meeting) continue;
      const current = Array.isArray(meeting.subjects) ? meeting.subjects : [];
      const merged = Array.from(new Set([...current, ...subjects]));
      if (merged.length !== current.length) {
        meeting.subjects = merged;
        changed = true;
      }
    }
    return changed;
  }
  async ensureMeetingSubjects() {
    const data = (await this.state.storage.get("data")) || null;
    if (!this.applyMeetingSubjects(data)) return;
    await this.state.storage.put("data", data);
    await this.state.storage.put("meetingSubjectSeedVersion", meetingSubjectSeedVersion);
  }
  applySharedActionImport(data) {
    if (!data || !Array.isArray(data.meetings)) return false;
    data.actionPlans = Array.isArray(data.actionPlans) ? data.actionPlans : [];
    data.sequence = data.sequence && typeof data.sequence === "object" ? data.sequence : {};
    const keys = new Set(data.actionPlans.map((x)=>String(x?.legacyImportKey||"")).filter(Boolean));
    const sourceRows = new Set(data.actionPlans.map((x)=>Number(x?.legacySourceRow||0)).filter(Boolean));
    let nextId = Math.max(Number(data.sequence.actionPlans || 0), 0, ...data.actionPlans.map((x)=>Number(x?.id||0)));
    let changed = false, imported = 0;
    for (const item of sharedActionImportSeed) {
      const meeting = data.meetings.find((m) =>
        Number(m?.templateId || 0) === Number(item.meetingTemplateId || 0) ||
        String(m?.title || "") === String(item.meetingTitle || "")
      );
      if (!meeting || !(Array.isArray(meeting.subjects)?meeting.subjects:[]).includes(item.meetingSubject)) continue;
      const dueDate = item.dueDate || item.openedAt || "2026-01-01";
      const probe = {
        meetingTitle: meeting.title,
        meetingSubject: item.meetingSubject,
        requesterName: item.requesterName,
        legacyOwnerName: item.ownerName,
        objective: item.objective,
        dueDate
      };
      if (keys.has(String(item.importKey)) || sourceRows.has(Number(item.sourceRow))) continue;
      nextId += 1;
      const openedAt = item.openedAt || "2026-01-01";
      const executionDate = item.executionDate || openedAt;
      const action = {
        id: nextId,
        title: item.meetingSubject,
        objective: item.objective,
        status: "done",
        priority: item.priority || "medium",
        companyId: 0,
        unitId: 0,
        ownerId: Number(item.ownerId || 0),
        requesterId: 0,
        requesterName: item.requesterName,
        legacyOwnerName: item.ownerName,
        createdBy: 1,
        dueDate,
        meetingId: Number(meeting.id || 0),
        meetingTitle: meeting.title,
        meetingSubject: item.meetingSubject,
        meetingExecutionDate: executionDate,
        source: "legacy_excel",
        sourceLabel: "ACOES_NAO_IMPORTADAS_POR_FALTA_DE_CADASTRO(1).xlsx",
        legacySourceRow: Number(item.sourceRow || 0),
        legacyStatus: item.sourceStatus,
        legacyImportBatch: sharedActionImportBatch,
        legacyImportKey: item.importKey,
        createdAt: openedAt + "T12:00:00.000Z",
        updatedAt: openedAt + "T12:00:00.000Z",
        completedAt: executionDate + "T12:00:00.000Z"
      };
      data.actionPlans.push(action);
      keys.add(String(item.importKey));
      sourceRows.add(Number(item.sourceRow));
      changed = true;
      imported += 1;
      if (imported >= 75) break;
    }
    if (changed) data.sequence.actionPlans = nextId;
    return changed;
  }
  async ensureSharedActionImport() {
    const data = (await this.state.storage.get("data")) || null;
    if (!this.applySharedActionImport(data)) return;
    await this.state.storage.put("data", data);
  }
  async session(request) { const token = String(request.headers.get("authorization") || "").replace(/^Bearer\\s+/i, ""); const sessions = (await this.state.storage.get("sessions")) || {}; const claim = sessions[token]; return claim && Number(claim.expiresAt) > Date.now() ? claim : null; }
  async fetch(request) {
    await this.ready;
    await this.ensureMeetingSubjects();
    await this.ensureSharedActionImport();
    const path = new URL(request.url).pathname;
    if (path === "/api/session") {
      const body = await request.json().catch(() => ({})), user = sourceUser(body?.username);
      if (!user || user.hash !== await passwordHash(body?.password)) return Response.json({ error: "Credenciais inválidas." }, { status: 401 });
      const sessions = (await this.state.storage.get("sessions")) || {}, token = crypto.randomUUID() + crypto.randomUUID();
      sessions[token] = { username: user.username, role: user.role, expiresAt: Date.now() + 43200000 };
      await this.state.storage.put("sessions", sessions);
      return Response.json({ token });
    }
    if (path === "/api/shared-view") {
      if (request.method !== "GET") return Response.json({ error: "Método não permitido." }, { status: 405 });
      const data = (await this.state.storage.get("data")) || null;
      const fields = ["actionPlans", "meetings", "gerotWarehouse", "gerotAdditionalAreas", "meta"];
      const view = data ? Object.fromEntries(fields.filter((field) => field in data).map((field) => [field, data[field]])) : null;
      return Response.json({ data: view });
    }
    if (path === "/api/gerot-overrides" && request.method === "GET") {
      return Response.json({ store: (await this.state.storage.get("gerotOverrides")) || {} });
    }
    const claim = await this.session(request);
    if (!claim) return Response.json({ error: "Sessão inválida." }, { status: 401 });

    if (path === "/api/audit-actions") {
      const headers = new Headers(request.headers);
      headers.set("x-lead-username", claim.username);
      headers.set("x-lead-role", claim.role);
      return this.env.AUDIT_STORE.getByName("lead-gestao-audit-actions").fetch(new Request(request, { headers }));
    }
    if (path === "/api/shared-data") {
      if (request.method === "GET") return Response.json({ data: (await this.state.storage.get("data")) || null });
      if (request.method !== "PUT") return Response.json({ error: "Método não permitido." }, { status: 405 });
      const body = await request.json().catch(() => ({}));
      if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) return Response.json({ error: "Dados inválidos." }, { status: 400 });
      this.applyMeetingSubjects(body.data);
      this.applySharedActionImport(body.data);
      await this.state.storage.put("data", body.data);
      return Response.json({ success: true });
    }
    if (path === "/api/gerot-overrides") {
      if (request.method === "GET") return Response.json({ store: (await this.state.storage.get("gerotOverrides")) || {} });
      if (request.method !== "PATCH") return Response.json({ error: "Método não permitido." }, { status: 405 });
      if (claim.role !== "admin") return Response.json({ error: "Somente o ADM pode alterar indicadores do GEROT." }, { status: 403 });
      const body = await request.json().catch(() => ({}));
      if (!body?.store || typeof body.store !== "object" || Array.isArray(body.store)) return Response.json({ error: "Dados inválidos." }, { status: 400 });
      await this.state.storage.put("gerotOverrides", body.store);
      return Response.json({ store: body.store });
    }
    return Response.json({ error: "Endpoint não encontrado." }, { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname || "/";

    if (pathname === "/api/presence") {
      const presence = env.PRESENCE.getByName("lead-gestao-presence");
      return presence.fetch(request);
    }

    if (pathname === "/api/session" || pathname === "/api/shared-data" || pathname === "/api/shared-view" || pathname === "/api/gerot-overrides" || pathname === "/api/audit-actions") {
      return env.SHARED_STORE.getByName("lead-gestao-shared-store").fetch(request);
    }



    const asset = assets.get(pathname);

    if (asset) {
      return buildResponse(asset);
    }

    if (!pathname.includes(".")) {
      return buildResponse(assets.get("/"));
    }

    return buildResponse(null);
  }
};
`;
}

await fs.rm(distPath, { recursive: true, force: true });
await fs.mkdir(distServerPath, { recursive: true });

const assets = await buildAssetMap();
const sharedActionImport = await buildPendingSharedActionImport();
const serverModule = renderServerModule(assets, sharedActionImport);

await fs.writeFile(path.join(distServerPath, "index.js"), serverModule, "utf8");
