import fs from 'node:fs/promises';

const path = 'dist/server/index.js';
let source = await fs.readFile(path, 'utf8');

if (source.includes('RPS_DISTRIBUICAO_OCUPACAO_V1')) {
  console.log('RPS Distribuição já protegida com o assunto Ocupação.');
  process.exit(0);
}

const classMarker = 'var SharedDataStore = class {';
if (!source.includes(classMarker)) {
  throw new Error('SharedDataStore não encontrado no Worker gerado.');
}

const helper = `// RPS_DISTRIBUICAO_OCUPACAO_V1\nfunction normalizeRpsSubjectValue(value) {\n  return String(value || \"\")\n    .normalize(\"NFD\")\n    .replace(/[\\u0300-\\u036f]/g, \"\")\n    .toLocaleLowerCase(\"pt-BR\")\n    .replace(/[^a-z0-9]+/g, \" \" )\n    .trim();\n}\nfunction ensureRpsDistribuicaoOcupacao(data) {\n  const current = data && typeof data === \"object\" ? data : {};\n  const meetings = Array.isArray(current.meetings) ? current.meetings : [];\n  let changed = false;\n  const nextMeetings = meetings.map((meeting) => {\n    if (normalizeRpsSubjectValue(meeting?.title) !== \"rps distribuicao\") return meeting;\n    const subjects = Array.isArray(meeting?.subjects) ? meeting.subjects : [];\n    if (subjects.some((subject) => normalizeRpsSubjectValue(subject) === \"ocupacao\")) return meeting;\n    changed = true;\n    return { ...meeting, subjects: [...subjects, \"Ocupação\"] };\n  });\n  return changed ? { ...current, meetings: nextMeetings } : current;\n}\n`;

source = source.replace(classMarker, `${helper}\n${classMarker}`);

const syncBefore = 'const data = applyAptActionImport(raw);';
const syncAfter = 'const data = ensureRpsDistribuicaoOcupacao(applyAptActionImport(raw));';
if (!source.includes(syncBefore)) {
  throw new Error('Fluxo POST /shared-sync não encontrado.');
}
source = source.replace(syncBefore, syncAfter);

const getBefore = `if (request.method === "GET") {\n      const data = await this.state.storage.get("shared-data") || {};\n      return Response.json({ success: true, data });\n    }`;
const getAfter = `if (request.method === "GET") {\n      const stored = await this.state.storage.get("shared-data") || {};\n      const data = ensureRpsDistribuicaoOcupacao(stored);\n      if (data !== stored) {\n        await this.state.storage.put("shared-data", data);\n      }\n      return Response.json({ success: true, data });\n    }`;
if (!source.includes(getBefore)) {
  throw new Error('Fluxo GET do SharedDataStore não encontrado.');
}
source = source.replace(getBefore, getAfter);

const putBefore = `if (request.method === "PUT") {\n      const payload = await request.json().catch(() => ({}));\n      await this.state.storage.put("shared-data", payload?.data || {});\n      return Response.json({ success: true });\n    }`;
const putAfter = `if (request.method === "PUT") {\n      const payload = await request.json().catch(() => ({}));\n      const data = ensureRpsDistribuicaoOcupacao(payload?.data || {});\n      await this.state.storage.put("shared-data", data);\n      return Response.json({ success: true });\n    }`;
if (!source.includes(putBefore)) {
  throw new Error('Fluxo PUT do SharedDataStore não encontrado.');
}
source = source.replace(putBefore, putAfter);

await fs.writeFile(path, source);
console.log('Assunto Ocupação garantido em RPS Distribuição no armazenamento compartilhado.');
