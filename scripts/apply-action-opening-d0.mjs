// Regra operacional: abertura travada em D0; status do Dashboard deriva de abertura e prazo.
import fs from 'node:fs/promises';

async function patch(path, transform) {
  const source = await fs.readFile(path, 'utf8');
  const next = transform(source);
  if (next !== source) await fs.writeFile(path, next);
}

await patch('assets/js/api.js', (initial) => {
  if (initial.includes('// ACTION_OPENING_D0_V1')) return initial;
  let source = initial;

  const requiredBefore = '  if (!payload?.meetingId || !payload?.subject?.trim() || !payload?.actionPlan?.trim() || !payload?.ownerId || !payload?.executionDate || !payload?.dueDate || !payload?.priority) {';
  const requiredAfter = '  if (!payload?.meetingId || !payload?.subject?.trim() || !payload?.actionPlan?.trim() || !payload?.ownerId || !payload?.dueDate || !payload?.priority) {';
  if (!source.includes(requiredBefore)) throw new Error('Marcador de obrigatoriedade da ação de reunião não encontrado');
  source = source.replace(requiredBefore, requiredAfter);

  const subjectMarker = '  const subject = payload.subject.trim();';
  if (!source.includes(subjectMarker)) throw new Error('Marcador de assunto da ação de reunião não encontrado');
  source = source.replace(subjectMarker, subjectMarker + '\n  // ACTION_OPENING_D0_V1: a abertura é sempre D0 e nunca é informada pelo usuário.\n  const openingDate = futureDateKey(0);');

  const dateBefore = '    meetingExecutionDate: payload.executionDate || "",';
  const dateAfter = '    meetingExecutionDate: openingDate,';
  if (!source.includes(dateBefore)) throw new Error('Marcador da data de execução da ação não encontrado');
  source = source.replace(dateBefore, dateAfter);

  return source;
});

await patch('assets/js/modules/index.js', (initial) => {
  if (initial.includes('// ACTION_OPENING_D0_V1')) return initial;
  let source = initial;

  const dashboardMarker = 'const dashboardFilters = {};';
  if (!source.includes(dashboardMarker)) throw new Error('Marcador do dashboard não encontrado');
  const helpers = `// ACTION_OPENING_D0_V1\nfunction localDateKey(value = new Date()) {\n  if (typeof value === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return value;\n  const date = value instanceof Date ? value : new Date(value);\n  if (Number.isNaN(date.getTime())) return String(value || "").slice(0, 10);\n  return \`${'${date.getFullYear()}'}-${'${String(date.getMonth() + 1).padStart(2, "0")}'}-${'${String(date.getDate()).padStart(2, "0")}'}\`;\n}\n\n`;
  source = source.replace(dashboardMarker, helpers + dashboardMarker);

  const rowBefore = `    const date = String(item.meetingExecutionDate || item.createdAt || "").slice(0, 10);\n    const row = { date, meeting: item.meetingTitle || "Não vinculada", subject: item.meetingSubject || item.title || "Não informado",\n      requester: name(item.requesterId, item.requesterName || item.legacyRequesterName), owner: name(item.ownerId, item.legacyOwnerName),\n      action: item.objective || item.title || "", sector: item.sector || item.department || "Não informado",\n      status: date === today ? "Aberto hoje" : date > today ? "Em andamento" : "Pendente" };`;
  const rowAfter = `    const date = item.source === "meetings"\n      ? localDateKey(item.createdAt || item.meetingExecutionDate || "")\n      : String(item.meetingExecutionDate || localDateKey(item.createdAt || "")).slice(0, 10);\n    const dueDate = String(item.dueDate || "").slice(0, 10);\n    const row = { date, meeting: item.meetingTitle || "Não vinculada", subject: item.meetingSubject || item.title || "Não informado",\n      requester: name(item.requesterId, item.requesterName || item.legacyRequesterName), owner: name(item.ownerId, item.legacyOwnerName),\n      action: item.objective || item.title || "", sector: item.sector || item.department || "Não informado",\n      status: date === today ? "Aberto hoje" : dueDate && dueDate < today ? "Pendente" : "Em andamento" };`;
  if (!source.includes(rowBefore)) throw new Error('Regra antiga de status do dashboard não encontrada');
  source = source.replace(rowBefore, rowAfter);

  const helperBefore = '<p>Aberto hoje: data de hoje. Pendente: data anterior, ainda sem conclusão.</p>';
  const helperAfter = '<p>Aberto hoje: ação criada em D0. Em andamento: ação aberta e dentro do prazo. Pendente: prazo vencido, ainda sem conclusão.</p>';
  if (!source.includes(helperBefore)) throw new Error('Texto explicativo do status do dashboard não encontrado');
  source = source.replace(helperBefore, helperAfter);

  const executionPattern = /<span>Data de execução<\/span>\s*<input type="date" name="executionDate" required>/g;
  const executionMatches = source.match(executionPattern) || [];
  if (executionMatches.length < 2) throw new Error(`Esperadas ao menos 2 datas de execução no formulário; encontradas ${executionMatches.length}`);
  const lockedOpening = '<span>Data de abertura</span><input type="date" value="${localDateKey()}" disabled aria-label="Data de abertura em D0" title="Data definida automaticamente no dia da abertura"><input type="hidden" name="executionDate" value="${localDateKey()}">';
  source = source.replace(executionPattern, lockedOpening);

  const duePattern = /<input type="date" name="dueDate" data-action-field required>/g;
  const dueMatches = source.match(duePattern) || [];
  if (dueMatches.length < 2) throw new Error(`Esperados ao menos 2 campos de prazo; encontrados ${dueMatches.length}`);
  source = source.replace(duePattern, '<input type="date" name="dueDate" data-action-field min="${localDateKey()}" required>');

  return source;
});

console.log('Data de abertura D0 e regra de status do Dashboard aplicadas.');
