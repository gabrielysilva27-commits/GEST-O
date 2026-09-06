const ANOMALY_HASH = '#anomalyReports';
const host = () => document.querySelector('#page-content');

function anomalyUrl(id = null) {
  const url = new URL(location.href);
  if (id) url.searchParams.set('anomaly', String(id));
  else url.searchParams.delete('anomaly');
  return `${url.pathname}${url.search}${url.hash}`;
}

function rememberAnomaly(id) {
  const numericId = Number(id);
  if (!numericId) return;
  history.replaceState(history.state, '', anomalyUrl(numericId));
}

function forgetAnomaly() {
  if (!new URL(location.href).searchParams.has('anomaly')) return;
  history.replaceState(history.state, '', anomalyUrl(null));
}

function wrapInternalOpen() {
  const current = window.__openAnomaly;
  if (typeof current !== 'function' || current.__leadNavigationWrapped) return;
  const wrapped = id => {
    rememberAnomaly(id);
    return current(id);
  };
  wrapped.__leadNavigationWrapped = true;
  window.__openAnomaly = wrapped;
}

function compactAppliedHeader() {
  if (location.hash !== ANOMALY_HASH) return;
  const view = host()?.querySelector('.anomaly-view');
  const filters = view?.querySelector('.anomaly-filters');
  const card = filters?.closest('.anomaly-card');
  const cardHead = card?.querySelector('.anomaly-cardhead');
  if (!view || !card || !cardHead) return;

  const topToolbar = [...view.children].find(node => node.classList?.contains('anomaly-toolbar'));
  if (topToolbar) {
    const applyButton = topToolbar.querySelector('[data-anomaly-apply]');
    let actions = cardHead.querySelector('.anomaly-cardhead-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'anomaly-cardhead-actions';
      cardHead.appendChild(actions);
    }
    const count = cardHead.querySelector('[data-anomaly-count]');
    if (count && count.parentElement !== actions) actions.appendChild(count);
    if (applyButton) actions.appendChild(applyButton);
    topToolbar.remove();
  }

  const subtitle = cardHead.querySelector('span');
  if (subtitle) subtitle.textContent = 'Clique em qualquer ponto do registro para consultar os cinco porquês e o plano de ação.';
}

function makeRowsClickable() {
  if (location.hash !== ANOMALY_HASH) return;
  host()?.querySelectorAll('tr[data-anomaly-detail]').forEach(row => {
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    const occurrence = row.cells?.[1]?.textContent?.trim() || 'relato';
    row.setAttribute('aria-label', `Abrir ${occurrence}`);
  });
}

function installStyles() {
  if (document.querySelector('style[data-anomaly-finish-styles]')) return;
  const style = document.createElement('style');
  style.dataset.anomalyFinishStyles = '';
  style.textContent = `
    #page-content .anomaly-cardhead{align-items:center}
    #page-content .anomaly-cardhead-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}
    #page-content .anomaly-cardhead-actions>[data-anomaly-count]{white-space:nowrap}
    #page-content .anomaly-table tr[data-anomaly-detail]{cursor:pointer;outline:none}
    #page-content .anomaly-table tr[data-anomaly-detail]:focus-visible{background:rgba(45,107,181,.075);box-shadow:inset 0 0 0 1px rgba(45,107,181,.22)}
    @media(max-width:900px){
      #page-content .anomaly-cardhead{align-items:stretch;flex-direction:column}
      #page-content .anomaly-cardhead-actions{justify-content:space-between}
    }
  `;
  document.head.appendChild(style);
}

function enhance() {
  wrapInternalOpen();
  compactAppliedHeader();
  makeRowsClickable();
}

const observer = new MutationObserver(() => requestAnimationFrame(enhance));

function start() {
  installStyles();
  const page = host();
  if (page) observer.observe(page, {childList:true, subtree:true});
  requestAnimationFrame(enhance);
}

document.addEventListener('click', event => {
  if (location.hash !== ANOMALY_HASH) return;

  if (event.target.closest('[data-anomaly-back], [data-anomaly-edit], [data-anomaly-apply]')) {
    forgetAnomaly();
    return;
  }

  const row = event.target.closest('tr[data-anomaly-detail]');
  if (!row) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  rememberAnomaly(row.dataset.anomalyDetail);
  if (typeof window.__openAnomaly === 'function') window.__openAnomaly(row.dataset.anomalyDetail);
}, true);

document.addEventListener('keydown', event => {
  if (location.hash !== ANOMALY_HASH || !['Enter', ' '].includes(event.key)) return;
  const row = event.target.closest('tr[data-anomaly-detail]');
  if (!row) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  rememberAnomaly(row.dataset.anomalyDetail);
  if (typeof window.__openAnomaly === 'function') window.__openAnomaly(row.dataset.anomalyDetail);
}, true);

window.addEventListener('hashchange', () => {
  if (location.hash !== ANOMALY_HASH) forgetAnomaly();
  requestAnimationFrame(enhance);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
else start();
