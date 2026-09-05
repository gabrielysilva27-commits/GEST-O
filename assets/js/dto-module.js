import { state } from "./state.js";
import { syncOperationalData } from "./shared-api.js?v=20260905-11";

const DB_KEY = "lead-gestao-db-v2";
const SYNC_TOKEN_KEY = "lead-gestao-sync-token";
const RECURRENCE_DAYS = 60;
const TEMPLATES = [{
  id: "qualidade",
  name: "DTO - QUALIDADE",
  description: "Diagnóstico de aderência ao padrão de qualidade no manuseio, transporte e descarga de produtos.",
  questions: [
    ["q2", "2 - Os pallets estão montados de forma que respeitem a ordem demais leves em cima e mais pesados embaixo?"],
    ["q3", "3 - Carrinhos estão sendo transportados no suporte adequado fora das baias e eles estão em bom estado de uso?"],
    ["q4", "4 - Equipe identifica possíveis riscos durante o trajeto que possa aumentar o risco de avaria dos produtos? (buracos, lombadas, guias, etc.)"],
    ["q5", "5 - No processo de descarga de produto, equipe checa se existe algum produto avariado e segrega o mesmo dos demais?"],
    ["q7", "7 - A equipe manuseia corretamente os produtos, não a embalagem secundária dos fardos para manuseio?"],
    ["q8", "8 - Equipe conhece quis os motivos para refugo de garrafa e executa a atividade conforme padrão?"],
    ["q9", "9 - Equipe manuseia as caixas de vasilhame segurando as duas alças juntas?"],
    ["q10", "10 - Em casa de necessidade de apoio do produto no chão, a equipe utiliza papelão ou chapatex para apoio?"],
    ["q11", "11 - Equipe utiliza a plataforma para apoio de mais de 1 caixa por vez?"],
    ["q12", "12 - Em casa de baldeio de produto, equipe segue o padrão de 1 garrafa por mão e não bate as garrafas de forma a aumentar o risco de estouro?"],
    ["q14", "14 - A equipe sabe informar quais são os motivos de devolução 81 (produto danificado/falta) e 55 (qualidade do produto) e quando cada um deve ser utilizado?"],
    ["q15", "15 - Na descarga dos produtos a equipe manuseia corretamente os produtos no carrinho?"],
    ["q16", "16 - Em caso de chuva, produtos one way foram expostos e molhados durante manuseio?"],
    ["q17", "17 - Os produtos foram expostos ao sol por longo tempo? (Considerar longo tempo acima de 30 minutos)"]
  ].map(([id, label]) => ({ id, label }))
}];

const esc = (v = "") => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const root = () => document.querySelector("#page-content");
const read = () => { try { return JSON.parse(localStorage.getItem(DB_KEY) || "null"); } catch { return null; } };
const write = (data) => localStorage.setItem(DB_KEY, JSON.stringify(data));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const date = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? new Date(`${v}T12:00:00`) : null;
const fmt = (v) => { const d = date(v); return d ? `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}` : "—"; };
const addDays = (v, n) => { const d = date(v); if (!d) return ""; d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const daysUntil = (v) => { const a = date(v), b = date(today()); return a && b ? Math.round((a-b)/86400000) : null; };

function shortPersonName(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  const formatPart = (part = "") => {
    const lower = String(part).toLocaleLowerCase("pt-BR");
    return lower ? lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1) : "";
  };
  if (!parts.length) return "";
  if (parts.length === 1) return formatPart(parts[0]);
  return `${formatPart(parts[0])} ${formatPart(parts[parts.length - 1])}`;
}

const users = () => (read()?.users || [])
  .filter((u) => (u.status || "active") === "active")
  .sort((a,b) => shortPersonName(a.name || a.username).localeCompare(shortPersonName(b.name || b.username), "pt-BR"));
const applications = () => (read()?.dtoRecords || []).filter((r) => r?.recordType === "dto_application" && r.dtoTemplateId);
const latest = (id) => applications().filter((r) => String(r.dtoTemplateId) === String(id)).sort((a,b) => String(b.applicationDate || b.createdAt || "").localeCompare(String(a.applicationDate || a.createdAt || "")))[0] || null;
const responsibleName = (record) => shortPersonName(record?.applicatorName || users().find((u) => Number(u.id) === Number(record?.applicatorId || record?.ownerId))?.name || "") || "—";

