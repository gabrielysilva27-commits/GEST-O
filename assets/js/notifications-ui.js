import { databaseStorage as localStorage } from './database-storage.js';

const DB_KEY = 'lead-gestao-db-v2';
const TOKEN_KEY = 'lead-gestao-sync-token';
const NOTIFICATION_HASH = '#notifications';
const root = () => document.querySelector('#page-content');
let sharedActions = [];
let refreshPromise = null;
let sharedRefreshDone = false;

function readDatabase() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

function personName(action, database) {
  if (!action) return '—';
  if (action.requesterName) return action.requesterName;
  if (action.legacyRequesterName) return action.legacyRequesterName;
  const user = (database.users || []).find(item => Number(item.id) === Number(action.requesterId));
  return user?.name || user?.username || '—';
}

function actionMap(database) {
  const map = new Map();
  [...(database.actionPlans || []), ...sharedActions].forEach(action => {
    if (action?.id !== undefined && action?.id !== null) map.set(Number(action.id), action);
  });
  return map;
}

function addTextCell(row, text, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = text || '—';
  row.appendChild(cell);
  return cell;
}

function actionCell(row, action, fallbackMessage) {
  const cell = document.createElement('td');
  cell.className = 'notification-action-description';
  const strong = document.createElement('strong');
  strong.textContent = action?.objective || action?.title || fallbackMessage || 'Ação sem descrição';
  cell.appendChild(strong);
  if (action?.meetingTitle) {
    const small = document.createElement('small');
    small.textContent = action.meetingTitle;
    cell.appendChild(small);
  }
  row.appendChild(cell);
}

function subjectCell(row, action, fallbackTitle) {
  const cell = document.createElement('td');
  const strong = document.createElement('strong');
  strong.textContent = action?.meetingSubject || fallbackTitle || '—';
  cell.appendChild(strong);
  if (action?.meetingExecutionDate) {
    const small = document.createElement('small');
    small.textContent = `Aplicada em ${formatDate(action.meetingExecutionDate)}`;
    cell.appendChild(small);
  }
  row.appendChild(cell);
}

function enhanceNotifications() {
  if (location.hash !== NOTIFICATION_HASH) return;
  const page = root();
  const table = page?.querySelector('.table-card table');
  if (!table || table.dataset.notificationDetails === 'true') return;

  const database = readDatabase();
  const actions = actionMap(database);
  const rows = [...table.querySelectorAll('tbody tr')];
  if (!rows.length) return;

  const hasActionNotifications = rows.some(row => row.querySelector('[data-action-plan-id]'));
  if (!hasActionNotifications) return;

  const headRow = table.querySelector('thead tr');
  if (headRow) {
    headRow.innerHTML = '<th scope="col">Ação</th><th scope="col">Solicitante</th><th scope="col">Assunto</th><th scope="col">Prazo</th><th scope="col">Concluir</th>';
  }

  rows.forEach(row => {
    const cells = [...row.cells];
    const title = cells[0]?.textContent?.trim() || '';
    const message = cells[1]?.textContent?.trim() || '';
    const actionButton = row.querySelector('[data-action-plan-id]');
    const genericButton = row.querySelector('[data-read-notification]');
    const actionId = Number(actionButton?.dataset.actionPlanId || 0);
    const action = actions.get(actionId);
    const button = actionButton || genericButton;

    row.innerHTML = '';
    actionCell(row, action, message);
    addTextCell(row, personName(action, database), 'notification-requester');
    subjectCell(row, action, title);
    addTextCell(row, action?.dueDate ? formatDate(action.dueDate) : '—', 'notification-due-date');
    const controlCell = document.createElement('td');
    controlCell.className = 'notification-control';
    if (button) controlCell.appendChild(button);
    row.appendChild(controlCell);
  });

  table.dataset.notificationDetails = 'true';
  table.classList.add('notification-action-table');
  const card = table.closest('.table-card');
  const description = card?.querySelector(':scope > p');
  if (description) description.textContent = 'Ações direcionadas a você, com contexto suficiente para decidir e concluir.';
}

async function refreshSharedActions() {
  if (sharedRefreshDone || refreshPromise || location.hash !== NOTIFICATION_HASH) return refreshPromise;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  sharedRefreshDone = true;
  refreshPromise = fetch('/api/shared-data', {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store'
  }).then(async response => {
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (Array.isArray(payload?.data?.actionPlans)) sharedActions = payload.data.actionPlans;
    const table = root()?.querySelector('.notification-action-table');
    if (table) delete table.dataset.notificationDetails;
    enhanceNotifications();
  }).catch(() => {
    // A tela continua funcional com a base local caso a consulta compartilhada falhe.
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function installStyles() {
  if (document.querySelector('style[data-notification-details-styles]')) return;
  const style = document.createElement('style');
  style.dataset.notificationDetailsStyles = '';
  style.textContent = `
    #page-content .notification-action-table{table-layout:fixed;width:100%}
    #page-content .notification-action-table th,#page-content .notification-action-table td{vertical-align:middle;padding:9px 10px}
    #page-content .notification-action-table th:nth-child(1){width:38%}
    #page-content .notification-action-table th:nth-child(2){width:17%}
    #page-content .notification-action-table th:nth-child(3){width:22%}
    #page-content .notification-action-table th:nth-child(4){width:11%}
    #page-content .notification-action-table th:nth-child(5){width:12%}
    #page-content .notification-action-description strong,#page-content .notification-action-table td:nth-child(3) strong{display:block;color:var(--text);font-size:.72rem;line-height:1.35}
    #page-content .notification-action-description small,#page-content .notification-action-table td:nth-child(3) small{display:block;margin-top:3px;color:var(--text-muted);font-size:.59rem;line-height:1.3}
    #page-content .notification-requester,#page-content .notification-due-date{white-space:nowrap;font-weight:600}
    #page-content .notification-control{text-align:right;white-space:nowrap}
    #page-content .notification-control .button{min-height:30px;padding:5px 9px;font-size:.64rem}
    @media(max-width:850px){
      #page-content .notification-action-table{min-width:760px;table-layout:auto}
      #page-content .notification-action-table th:nth-child(n){width:auto}
    }
  `;
  document.head.appendChild(style);
}

function enhance() {
  enhanceNotifications();
  refreshSharedActions();
}

const observer = new MutationObserver(() => requestAnimationFrame(enhance));

function start() {
  installStyles();
  const page = root();
  if (page) observer.observe(page, { childList: true, subtree: true });
  requestAnimationFrame(enhance);
}

window.addEventListener('hashchange', () => {
  sharedRefreshDone = false;
  requestAnimationFrame(enhance);
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
