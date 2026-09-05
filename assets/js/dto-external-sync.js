import { state } from "./state.js";
import { loadDtoExternalData } from "./dto-external-data.js?v=20260905-01";
import { syncOperationalData } from "./shared-api.js?v=20260905-12";
import { loadDtoExternalData } from "./dto-external-data.js?v=20260905-01";

const DB_KEY = "lead-gestao-db-v2";
const TOKEN_KEY = "lead-gestao-sync-token";
const DELETED_KEY = "lead-dto-external-deleted-v1";
const IMPORT_VERSION = 3;
const IMPORT_PREFIX = "dto1-20260905-row-";
const SHARED_FIELDS = ["companies","units","actionPlans","meetings","gapaRecords","dtoRecords","anomalyReports","tickets","tasks","checklists","safetyReports","trainings","notifications","history","gerotWarehouse","gerotAdditionalAreas","meta"];
let importing = false;
let deleting = false;
let externalData = null;
let EXTERNAL_SEED = [];
let EXTERNAL_KEYS = new Set();

const readDb = () => { try { return JSON.parse(localStorage.getItem(DB_KEY) || "null"); } catch { return null; } };
const writeDb = (data) => localStorage.setItem(DB_KEY, JSON.stringify(data));
const readDeletedKeys = () => { try { const value = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"); return Array.isArray(value) ? value.map(String) : []; } catch { return []; } };
const writeDeletedKeys = (keys) => localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...keys].map(String))]));
const addDays = (value, amount) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T12:00:00`) : null;
  if (!date) return "";
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};
const tokenHeaders = (json = false) => ({
  ...(json ? { "content-type": "application/json" } : {}),
  ...(localStorage.getItem(TOKEN_KEY) ? { authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } : {})
});

function projectShared(data) {
  const output = {};
  for (const field of SHARED_FIELDS) if (field in data) output[field] = data[field];
  output.sequence = Object.fromEntries(Object.entries(data.sequence || {}).filter(([field]) => !["users","sessions","passwordResetRequests"].includes(field)));
  return output;
}

async function putShared(data) {
  const response = await fetch("/api/shared-data", { method: "PUT", headers: tokenHeaders(true), body: JSON.stringify({ data: projectShared(data) }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível gravar os DTOs na base compartilhada.");
  return payload;
}

async function getShared() {
  const response = await fetch("/api/shared-data", { headers: tokenHeaders(), cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível confirmar os DTOs na base compartilhada.");
  return payload.data || null;
}

function buildImportedRecord(row, source) {
  const [sourceRow, templateId, applicationDate, employeeName, resultBits, actionPlan] = row;
  const template = source.templates[templateId];
  const responsible = source.responsibles[templateId];
  if (!template || !responsible) return null;
  const answers = template.questions.map((question, index) => ({
    questionId: `external-${sourceRow}-${index + 1}`,
    question,
    result: resultBits?.[index] === "O" ? "OK" : "NOK"
  }));
  const ok = answers.filter((answer) => answer.result === "OK").length;
  return {
    id: 900000 + Number(sourceRow),
    syncId: `dto-external-20260905-row-${sourceRow}`,
    externalImportKey: `${IMPORT_PREFIX}${sourceRow}`,
    recordType: "dto_application",
    dtoTemplateId: templateId,
    dtoName: template.name,
    title: template.name,
    applicationDate,
    nextDueDate: addDays(applicationDate, 60),
    recurrenceDays: 60,
    applicatorId: Number(responsible.id),
    applicatorName: responsible.name,
    ownerId: Number(responsible.id),
    employeeName,
    answers,
    actionPlan: actionPlan || "",
    complianceRate: answers.length ? Math.round(ok / answers.length * 100) : 0,
    nokCount: answers.length - ok,
    status: "completed",
    source: "external_excel",
    sourceLabel: "DTO(1).xlsx",
    externalSourceRow: Number(sourceRow),
    createdAt: `${applicationDate}T12:00:00.000Z`,
    updatedAt: `${applicationDate}T12:00:00.000Z`
  };
}

async function ensureSeed() {
  if (EXTERNAL_SEED.length) return;
  externalData = externalData || await loadDtoExternalData();
  EXTERNAL_SEED = (externalData.rows || []).map((row) => buildImportedRecord(row, externalData)).filter(Boolean);
  EXTERNAL_KEYS = new Set(EXTERNAL_SEED.map((item) => item.externalImportKey));
}

function materializeExternal(data) {
  if (!data || typeof data !== "object") return { changed: false, added: 0 };
  data.meta = data.meta && typeof data.meta === "object" ? data.meta : {};
  const deleted = new Set([
    ...readDeletedKeys(),
    ...(Array.isArray(data.meta.dtoExternalDeletedKeys) ? data.meta.dtoExternalDeletedKeys.map(String) : [])
  ]);
  writeDeletedKeys(deleted);
  const records = Array.isArray(data.dtoRecords) ? data.dtoRecords : [];
  let changed = false;
  let added = 0;

  const kept = records.filter((item) => {
    const key = String(item?.externalImportKey || "");
    if (key && EXTERNAL_KEYS.has(key) && deleted.has(key)) { changed = true; return false; }
    return true;
  });
  const existingKeys = new Set(kept.map((item) => String(item?.externalImportKey || "")).filter(Boolean));
  const existingSyncIds = new Set(kept.map((item) => String(item?.syncId || "")).filter(Boolean));
  for (const item of EXTERNAL_SEED) {
    if (deleted.has(item.externalImportKey)) continue;
    if (existingKeys.has(item.externalImportKey) || existingSyncIds.has(item.syncId)) continue;
    kept.push(item);
    existingKeys.add(item.externalImportKey);
    existingSyncIds.add(item.syncId);
    changed = true;
    added += 1;
  }

  const deletedList = [...deleted];
  if (JSON.stringify(data.meta.dtoExternalDeletedKeys || []) !== JSON.stringify(deletedList)) {
    data.meta.dtoExternalDeletedKeys = deletedList;
    changed = true;
  }
  if (Number(data.meta.dtoExternalImportVersion || 0) !== IMPORT_VERSION) {
    data.meta.dtoExternalImportVersion = IMPORT_VERSION;
    changed = true;
  }
  if (changed) {
    data.dtoRecords = kept;
    data.sequence = data.sequence && typeof data.sequence === "object" ? data.sequence : {};
    data.sequence.dtoRecords = Math.max(Number(data.sequence.dtoRecords || 0), 0, ...kept.map((item) => Number(item?.id || 0)));
  }
  return { changed, added };
}

function mergeSharedIntoLocal(shared) {
  const local = readDb();
  if (!local || !shared) return local;
  const merged = { ...local, ...shared, sequence: { ...(local.sequence || {}), ...(shared.sequence || {}) } };
  materializeExternal(merged);
  writeDb(merged);
  return merged;
}

async function ensureExternalImport() {
  if (importing || deleting || location.hash !== "#dto") return;
  importing = true;
  try {
    await ensureSeed();
    let data = readDb();
    if (!data) return;

    const localResult = materializeExternal(data);
    if (localResult.changed) writeDb(data);

    if (localResult.added > 0 && sessionStorage.getItem("dto-external-local-reload-v3") !== "1") {
      sessionStorage.setItem("dto-external-local-reload-v3", "1");
      location.reload();
      return;
    }

    if (!localStorage.getItem(TOKEN_KEY)) return;

    await syncOperationalData();
    data = readDb();
    if (!data) return;
    const sharedResult = materializeExternal(data);
    if (sharedResult.changed) writeDb(data);

    const deleted = new Set(readDeletedKeys());
    const activeExpected = EXTERNAL_SEED.filter((item) => !deleted.has(item.externalImportKey)).length;
    const currentExternal = (data.dtoRecords || []).filter((item) => EXTERNAL_KEYS.has(String(item?.externalImportKey || ""))).length;
    if (sharedResult.changed || currentExternal < activeExpected) await putShared(data);

    const shared = await getShared();
    const merged = mergeSharedIntoLocal(shared);
    const confirmed = (merged?.dtoRecords || []).filter((item) => EXTERNAL_KEYS.has(String(item?.externalImportKey || "")) && !deleted.has(String(item?.externalImportKey || ""))).length;
    if (confirmed < activeExpected) throw new Error(`A importação foi incompleta: ${confirmed} de ${activeExpected} DTOs externos confirmados.`);
  } catch (error) {
    console.error("Falha na importação externa de DTOs:", error);
  } finally {
    importing = false;
  }
}

function currentRecord(id) {
  return (readDb()?.dtoRecords || []).find((item) => Number(item?.id) === Number(id)) || null;
}

function canDelete(record) {
  return Boolean(record && state.user && Number(record.applicatorId || record.ownerId) === Number(state.user.id));
}

async function deleteDto(recordId) {
  if (deleting) return;
  const before = currentRecord(recordId);
  if (!before) { alert("DTO não encontrado."); return; }
  if (!canDelete(before)) { alert("Somente o responsável pela aplicação pode excluir este DTO."); return; }
  if (!confirm(`Excluir a aplicação de ${before.dtoName || before.title || "DTO"} de ${before.applicationDate || ""}?`)) return;

  deleting = true;
  try {
    let data = readDb();
    if (!data) throw new Error("Não foi possível acessar a base do DTO.");

    if (localStorage.getItem(TOKEN_KEY)) {
      await syncOperationalData();
      data = readDb() || data;
    }

    const record = (data.dtoRecords || []).find((item) => Number(item?.id) === Number(recordId)) || before;
    if (!canDelete(record)) throw new Error("Somente o responsável pela aplicação pode excluir este DTO.");

    data.dtoRecords = (data.dtoRecords || []).filter((item) => Number(item?.id) !== Number(recordId));
    data.meta = data.meta && typeof data.meta === "object" ? data.meta : {};
    if (record.externalImportKey) {
      const deleted = new Set([...readDeletedKeys(), ...(Array.isArray(data.meta.dtoExternalDeletedKeys) ? data.meta.dtoExternalDeletedKeys.map(String) : [])]);
      deleted.add(String(record.externalImportKey));
      data.meta.dtoExternalDeletedKeys = [...deleted];
      writeDeletedKeys(deleted);
    }
    writeDb(data);

    if (localStorage.getItem(TOKEN_KEY)) {
      await putShared(data);
      const shared = await getShared();
      const stillExists = (shared?.dtoRecords || []).some((item) =>
        Number(item?.id) === Number(recordId) ||
        (record.externalImportKey && String(item?.externalImportKey || "") === String(record.externalImportKey))
      );
      if (stillExists) throw new Error("A base compartilhada não confirmou a exclusão do DTO.");
      mergeSharedIntoLocal(shared);
    }
    location.reload();
  } catch (error) {
    console.error("Falha ao excluir DTO:", error);
    alert(error?.message || "Não foi possível excluir o DTO.");
  } finally {
    deleting = false;
  }
}

function installDeleteButtons() {
  if (location.hash !== "#dto") return;
  document.querySelectorAll("#page-content .dto2-history tbody tr[data-dto2-detail]").forEach((row) => {
    const record = currentRecord(row.dataset.dto2Detail);
    const cell = row.querySelector(".dto2-arrow") || row.lastElementChild;
    if (!cell) return;
    cell.classList.add("dto2-row-actions");
    cell.querySelector("[data-dto-delete]")?.remove();
    if (!canDelete(record)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dto2-delete";
    button.dataset.dtoDelete = String(record.id);
    button.setAttribute("aria-label", "Excluir DTO");
    button.setAttribute("title", "Excluir DTO");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>';
    cell.prepend(button);
  });
}

function markCompactTables() {
  if (location.hash !== "#dto") return;
  const cards = [...document.querySelectorAll("#page-content .dto2-card")];
  for (const card of cards) {
    if ([...card.querySelectorAll("th")].some((th) => th.textContent.trim() === "Próximo vencimento")) card.querySelector("table")?.classList.add("dto2-deadline-compact");
  }
}

function installStyles() {
  if (document.querySelector("style[data-dto-external-styles]")) return;
  const style = document.createElement("style");
  style.dataset.dtoExternalStyles = "";
  style.textContent = `
    #page-content .dto2-history{width:800px!important;max-width:100%!important;min-width:760px!important;table-layout:fixed!important}
    #page-content .dto2-history th:nth-child(1),#page-content .dto2-history td:nth-child(1){width:82px!important}
    #page-content .dto2-history th:nth-child(2),#page-content .dto2-history td:nth-child(2){width:150px!important}
    #page-content .dto2-history th:nth-child(3),#page-content .dto2-history td:nth-child(3){width:120px!important}
    #page-content .dto2-history th:nth-child(4),#page-content .dto2-history td:nth-child(4){width:120px!important}
    #page-content .dto2-history th:nth-child(5),#page-content .dto2-history td:nth-child(5){width:75px!important}
    #page-content .dto2-history th:nth-child(6),#page-content .dto2-history td:nth-child(6){width:105px!important}
    #page-content .dto2-history th:nth-child(7),#page-content .dto2-history td:nth-child(7){width:48px!important}
    #page-content .dto2-deadline-compact{width:720px!important;max-width:100%!important;min-width:690px!important;table-layout:fixed!important}
    #page-content .dto2-deadline-compact th:nth-child(1),#page-content .dto2-deadline-compact td:nth-child(1){width:150px!important}
    #page-content .dto2-deadline-compact th:nth-child(2),#page-content .dto2-deadline-compact td:nth-child(2){width:100px!important}
    #page-content .dto2-deadline-compact th:nth-child(3),#page-content .dto2-deadline-compact td:nth-child(3){width:115px!important}
    #page-content .dto2-deadline-compact th:nth-child(4),#page-content .dto2-deadline-compact td:nth-child(4){width:110px!important}
    #page-content .dto2-deadline-compact th:nth-child(5),#page-content .dto2-deadline-compact td:nth-child(5){width:125px!important}
    #page-content .dto2-deadline-compact th:nth-child(6),#page-content .dto2-deadline-compact td:nth-child(6){width:70px!important}
    #page-content .dto2-filters{max-width:980px!important}
    #page-content .dto2-row-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:3px!important;white-space:nowrap}
    #page-content .dto2-delete{width:22px;height:22px;padding:0;border:0;background:transparent;color:var(--danger);border-radius:5px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;position:relative;z-index:3}
    #page-content .dto2-delete:hover{background:rgba(192,57,43,.09)}
    #page-content .dto2-delete svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #page-content .dto2-card.table-card{padding-top:5px!important;padding-bottom:5px!important}
    #page-content .dto2-cardhead{margin-bottom:3px!important}
    #page-content .dto2-table th,#page-content .dto2-table td{padding-top:3px!important;padding-bottom:3px!important}
    #page-content .dto2-history tbody tr,#page-content .dto2-deadline-compact tbody tr{height:27px!important}
    @media(max-width:900px){#page-content .dto2-history{min-width:740px!important}#page-content .dto2-deadline-compact{min-width:670px!important}}
  `;
  document.head.appendChild(style);
}

function enhance() { return;
  installStyles();
  markCompactTables();
  installDeleteButtons();
  // Importação externa pausada até a base dedicada estar pronta.
}

const observer = new MutationObserver(() => requestAnimationFrame(enhance));
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dto-delete]");
  if (!button || location.hash !== "#dto") return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  deleteDto(button.dataset.dtoDelete);
}, true);

window.addEventListener("hashchange", () => { if (location.hash === "#dto") requestAnimationFrame(enhance); });
window.addEventListener("storage", () => { if (location.hash === "#dto") requestAnimationFrame(enhance); });
document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(enhance));
if (document.readyState !== "loading") requestAnimationFrame(enhance);
