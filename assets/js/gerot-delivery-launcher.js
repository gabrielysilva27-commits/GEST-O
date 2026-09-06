import { api as localApi } from "./api.js";
import { createSharedApi } from "./shared-api.js";
import { openDeliveryEditor } from "./gerot-delivery-editor.js";
import { gerotLivePreview } from "./modules/index.js";
import { setSession, state } from "./state.js";

const api = createSharedApi(localApi);
const GEROT_HASH = "#gerot";
const STYLE_ID = "gerot-delivery-workspace-style";
const ROUTE_STYLE_ID = "gerot-internal-route-style";
const AREA_ROUTES = Object.freeze({
  ENTREGA: { hash: "#gerot-entrega-editor", label: "Entrega", storageKey: "lead-gerot-entrega-updated" },
  "ARMAZÉM": { hash: "#gerot-armazem-editor", label: "Armazém", storageKey: "lead-gerot-armazem-updated" },
  PLANEJAMENTO: { hash: "#gerot-planejamento-editor", label: "Planejamento", storageKey: "lead-gerot-planejamento-updated" },
  CONTROLE: { hash: "#gerot-controle-editor", label: "Controle", storageKey: "lead-gerot-controle-updated" }
});

let routeActive = false;
let loading = false;
let hadEditor = false;
let reopenAfterSave = false;
let previousTitle = "";
let loadedArea = null;

function normalizeArea(value = "") {
  const normalized = String(value).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (normalized === "ARMAZEM") return "ARMAZÉM";
  return normalized;
}

function activeRoute() {
  return Object.entries(AREA_ROUTES).find(([, config]) => window.location.hash === config.hash) || null;
}

function isEditorRoute() {
  return Boolean(activeRoute());
}

function areaFromButton(button) {
  if (!button) return "";
  const explicit = button.dataset.gerotActionArea || button.closest("[data-gerot-panel]")?.dataset.gerotPanel;
  const selected = document.querySelector("[data-gerot-area]")?.value;
  const area = normalizeArea(explicit || selected || "");
  return AREA_ROUTES[area] ? area : "";
}

function gerotEditButton(target) {
  const button = target?.closest?.("[data-gerot-edit]");
  return areaFromButton(button) ? button : null;
}

function decorateGerotEditButtons(root = document) {
  root.querySelectorAll?.("[data-gerot-edit]").forEach((button) => {
    const area = areaFromButton(button);
    if (!area) return;
    const label = AREA_ROUTES[area].label;
    button.title = `Editar GEROT ${label}`;
    button.setAttribute("aria-label", `Abrir tela de edição do GEROT ${label}`);
  });
}

