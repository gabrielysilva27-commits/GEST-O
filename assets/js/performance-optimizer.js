import { api as localApi } from './api.js';
import { createSharedApi } from './shared-api.js';
import { state } from './state.js';
import { views } from './modules/index.js';

const sharedApi = createSharedApi(localApi);
const PREFETCHABLE = new Set(['actionPlans', 'meetings', 'gapa', 'dto', 'anomalyReports', 'notifications', 'administration']);
const prefetched = new Map();
let actionRows = [];
let actionRowsGeneration = 0;
let hoverTimer = 0;

const decodeAttribute = (value = '') => String(value)
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&');

const normalize = (value = '') => String(value).trim().toLocaleLowerCase('pt-BR');
const normalizeSubject = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function rowAttribute(html, name) {
  const match = html.match(new RegExp(`${name}="([^"]*)"`));
  return decodeAttribute(match?.[1] || '');
}

function cacheActionRows(html) {
  const portfolioAt = html.indexOf('data-action-portfolio');
  if (portfolioAt < 0) {
    actionRows = [];
    return html;
  }
  const tbodyStart = html.indexOf('<tbody>', portfolioAt);
  const tbodyEnd = tbodyStart >= 0 ? html.indexOf('</tbody>', tbodyStart) : -1;
  if (tbodyStart < 0 || tbodyEnd < 0) {
    actionRows = [];
    return html;
  }

  const body = html.slice(tbodyStart + 7, tbodyEnd);
  const rows = body.match(/<tr data-action-row\b[\s\S]*?<\/tr>/g) || [];
  if (!rows.length) {
    actionRows = [];
    return html;
  }

  actionRowsGeneration += 1;
  actionRows = rows.map((row) => ({
    html: row,
    subject: rowAttribute(row, 'data-action-subject'),
    meeting: rowAttribute(row, 'data-meeting'),
    requester: rowAttribute(row, 'data-requester'),
    owner: rowAttribute(row, 'data-owner'),
    executionMonth: rowAttribute(row, 'data-execution-month'),
    status: rowAttribute(row, 'data-status')
  }));

  // Keep filters/options populated, but avoid parsing thousands of rows into the DOM
  // while the page intentionally starts with an empty result set.
  return html.slice(0, tbodyStart + 7) + html.slice(tbodyEnd);
}

const originalActionRender = views.actionPlans.render;
views.actionPlans.render = (data, context) => {
  const html = originalActionRender(data, context);
  if (context.actionWorkspace !== 'list') {
    actionRows = [];
    return html;
  }
  return cacheActionRows(html);
};

function actionFilters() {
  const root = document.querySelector('#page-content [data-action-filters]');
  if (!root) return null;
  return Object.fromEntries(
    [...root.querySelectorAll('[data-action-filter]')].map((field) => [field.dataset.actionFilter, normalize(field.value)])
  );
}

function matchesAction(row, filters) {
  return (!filters.subject || normalizeSubject(row.subject) === normalizeSubject(filters.subject))
    && (!filters.meeting || normalize(row.meeting) === filters.meeting)
    && (!filters.requester || normalize(row.requester) === filters.requester)
    && (!filters.owner || normalize(row.owner) === filters.owner)
    && (!filters.status || row.status === filters.status)
    && (!filters.executionMonth || row.executionMonth === filters.executionMonth);
}

function hydrateActionRows() {
  if (state.currentView !== 'actionPlans') return;
  const root = document.querySelector('#page-content');
  const tbody = root?.querySelector('[data-action-portfolio] tbody');
  const filters = actionFilters();
  if (!tbody || !filters) return;

  const hasFilters = Object.values(filters).some(Boolean);
  const signature = `${actionRowsGeneration}:${JSON.stringify(filters)}`;
  let matches = [];
  if (hasFilters) matches = actionRows.filter((row) => matchesAction(row, filters));

  if (tbody.dataset.performanceSignature !== signature) {
    tbody.innerHTML = hasFilters ? matches.map((row) => row.html).join('') : '';
    tbody.dataset.performanceSignature = signature;
  }

  const output = root.querySelector('[data-action-filter-result]');
  if (output) {
    output.textContent = hasFilters
      ? `${matches.length} ${matches.length === 1 ? 'ação encontrada' : 'ações encontradas'}`
      : 'Selecione ao menos um filtro para ver as ações.';
  }
}

function queueActionHydration() {
  queueMicrotask(hydrateActionRows);
}

async function prefetchView(viewId) {
  if (!state.token || !state.user || !PREFETCHABLE.has(viewId) || state.dataCache[viewId]) return;
  if (prefetched.has(viewId)) return prefetched.get(viewId);
  const view = views[viewId];
  if (!view?.load) return;

  const task = view.load(sharedApi, state.token)
    .then((data) => {
      if (!state.dataCache[viewId]) state.dataCache[viewId] = data;
      return data;
    })
    .catch(() => null)
    .finally(() => prefetched.delete(viewId));
  prefetched.set(viewId, task);
  return task;
}

function schedulePrefetch(viewId) {
  window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => prefetchView(viewId), 90);
}

document.addEventListener('input', (event) => {
  if (event.target.matches?.('[data-action-filter]')) queueActionHydration();
}, true);

document.addEventListener('change', (event) => {
  if (event.target.matches?.('[data-action-filter]')) queueActionHydration();
}, true);

document.addEventListener('click', (event) => {
  if (event.target.closest?.('[data-clear-action-filters]')) queueActionHydration();
}, true);

document.addEventListener('pointerover', (event) => {
  const button = event.target.closest?.('[data-view]');
  if (button?.dataset.view) schedulePrefetch(button.dataset.view);
}, { capture: true, passive: true });

document.addEventListener('focusin', (event) => {
  const button = event.target.closest?.('[data-view]');
  if (button?.dataset.view) schedulePrefetch(button.dataset.view);
}, true);

document.addEventListener('pointerout', (event) => {
  if (event.target.closest?.('[data-view]')) window.clearTimeout(hoverTimer);
}, { capture: true, passive: true });
