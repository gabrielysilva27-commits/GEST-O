import { state } from "./state.js";
import { persistOperationalData, syncOperationalData } from "./shared-api.js?v=20260905-11";
import { loadDtoExternalData } from "./dto-external-data.js?v=20260905-01";

const DB_KEY = "lead-gestao-db-v2";
const TOKEN_KEY = "lead-gestao-sync-token";
const IMPORT_VERSION = 1;
const IMPORT_PREFIX = "dto1-20260905-row-";
let importing = false;
let reloading = false;
let externalData = null;

const readDb = () => {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || "null"); }
  catch { return null; }
};
const writeDb = (data) => localStorage.setItem(DB_KEY, JSON.stringify(data));
const addDays = (value, amount) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T12:00:00`) : null;
  if (!date) return "";
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};

function buildImportedRecord(row, data) {
  const [sourceRow, templateId, applicationDate, employeeName, resultBits, actionPlan] = row;
  const template = data.templates[templateId];
  const responsible = data.responsibles[templateId];
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

async function importedSeed() {
  externalData = externalData || await loadDtoExternalData();
  return externalData.rows.map((row) => buildImportedRecord(row, externalData)).filter(Boolean);
}

async function ensureExternalImport() {
  if (importing || reloading || location.hash !== "#dto" || !localStorage.getItem(TOKEN_KEY)) return;
  importing = true;
  try {
    await syncOperationalData();
    const data = readDb();
    if (!data) return;
    data.meta = data.meta && typeof data.meta === "object" ? data.meta : {};
    const deleted = new Set(Array.isArray(data.meta.dtoExternalDeletedKeys) ? data.meta.dtoExternalDeletedKeys.map(String) : []);
    const records = Array.isArray(data.dtoRecords) ? data.dtoRecords : [];
    const seed = await importedSeed();
    const seedKeys = new Set(seed.map((item) => item.externalImportKey));
    const existingKeys = new Set(records.map((item) => String(item?.externalImportKey || "")).filter(Boolean));
    const existingSyncIds = new Set(records.map((item) => String(item?.syncId || "")).filter(Boolean));

    let changed = false;
    const kept = records.filter((item) => {
      const key = String(item?.externalImportKey || "");
      if (key && seedKeys.has(key) && deleted.has(key)) { changed = true; return false; }
      return true;
    });
    for (const item of seed) {
      if (deleted.has(item.externalImportKey)) continue;
      if (existingKeys.has(item.externalImportKey) || existingSyncIds.has(item.syncId)) continue;
      kept.push(item);
      changed = true;
    }
    if (Number(data.meta.dtoExternalImportVersion || 0) !== IMPORT_VERSION) {
      data.meta.dtoExternalImportVersion = IMPORT_VERSION;
      changed = true;
    }
    if (!changed) return;

    data.dtoRecords = kept;
    data.sequence = data.sequence && typeof data.sequence === "object" ? data.sequence : {};
    data.sequence.dtoRecords = Math.max(Number(data.sequence.dtoRecords || 0), ...kept.map((item) => Number(item?.id || 0)));
    writeDb(data);
    if (!await persistOperationalData()) throw new Error("Não foi possível publicar os DTOs importados na base compartilhada.");
    await syncOperationalData();
    reloading = true;
    location.reload();
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
  if (!localStorage.getItem(TOKEN_KEY)) {
    alert("Sua sessão de sincronização expirou. Saia e entre novamente antes de excluir o DTO.");
    return;
  }
  await syncOperationalData();
  const data = readDb();
  const record = (data?.dtoRecords || []).find((item) => Number(item?.id) === Number(recordId));
  if (!record) { alert("DTO não encontrado."); return; }
  if (!canDelete(record)) { alert("Somente o responsável pela aplicação pode excluir este DTO."); return; }
  if (!confirm(`Excluir a aplicação de ${record.dtoName || record.title || "DTO"} de ${record.applicationDate || ""}?`)) return;

  data.dtoRecords = (data.dtoRecords || []).filter((item) => Number(item?.id) !== Number(recordId));
  if (record.externalImportKey) {
    data.meta = data.meta && typeof data.meta === "object" ? data.meta : {};
    const deleted = new Set(Array.isArray(data.meta.dtoExternalDeletedKeys) ? data.meta.dtoExternalDeletedKeys.map(String) : []);
    deleted.add(String(record.externalImportKey));
    data.meta.dtoExternalDeletedKeys = [...deleted];
  }
  writeDb(data);
  if (!await persistOperationalData()) {
    await syncOperationalData();
    alert("Não foi possível confirmar a exclusão compartilhada do DTO.");
    return;
  }
  await syncOperationalData();
  reloading = true;
  location.reload();
}

function installDeleteButtons() {
  if (location.hash !== "#dto") return;
  document.querySelectorAll("#page-content .dto2-history tbody tr[data-dto2-detail]").forEach((row) => {
    const record = currentRecord(row.dataset.dto2Detail);
    const cell = row.querySelector(".dto2-arrow") || row.lastElementChild;
    if (!cell || cell.querySelector("[data-dto-delete]")) return;
    cell.classList.add("dto2-row-actions");
    if (canDelete(record)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dto2-delete";
      button.dataset.dtoDelete = String(record.id);
      button.setAttribute("aria-label", "Excluir DTO");
      button.setAttribute("title", "Excluir DTO");
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>';
      cell.prepend(button);
    }
  });
}

function markCompactTables() {
  if (location.hash !== "#dto") return;
  const cards = [...document.querySelectorAll("#page-content .dto2-card")];
  for (const card of cards) {
    if ([...card.querySelectorAll("th")].some((th) => th.textContent.trim() === "Próximo vencimento")) {
      card.querySelector("table")?.classList.add("dto2-deadline-compact");
    }
  }
}

function installStyles() {
  if (document.querySelector("style[data-dto-external-styles]")) return;
  const style = document.createElement("style");
  style.dataset.dtoExternalStyles = "";
  style.textContent = `
    #page-content .dto2-history{width:960px!important;max-width:100%!important;min-width:820px!important;table-layout:fixed!important}
    #page-content .dto2-history th:nth-child(1),#page-content .dto2-history td:nth-child(1){width:88px!important}
    #page-content .dto2-history th:nth-child(2),#page-content .dto2-history td:nth-child(2){width:170px!important}
    #page-content .dto2-history th:nth-child(3),#page-content .dto2-history td:nth-child(3){width:135px!important}
    #page-content .dto2-history th:nth-child(4),#page-content .dto2-history td:nth-child(4){width:135px!important}
    #page-content .dto2-history th:nth-child(5),#page-content .dto2-history td:nth-child(5){width:82px!important}
    #page-content .dto2-history th:nth-child(6),#page-content .dto2-history td:nth-child(6){width:118px!important}
    #page-content .dto2-history th:nth-child(7),#page-content .dto2-history td:nth-child(7){width:58px!important}
    #page-content .dto2-deadline-compact{width:900px!important;max-width:100%!important;min-width:760px!important;table-layout:fixed!important}
    #page-content .dto2-deadline-compact th:nth-child(1),#page-content .dto2-deadline-compact td:nth-child(1){width:180px!important}
    #page-content .dto2-deadline-compact th:nth-child(2),#page-content .dto2-deadline-compact td:nth-child(2){width:115px!important}
    #page-content .dto2-deadline-compact th:nth-child(3),#page-content .dto2-deadline-compact td:nth-child(3){width:140px!important}
    #page-content .dto2-deadline-compact th:nth-child(4),#page-content .dto2-deadline-compact td:nth-child(4){width:125px!important}
    #page-content .dto2-deadline-compact th:nth-child(5),#page-content .dto2-deadline-compact td:nth-child(5){width:145px!important}
    #page-content .dto2-deadline-compact th:nth-child(6),#page-content .dto2-deadline-compact td:nth-child(6){width:85px!important}
    #page-content .dto2-filters{max-width:1040px!important}
    #page-content .dto2-row-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;white-space:nowrap}
    #page-content .dto2-delete{width:24px;height:24px;padding:0;border:0;background:transparent;color:var(--danger);border-radius:5px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
    #page-content .dto2-delete:hover{background:rgba(192,57,43,.09)}
    #page-content .dto2-delete svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #page-content .dto2-card.table-card{padding-top:6px!important;padding-bottom:6px!important}
    #page-content .dto2-cardhead{margin-bottom:4px!important}
    #page-content .dto2-table th,#page-content .dto2-table td{padding-top:4px!important;padding-bottom:4px!important}
    @media(max-width:900px){#page-content .dto2-history{min-width:780px!important}#page-content .dto2-deadline-compact{min-width:720px!important}}
  `;
  document.head.appendChild(style);
}

function enhance() {
  installStyles();
  markCompactTables();
  installDeleteButtons();
}

const observer = new MutationObserver(enhance);
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dto-delete]");
  if (!button || location.hash !== "#dto") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  deleteDto(button.dataset.dtoDelete).catch((error) => {
    console.error(error);
    alert(error?.message || "Não foi possível excluir o DTO.");
  });
}, true);

window.addEventListener("hashchange", () => {
  if (location.hash === "#dto") {
    requestAnimationFrame(enhance);
    ensureExternalImport();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(enhance);
  ensureExternalImport();
});

if (document.readyState !== "loading") {
  requestAnimationFrame(enhance);
  ensureExternalImport();
}