function deadline(record) {
  if (!record) return { due: "", text: "Pendente", cls: "pending" };
  const due = record.nextDueDate || addDays(record.applicationDate, RECURRENCE_DAYS);
  const left = daysUntil(due);
  if (left < 0) return { due, text: `Vencido há ${Math.abs(left)} dia${Math.abs(left) === 1 ? "" : "s"}`, cls: "overdue" };
  if (left === 0) return { due, text: "Vence hoje", cls: "due" };
  return { due, text: `${left} dia${left === 1 ? "" : "s"} para vencer`, cls: left <= 10 ? "due" : "ok" };
}

function dashboard() {
  const rows = TEMPLATES.map((t) => {
    const last = latest(t.id), dl = deadline(last);
    return `<tr><td><strong>${esc(t.name)}</strong><small>${esc(t.description)}</small></td><td>${last ? esc(fmt(last.applicationDate)) : "Nunca aplicado"}</td><td>${last ? esc(responsibleName(last)) : "—"}</td><td>${last ? esc(last.employeeName || "—") : "—"}</td><td>${last ? esc(fmt(dl.due)) : "—"}</td><td><span class="dto-badge ${dl.cls}">${esc(dl.text)}</span></td></tr>`;
  }).join("");
  return `<section class="dto-view" data-dto-view>
    <div class="dto-head"><div><span class="eyebrow">Diagnóstico de Tarefa Operacional</span><h2>Controle de aplicação dos DTOs</h2><p>Todo DTO deve ser reaplicado a cada ${RECURRENCE_DAYS} dias, independentemente do funcionário avaliado.</p></div><button class="button primary" type="button" data-dto-apply>Aplicar DTO</button></div>
    <section class="stats-grid">${TEMPLATES.map((t) => { const dl = deadline(latest(t.id)); return `<article class="metric-card"><span class="eyebrow">${esc(t.name)}</span><strong>${latest(t.id) ? esc(fmt(dl.due)) : "Pendente"}</strong><p>${esc(dl.text)}</p></article>`; }).join("")}</section>
    <section class="table-card"><h2>Prazos de vencimento</h2><p>O prazo é calculado automaticamente pela última aplicação de cada DTO.</p><div class="table-scroll"><table class="dto-table"><thead><tr><th>DTO</th><th>Aplicação</th><th>Responsável</th><th>Funcionário</th><th>Próximo vencimento</th><th>Dias a vencer</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  </section>`;
}

function userOptions() {
  return users().map((u) => `<option value="${esc(u.id)}" ${Number(u.id) === Number(state.user?.id) ? "selected" : ""}>${esc(shortPersonName(u.name || u.username))}</option>`).join("");
}

function chooseDto() {
  return `<section class="dto-view" data-dto-view><div class="dto-head"><div><span class="eyebrow">Aplicar DTO</span><h2>Selecione o DTO</h2><p>Escolha o diagnóstico que será aplicado.</p></div><button class="button secondary" type="button" data-dto-back>Voltar</button></div><div class="dto-list">${TEMPLATES.map((t) => `<article class="panel-card"><span class="badge info">${t.questions.length} perguntas</span><h2>${esc(t.name)}</h2><p>${esc(t.description)}</p><button class="button primary" type="button" data-dto-select="${esc(t.id)}">Aplicar este DTO</button></article>`).join("")}</div></section>`;
}