function ensureRouteLayoutStyle() {
  if (document.getElementById(ROUTE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ROUTE_STYLE_ID;
  style.textContent = `
    html.gerot-delivery-internal-route,
    body.gerot-delivery-internal-route {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
    }
    body.gerot-delivery-internal-route > #app,
    body.gerot-delivery-internal-route > #loginRoot {
      display: none !important;
    }
    body.gerot-delivery-internal-route > #delivery-workspace-root {
      position: fixed !important;
      inset: 0 !important;
      z-index: 1490 !important;
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      margin: 0 !important;
      overflow: hidden !important;
    }
    body.gerot-delivery-internal-route > .delivery-editor {
      position: fixed !important;
      inset: 0 !important;
      z-index: 1500 !important;
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      margin: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function ensureWorkspaceStyles() {
  ensureRouteLayoutStyle();
  const existing = document.getElementById(STYLE_ID);
  if (existing) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/assets/css/gerot-delivery-workspace.css";
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", resolve, { once: true });
    document.head.appendChild(link);
  });
}

function routeRoot() {
  let root = document.querySelector("[data-gerot-delivery-route-root]");
  if (!root) {
    root = document.createElement("div");
    root.id = "delivery-workspace-root";
    root.dataset.gerotDeliveryRouteRoot = "";
    document.body.appendChild(root);
  }
  return root;
}

function renderRouteState(area, title, message) {
  const root = routeRoot();
  root.innerHTML = `<main class="delivery-standalone-state"><div class="delivery-state-card"><span class="delivery-state-mark">LEAD · GEROT · ${area}</span><h1>${title}</h1><p>${message}</p><button class="button primary" type="button" data-delivery-route-back>Voltar ao GEROT</button></div></main>`;
}

function visibleInputs() {
  return [...document.querySelectorAll("[data-delivery-input]")].filter((input) => input.getClientRects().length);
}

function moveVertical(input, direction) {
  const month = input.dataset.deliveryMonth;
  const inputs = visibleInputs().filter((item) => item.dataset.deliveryMonth === month);
  const index = inputs.indexOf(input);
  const next = inputs[index + direction];
  if (next) {
    next.focus();
    next.select?.();
  }
}

function moveSequential(input, direction) {
  const inputs = visibleInputs();
  const index = inputs.indexOf(input);
  const next = inputs[index + direction];
  if (next) {
    next.focus();
    next.select?.();
  }
}

function enhanceEditor(area) {
  const editor = document.querySelector("[data-delivery-editor]");
  if (!editor) return;
  document.body.classList.add("delivery-editor-ready");
  const config = AREA_ROUTES[area];
  const heading = editor.querySelector(".delivery-heading");
  const eyebrow = heading?.querySelector(".eyebrow");
  if (eyebrow) eyebrow.textContent = `LEAD · GEROT · ${area}`;
  const title = heading?.querySelector("h2");
  if (title && !title.dataset.internalTitle) {
    title.dataset.internalTitle = "true";
    title.insertAdjacentHTML("beforeend", ' <small class="delivery-heading-mode">· Edição</small>');
  }
  const close = editor.querySelector("[data-delivery-close]");
  if (close) close.textContent = "← Voltar ao GEROT";
  const cancel = editor.querySelector("[data-delivery-cancel]");
  if (cancel) cancel.textContent = "Descartar";
  const save = editor.querySelector("[data-delivery-submit]");
  if (save) save.textContent = "Salvar alterações";
  const controls = editor.querySelector(".delivery-controls");
  if (controls && !controls.querySelector(".delivery-toolbar-hint")) {
    const hint = document.createElement("span");
    hint.className = "delivery-toolbar-hint";
    hint.textContent = "Ctrl+F buscar · Ctrl+S salvar · Tab/Enter navegar";
    controls.appendChild(hint);
  }
  editor.dataset.gerotArea = area;
  editor.setAttribute("aria-label", `Editar planilha GEROT ${config.label}`);
}

function prepareRouteShell(area) {
  if (!routeActive) previousTitle = document.title;
  routeActive = true;
  document.body.classList.add("delivery-workspace-page", "gerot-delivery-internal-route");
  document.documentElement.classList.add("gerot-delivery-internal-route");
  document.title = `GEROT ${AREA_ROUTES[area].label} | Edição — LEAD Gestão`;
}

function cleanupRouteShell() {
  routeActive = false;
  hadEditor = false;
  reopenAfterSave = false;
  loadedArea = null;
  document.body.classList.remove("delivery-workspace-page", "delivery-editor-ready", "gerot-delivery-internal-route");
  document.documentElement.classList.remove("gerot-delivery-internal-route");
  document.querySelector("[data-gerot-delivery-route-root]")?.remove();
  if (previousTitle) document.title = previousTitle;
}

function goBackToGerot() {
  cleanupRouteShell();
  if (window.location.hash !== GEROT_HASH) window.location.hash = "gerot";
}

function changedRowsFromCells(area, cells) {
  const changesById = new Map();
  cells.forEach((cell) => {
    if (!changesById.has(cell.id)) changesById.set(cell.id, []);
    changesById.get(cell.id).push(cell);
  });
  return [...changesById.entries()].map(([id, changes]) => {
    const source = area.rows.find((row) => String(row.id) === String(id));
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const value = source?.monthly?.[index];
      return value === "" || value === undefined ? null : value;
    });
    changes.forEach(({ month, value }) => { monthly[Number(month)] = value; });
    return { id, monthly };
  });
}

async function saveAreaChanges(area, cells) {
  if (area.area === "ENTREGA") {
    await api.patch(state.token, "/gerot/warehouse", { area: area.area, cells });
  } else {
    await api.patch(state.token, "/gerot/warehouse", { area: area.area, rows: changedRowsFromCells(area, cells) });
  }
  localStorage.setItem(AREA_ROUTES[area.area].storageKey, String(Date.now()));
  reopenAfterSave = true;
}

function buildLivePreview(area, rows) {
  return gerotLivePreview({ ...area, rows, calculatedYtd: true });
}

async function loadInternalEditor() {
  const route = activeRoute();
  if (loading || !route) return;
  const [areaName, config] = route;
  loading = true;
  prepareRouteShell(areaName);
  await ensureWorkspaceStyles();
  const root = routeRoot();
  root.innerHTML = `<div class="delivery-workspace-loading" aria-live="polite"><span></span><p>Preparando planilha do GEROT ${config.label}...</p></div>`;
  try {
    if (!state.token) {
      renderRouteState(areaName, "Sessão necessária", `Entre novamente no LEAD para editar o GEROT ${config.label}.`);
      return;
    }
    const bootstrap = await api.me(state.token);
    setSession({ token: state.token, user: bootstrap.user, lookups: bootstrap.lookups });
    const gerot = await api.list(state.token, "/gerot");
    const area = gerot?.areas?.find((item) => normalizeArea(item.area) === areaName);
    if (!area) {
      renderRouteState(areaName, `GEROT ${config.label} indisponível`, `Não foi possível carregar a planilha de ${config.label} agora.`);
      return;
    }
    if (!area.canEdit) {
      renderRouteState(areaName, "Acesso somente para consulta", `Seu perfil não possui permissão de edição do GEROT ${config.label}. Os acessos atuais foram mantidos.`);
      return;
    }
    loadedArea = area;
    root.innerHTML = "";
    openDeliveryEditor(
      root,
      area,
      async (cells) => saveAreaChanges(area, cells),
      (rows) => buildLivePreview(area, rows)
    );
    window.requestAnimationFrame(() => enhanceEditor(areaName));
  } catch (error) {
    renderRouteState(areaName, "Não foi possível abrir a edição", error?.message || `Ocorreu uma falha ao carregar o GEROT ${config.label}.`);
  } finally {
    loading = false;
  }
}

function openInternalRoute(area) {
  const config = AREA_ROUTES[area];
  if (!config) return;
  if (window.location.hash !== config.hash) history.pushState({ leadRoute: config.hash.slice(1), gerotArea: area }, "", config.hash);
  loadInternalEditor();
}

document.addEventListener("click", (event) => {
  const button = gerotEditButton(event.target);
  if (button) {
    const area = areaFromButton(button);
    if (!area) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openInternalRoute(area);
    return;
  }
  if (event.target.closest("[data-delivery-route-back]")) {
    event.preventDefault();
    goBackToGerot();
  }
}, true);

document.addEventListener("keydown", (event) => {
  if (!isEditorRoute()) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    const search = document.querySelector("[data-delivery-search]");
    if (search) {
      event.preventDefault();
      event.stopImmediatePropagation();
      search.focus();
      search.select?.();
    }
    return;
  }
  const input = event.target.closest?.("[data-delivery-input]");
  if (!input) return;
  if (event.key === "Tab") {
    event.preventDefault();
    event.stopImmediatePropagation();
    moveSequential(input, event.shiftKey ? -1 : 1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    event.stopImmediatePropagation();
    moveVertical(input, event.shiftKey ? -1 : 1);
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    event.stopImmediatePropagation();
    moveVertical(input, event.key === "ArrowUp" ? -1 : 1);
  }
}, true);

document.addEventListener("focusin", (event) => {
  if (!isEditorRoute()) return;
  document.querySelectorAll(".delivery-grid tr.is-active-row").forEach((row) => row.classList.remove("is-active-row"));
  event.target.closest?.(".delivery-grid tbody tr")?.classList.add("is-active-row");
});

const pageObserver = new MutationObserver(() => decorateGerotEditButtons());
pageObserver.observe(document.documentElement, { childList: true, subtree: true });
decorateGerotEditButtons();

const editorObserver = new MutationObserver(() => {
  if (!routeActive) return;
  const route = activeRoute();
  const editor = document.querySelector("[data-delivery-editor]");
  if (editor) {
    hadEditor = true;
    if (route) window.requestAnimationFrame(() => enhanceEditor(route[0]));
    return;
  }
  if (!hadEditor) return;
  hadEditor = false;
  document.body.classList.remove("delivery-editor-ready");
  if (reopenAfterSave && route) {
    reopenAfterSave = false;
    window.setTimeout(loadInternalEditor, 40);
    return;
  }
  goBackToGerot();
});
editorObserver.observe(document.body, { childList: true });

window.addEventListener("popstate", () => {
  if (isEditorRoute()) {
    loadInternalEditor();
    return;
  }
  if (!routeActive) return;
  const close = document.querySelector("[data-delivery-close]");
  if (close) {
    close.click();
    if (document.querySelector("[data-delivery-editor]") && loadedArea) {
      const config = AREA_ROUTES[loadedArea.area];
      history.pushState({ leadRoute: config.hash.slice(1), gerotArea: loadedArea.area }, "", config.hash);
    }
    return;
  }
  cleanupRouteShell();
});

if (isEditorRoute()) window.setTimeout(loadInternalEditor, 0);
