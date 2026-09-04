import fs from "node:fs";
import zlib from "node:zlib";

const payloadBase64 = [1,2,3,4].map((n) => fs.readFileSync(`scripts/import-payload-${String(n).padStart(2,"0")}.txt`, "utf8").trim()).join("");
const payload = JSON.parse(zlib.inflateSync(Buffer.from(payloadBase64, "base64")).toString("utf8"));
const eligible = payload.eligible;
const failureCombos = payload.failureCombos;
const SITE = "https://lead-gestao.gabrielysilva27.workers.dev";
const BATCH = "missing-registration-retry-20260904";

async function sharedData() {
  let last;
  for (let i=0;i<10;i++) {
    try {
      const r = await fetch(`${SITE}/api/shared-view?check=${Date.now()}`, {cache:"no-store"});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const p = await r.json();
      if (!p?.data || !Array.isArray(p.data.meetings)) throw new Error("Catálogo compartilhado indisponível");
      return p.data;
    } catch (e) {
      last = e;
      await new Promise((resolve)=>setTimeout(resolve,3000));
    }
  }
  throw last || new Error("Falha ao consultar catálogo publicado");
}

const live = await sharedData();
const byTitle = new Map(live.meetings.map((m)=>[String(m?.title||""),m]));
for (const item of eligible) {
  const m = byTitle.get(item.meetingTitle);
  if (!m || !(Array.isArray(m.subjects)?m.subjects:[]).includes(item.meetingSubject)) {
    throw new Error(`Ação marcada como elegível deixou de atender ao cadastro: ${item.meetingTitle} :: ${item.meetingSubject}`);
  }
}
const newlyEligibleFailureCombos = failureCombos.filter(([title, subject]) => {
  const m = byTitle.get(title);
  return m && (Array.isArray(m.subjects)?m.subjects:[]).includes(subject);
});
if (newlyEligibleFailureCombos.length) {
  throw new Error("Existem assuntos antes não cadastrados que agora estão cadastrados; abortado para não deixar ações elegíveis de fora: " + JSON.stringify(newlyEligibleFailureCombos.slice(0,10)));
}

fs.writeFileSync("scripts/shared-action-import-20260904.mjs",
  "// Generated from ACOES_NAO_IMPORTADAS_POR_FALTA_DE_CADASTRO(1).xlsx after exact cadastro validation.\n" +
  "export const SHARED_ACTION_IMPORT_20260904 = " + JSON.stringify(eligible, null, 2) + ";\n",
  "utf8"
);
fs.writeFileSync("/tmp/import-result.json", JSON.stringify({
  inputCount: 1026,
  eligibleCount: eligible.length,
  failureCount: 982,
  verifiedAgainstPublishedCatalog: true,
  batch: BATCH
}, null, 2));

let build = fs.readFileSync("scripts/build-site.mjs", "utf8");
if (build.includes("SHARED_ACTION_IMPORT_20260904")) throw new Error("Lote já aplicado.");

build = build.replace(
  'import { AUDIT_ACTIONS } from "../assets/js/audit-actions-data.js";',
  'import { AUDIT_ACTIONS } from "../assets/js/audit-actions-data.js";\nimport { SHARED_ACTION_IMPORT_20260904 } from "./shared-action-import-20260904.mjs";'
);
build = build.replace(
  '  const serializedMeetingSubjectSeed = JSON.stringify(SHARED_MEETING_SUBJECT_SEED);',
  '  const serializedMeetingSubjectSeed = JSON.stringify(SHARED_MEETING_SUBJECT_SEED);\n  const serializedSharedActionImport = JSON.stringify(SHARED_ACTION_IMPORT_20260904);'
);
build = build.replace(
  'const meetingSubjectSeedVersion = ${SHARED_MEETING_SUBJECT_SEED_VERSION};\n',
  'const meetingSubjectSeedVersion = ${SHARED_MEETING_SUBJECT_SEED_VERSION};\nconst sharedActionImportSeed = ${serializedSharedActionImport};\nconst sharedActionImportBatch = "missing-registration-retry-20260904";\n'
);
build = build.replace(
  '    this.ready = state.blockConcurrencyWhile(() => this.ensureMeetingSubjects());',
  '    this.ready = state.blockConcurrencyWhile(async () => { await this.ensureMeetingSubjects(); await this.ensureSharedActionImport(); });'
);

const anchor = `  async ensureMeetingSubjects() {
    const data = (await this.state.storage.get("data")) || null;
    if (!this.applyMeetingSubjects(data)) return;
    await this.state.storage.put("data", data);
    await this.state.storage.put("meetingSubjectSeedVersion", meetingSubjectSeedVersion);
  }
`;
if (!build.includes(anchor)) throw new Error("Ponto de inserção do SharedStore não encontrado.");

const extra = `  applySharedActionImport(data) {
    if (!data || !Array.isArray(data.meetings)) return false;
    data.actionPlans = Array.isArray(data.actionPlans) ? data.actionPlans : [];
    data.sequence = data.sequence && typeof data.sequence === "object" ? data.sequence : {};
    const fp = (x) => [
      String(x?.meetingTitle || ""),
      String(x?.meetingSubject || x?.title || ""),
      String(x?.requesterName || ""),
      String(x?.legacyOwnerName || ""),
      String(x?.objective || ""),
      String(x?.dueDate || "")
    ].join("␟");
    const keys = new Set(data.actionPlans.map((x)=>String(x?.legacyImportKey||"")).filter(Boolean));
    const fps = new Set(data.actionPlans.map(fp));
    let nextId = Math.max(Number(data.sequence.actionPlans || 0), 0, ...data.actionPlans.map((x)=>Number(x?.id||0)));
    let changed = false;
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
      if (keys.has(String(item.importKey)) || fps.has(fp(probe))) continue;
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
      fps.add(fp(action));
      changed = true;
    }
    if (changed) data.sequence.actionPlans = nextId;
    return changed;
  }
  async ensureSharedActionImport() {
    const data = (await this.state.storage.get("data")) || null;
    if (!this.applySharedActionImport(data)) return;
    await this.state.storage.put("data", data);
  }
`;

build = build.replace(anchor, anchor + extra);
build = build.replace(
  '    await this.ensureMeetingSubjects();\n    const path = new URL(request.url).pathname;',
  '    await this.ensureMeetingSubjects();\n    await this.ensureSharedActionImport();\n    const path = new URL(request.url).pathname;'
);
build = build.replace(
  '      this.applyMeetingSubjects(body.data);\n      await this.state.storage.put("data", body.data);',
  '      this.applyMeetingSubjects(body.data);\n      this.applySharedActionImport(body.data);\n      await this.state.storage.put("data", body.data);'
);
if (!build.includes("ensureSharedActionImport") || !build.includes("sharedActionImportSeed")) throw new Error("Falha ao preparar importação compartilhada.");
fs.writeFileSync("scripts/build-site.mjs", build, "utf8");
console.log(`VALIDATED input=1026 eligible=${eligible.length} failures=982`);