function applyForm(template) {
  const qs = template.questions.map((q, i) => `<div class="dto-question"><p><b>${String(i+1).padStart(2,"0")}</b>${esc(q.label)}</p><div><label><input type="radio" name="answer_${esc(q.id)}" value="OK" required><span>OK</span></label><label><input type="radio" name="answer_${esc(q.id)}" value="NOK" required><span>NOK</span></label></div></div>`).join("");
  return `<section class="dto-view" data-dto-view><div class="dto-head"><div><span class="eyebrow">Aplicação</span><h2>${esc(template.name)}</h2><p>Informe os dados e responda todas as perguntas conforme a execução observada.</p></div><button class="button secondary" type="button" data-dto-back>Voltar</button></div><form class="stack" data-dto-form data-template="${esc(template.id)}"><section class="panel-card"><div class="form-grid"><label class="field"><span>Data da aplicação</span><input type="date" name="applicationDate" value="${today()}" max="${today()}" required></label><label class="field"><span>Responsável pela aplicação</span><select name="applicatorId" required><option value="">Selecionar usuário</option>${userOptions()}</select></label><label class="field full"><span>Funcionário</span><input name="employeeName" placeholder="Nome do funcionário avaliado" required></label></div></section><section class="panel-card"><h2>Perguntas do DTO</h2><div class="dto-questions">${qs}</div></section><section class="panel-card"><label class="field"><span>Plano de ação / observações</span><textarea name="actionPlan" rows="4" placeholder="Registre ações para os desvios identificados ou observações da aplicação."></textarea></label><div class="dto-submit"><small>O próximo vencimento será ${RECURRENCE_DAYS} dias após a data informada.</small><button class="button primary" type="submit">Concluir aplicação</button></div></section></form></section>`;
}

let screen = "dashboard";
function render() {
  if (location.hash !== "#dto" || !state.user || !root()) return;
  const template = TEMPLATES.find((t) => t.id === screen);
  root().innerHTML = screen === "choose" ? chooseDto() : template ? applyForm(template) : dashboard();
}

