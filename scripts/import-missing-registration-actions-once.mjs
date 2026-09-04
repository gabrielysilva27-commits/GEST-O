import fs from "node:fs";
import zlib from "node:zlib";

const payload = JSON.parse(zlib.inflateSync(Buffer.from("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", "base64")).toString("utf8"));
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
