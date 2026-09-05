import { promises as fs } from "node:fs";
import path from "node:path";

const serverPath = path.join(process.cwd(), "dist", "server", "index.js");
let source = await fs.readFile(serverPath, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Patch DTO não encontrou o ponto esperado: ${label}`);
  }
  source = source.replace(search, replacement);
}

replaceOnce(
  'async function withCentralImport(state, data) {',
  `async function dtoApplicationsFor(state) {
  const ids = (await state.storage.get("dtoApplicationIds")) || [];
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => state.storage.get("dtoApplication:" + id)));
  return records.filter(Boolean);
}

async function withCentralImport(state, data) {`,
  "leitura compartilhada"
);

replaceOnce(
  'const actionSequence = Math.max(Number(data.sequence?.actionPlans || 0), ...activeLive.filter((item) => item.source !== "legacy_excel").map((item) => Number(item.id) || 0)); return { ...data,',
  'const actionSequence = Math.max(Number(data.sequence?.actionPlans || 0), ...activeLive.filter((item) => item.source !== "legacy_excel").map((item) => Number(item.id) || 0)); const dtoApplications = await dtoApplicationsFor(state); const dtoById = new Map((Array.isArray(data.dtoRecords) ? data.dtoRecords : []).map((item) => [Number(item.id), item])); dtoApplications.forEach((item) => dtoById.set(Number(item.id), item)); const dtoSequence = Math.max(Number(data.sequence?.dtoRecords || 0), 0, ...[...dtoById.keys()].filter(Number.isFinite)); return { ...data,',
  "composição dos DTOs"
);

replaceOnce(
  'sequence: { ...(data.sequence || {}), actionPlans: actionSequence },',
  'sequence: { ...(data.sequence || {}), actionPlans: actionSequence, dtoRecords: dtoSequence },',
  "sequência DTO"
);

replaceOnce(
  'actionPlans: [...byId.values()], notifications }; }',
  'actionPlans: [...byId.values()], dtoRecords: [...dtoById.values()], notifications }; }',
  "retorno DTO"
);

replaceOnce(
  '    if (path === "/api/shared-data") {',
  `    if (path === "/api/dto-applications") {
      if (request.method === "GET") return Response.json({ items: await dtoApplicationsFor(this.state) });
      if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
      const body = await request.json().catch(() => ({}));
      const item = body?.item;
      if (!item || typeof item !== "object" || !String(item.dtoTemplateId || "").trim() || !String(item.applicationDate || "").trim() || !Number(item.applicatorId) || !String(item.employeeName || "").trim()) {
        return Response.json({ error: "Dados obrigatórios do DTO não foram informados." }, { status: 400 });
      }
      const applicationDate = String(item.applicationDate);
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(applicationDate)) return Response.json({ error: "Data de aplicação inválida." }, { status: 400 });
      const existingApplications = await dtoApplicationsFor(this.state);
      const syncId = String(item.syncId || "").trim();
      if (syncId) {
        const duplicate = existingApplications.find((record) => String(record?.syncId || "") === syncId);
        if (duplicate) return Response.json({ success: true, item: duplicate });
      }
      const data = (await this.state.storage.get("data")) || {};
      const baseDtos = Array.isArray(data.dtoRecords) ? data.dtoRecords : [];
      const ids = (await this.state.storage.get("dtoApplicationIds")) || [];
      const nextId = Math.max(Number(data.sequence?.dtoRecords || 0), 0, ...baseDtos.map((record) => Number(record?.id || 0)), ...ids.map((id) => Number(id || 0))) + 1;
      const dueDate = new Date(applicationDate + "T12:00:00Z");
      dueDate.setUTCDate(dueDate.getUTCDate() + 60);
      const nextDueDate = dueDate.toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const record = {
        ...item,
        id: nextId,
        syncId: syncId || crypto.randomUUID(),
        recordType: "dto_application",
        recurrenceDays: 60,
        nextDueDate,
        applicatorId: Number(item.applicatorId),
        ownerId: Number(item.applicatorId),
        applicatorName: String(item.applicatorName || "").trim().slice(0, 160),
        employeeName: String(item.employeeName || "").trim().slice(0, 160),
        title: String(item.title || item.dtoName || "DTO").trim().slice(0, 200),
        dtoName: String(item.dtoName || item.title || "DTO").trim().slice(0, 200),
        answers: Array.isArray(item.answers) ? item.answers.slice(0, 200) : [],
        actionPlan: String(item.actionPlan || "").trim().slice(0, 5000),
        complianceRate: Math.max(0, Math.min(100, Number(item.complianceRate) || 0)),
        nokCount: Math.max(0, Number(item.nokCount) || 0),
        status: "completed",
        source: "dto_module",
        createdAt: now,
        updatedAt: now,
        createdByUsername: claim.username
      };
      await this.state.storage.put("dtoApplication:" + nextId, record);
      await this.state.storage.put("dtoApplicationIds", [...ids, nextId]);
      return Response.json({ success: true, item: record });
    }
    if (path === "/api/shared-data") {`,
  "endpoint DTO"
);

replaceOnce(
  '|| pathname === "/api/audit-actions") {',
  '|| pathname === "/api/audit-actions" || pathname === "/api/dto-applications") {',
  "roteamento DTO"
);

await fs.writeFile(serverPath, source, "utf8");
