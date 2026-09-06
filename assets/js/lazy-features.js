const loaded = new Map();

function once(key, loader) {
  if (loaded.has(key)) return loaded.get(key);
  const task = loader().catch((error) => {
    loaded.delete(key);
    throw error;
  });
  loaded.set(key, task);
  return task;
}

function loadDto() {
  return once('dto', async () => {
    await import('./dto-module.js');
    await import('./dto-ui.js');
    await import('./dto-compact.js');
  });
}

function loadAnomaly() {
  return once('anomalyReports', () => import('./anomaly-finish.js'));
}

function loadNotifications() {
  return once('notifications', () => import('./notifications-ui.js'));
}

export function loadFeatureForView(viewId) {
  if (viewId === 'dto') return loadDto();
  if (viewId === 'anomalyReports') return loadAnomaly();
  if (viewId === 'notifications') return loadNotifications();
  return Promise.resolve();
}

function currentView() {
  return window.location.hash.replace(/^#/, '').split('?')[0];
}

function loadCurrentFeature() {
  loadFeatureForView(currentView()).catch(() => {
    // The core view remains usable even if an optional enhancement has to retry later.
  });
}

window.addEventListener('hashchange', loadCurrentFeature);
document.addEventListener('pointerover', (event) => {
  const target = event.target.closest?.('[data-view]');
  if (target?.dataset.view) loadFeatureForView(target.dataset.view).catch(() => {});
}, { capture: true, passive: true });
document.addEventListener('focusin', (event) => {
  const target = event.target.closest?.('[data-view]');
  if (target?.dataset.view) loadFeatureForView(target.dataset.view).catch(() => {});
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadCurrentFeature, { once: true });
} else {
  loadCurrentFeature();
}