function dtoSyncId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `dto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function saveSharedDto(item) {
  const token = localStorage.getItem(SYNC_TOKEN_KEY);
  if (!token) throw new Error("Sua sessão de sincronização expirou. Saia e entre novamente no LEAD antes de concluir o DTO.");
  let response;
  try {
    response = await fetch("/api/dto-applications", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ item })
    });
  } catch {
    throw new Error("Não foi possível conectar à base compartilhada do DTO.");
  }
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("Sua sessão de sincronização expirou. Saia e entre novamente no LEAD antes de concluir o DTO.");
  if (!response.ok) throw new Error(payload.error || "Não foi possível salvar o DTO na base compartilhada.");
  return payload.item;
}

async function save(form) {
  const template = TEMPLATES.find((t) => t.id === form.dataset.template);
  const applicationDate = form.elements.applicationDate.value;
  const applicatorId = Number(form.elements.applicatorId.value);
  const employeeName = String(form.elements.employeeName.value || "").trim();
  if (!template || !applicationDate || !applicatorId || !employeeName) throw new Error("Preencha todos os dados da aplicação.");
  const answers = template.questions.map((q) => ({ questionId: q.id, question: q.label, result: form.querySelector(`input[name="answer_${CSS.escape(q.id)}"]:checked`)?.value || "" }));
  if (answers.some((a) => !a.result)) throw new Error("Responda todas as perguntas antes de concluir.");

  const synced = await syncOperationalData();
  if (!synced && !localStorage.getItem(SYNC_TOKEN_KEY)) throw new Error("Sua sessão de sincronização expirou. Saia e entre novamente no LEAD antes de concluir o DTO.");
  const db = read();
  if (!db) throw new Error("Não foi possível acessar os dados do DTO.");
  const applicator = users().find((u) => Number(u.id) === applicatorId);
  const ok = answers.filter((a) => a.result === "OK").length;
  const item = {
    syncId: dtoSyncId(),
    recordType: "dto_application",
    dtoTemplateId: template.id,
    dtoName: template.name,
    title: template.name,
    applicationDate,
    nextDueDate: addDays(applicationDate, RECURRENCE_DAYS),
    recurrenceDays: RECURRENCE_DAYS,
    applicatorId,
    applicatorName: shortPersonName(applicator?.name || applicator?.username || ""),
    ownerId: applicatorId,
    employeeName,
    answers,
    actionPlan: String(form.elements.actionPlan.value || "").trim(),
    complianceRate: Math.round(ok / answers.length * 100),
    nokCount: answers.length - ok,
    status: "completed",
    source: "dto_module"
  };

  const saved = await saveSharedDto(item);
  db.dtoRecords = Array.isArray(db.dtoRecords) ? db.dtoRecords.filter((record) => String(record?.syncId || "") !== String(saved.syncId || "")) : [];
  db.dtoRecords.push(saved);
  db.sequence = db.sequence || {};
  db.sequence.dtoRecords = Math.max(Number(db.sequence.dtoRecords || 0), Number(saved.id || 0));
  write(db);
  await syncOperationalData();
}

function click(event) {
  if (location.hash !== "#dto") return;
  if (event.target.closest("[data-dto-apply]")) { screen = "choose"; render(); return; }
  if (event.target.closest("[data-dto-back]")) { screen = "dashboard"; render(); return; }
  const select = event.target.closest("[data-dto-select]");
  if (select) { screen = select.dataset.dtoSelect; render(); }
}

async function submit(event) {
  const form = event.target.closest("[data-dto-form]");
  if (!form || location.hash !== "#dto") return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  button.disabled = true; button.textContent = "Salvando...";
  try { await save(form); screen = "dashboard"; render(); window.alert("DTO aplicado com sucesso. O novo prazo de 60 dias já foi calculado."); }
  catch (error) { window.alert(error?.message || "Não foi possível salvar o DTO."); }
  finally { if (button.isConnected) { button.disabled = false; button.textContent = label; } }
}

function installStyles() {
  if (document.querySelector("style[data-dto-styles]")) return;
  const style = document.createElement("style"); style.dataset.dtoStyles = "";
  style.textContent = `.dto-view{display:grid;gap:12px}.dto-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border:1px solid var(--border);border-radius:8px;background:var(--surface);box-shadow:var(--shadow-soft)}.dto-head h2{margin:2px 0 4px;font-size:1.2rem}.dto-head p{margin:0;color:var(--text-muted);font-size:.78rem}.dto-table{min-width:920px}.dto-table td strong,.dto-table td small{display:block}.dto-table td small{margin-top:3px;color:var(--text-muted);font-size:.62rem}.dto-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:.66rem;font-weight:800}.dto-badge.ok{color:#176f55;background:rgba(23,114,85,.12)}.dto-badge.due{color:#8a5c11;background:rgba(221,166,47,.16)}.dto-badge.overdue{color:var(--danger);background:rgba(192,57,43,.11)}.dto-badge.pending{color:var(--text-muted);background:rgba(105,117,137,.12)}.dto-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.dto-list .panel-card{display:grid;align-content:start;gap:10px}.dto-questions{display:grid;gap:6px;margin-top:10px}.dto-question{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--border);border-radius:8px}.dto-question p{display:flex;gap:8px;margin:0;font-size:.74rem;line-height:1.35}.dto-question p b{color:var(--primary)}.dto-question>div{display:flex;gap:5px}.dto-question label{cursor:pointer}.dto-question input{position:absolute;opacity:0}.dto-question label span{display:inline-grid;place-items:center;min-width:46px;min-height:29px;border:1px solid var(--border);border-radius:7px;font-size:.66rem;font-weight:800}.dto-question input[value=OK]:checked+span{color:#176f55;background:rgba(23,114,85,.12)}.dto-question input[value=NOK]:checked+span{color:var(--danger);background:rgba(192,57,43,.1)}.dto-submit{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.dto-submit small{color:var(--text-muted)}@media(max-width:800px){.dto-head,.dto-submit{align-items:stretch;flex-direction:column}.dto-list{grid-template-columns:1fr}.dto-question{grid-template-columns:1fr}.dto-question>div{justify-content:flex-end}}`;
  document.head.appendChild(style);
}

let queued = false;
const observer = new MutationObserver(() => { if (location.hash !== "#dto" || queued || root()?.querySelector("[data-dto-view]")) return; queued = true; requestAnimationFrame(() => { queued = false; if (!root()?.querySelector("[data-dto-view]")) render(); }); });
function start() { installStyles(); if (root()) observer.observe(root(), { childList: true }); document.addEventListener("click", click, true); document.addEventListener("submit", submit, true); window.addEventListener("hashchange", () => { if (location.hash === "#dto") { screen = "dashboard"; render(); } }); if (location.hash === "#dto") render(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
