import { api as localApi } from "./api.js";
import { createSharedApi } from "./shared-api.js";
import { openDeliveryEditor } from "./gerot-delivery-editor.js";
import { setSession, state } from "./state.js";

const api = createSharedApi(localApi);
const EDITOR_HASH = "#gerot-entrega-editor";
const GEROT_HASH = "#gerot";
const STYLE_ID = "gerot-delivery-workspace-style";
let routeActive = false;
let loading = false;
let hadEditor = false;
let reopenAfterSave = false;
let previousTitle = "";

function isEditorRoute() {
  return window.location.hash === EDITOR_HASH;
}

function entregaEditButton(target) {
  const button = target?.closest?.("[data-gerot-edit]");
  if (!button) return null;
  const area = button.dataset.gerotActionArea || button.closest("[data-gerot-panel]")?.dataset.gerotPanel || "";
  return area === "ENTREGA" ? button : null;
}

function decorateEntregaEditButtons(root = document) {
  root.querySelectorAll?.("[data-gerot-edit]").forEach((button) => {
    const area = button.dataset.gerotActionArea || button.closest("[data-gerot-panel]")?.dataset.gerotPanel || "";
    if (area !== "ENTREGA") return;
    button.title = "Editar GEROT Entrega";
    button.setAttribute("aria-label", "Abrir tela de edição do GEROT Entrega");
  });
}

function ensureWorkspaceStyles() {
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

function renderRouteState(title, message) {
  const root = routeRoot();
  root.innerHTML = `<main class="delivery-standalone-state"><div class="delivery-state-card"><span class="delivery-state-mark">LEAD · GEROT · ENTREGA</span><h1>${title}</h1><p>${message}</p><button class="button primary" type="button" data-delivery-route-back>Voltar ao GEROT</button></div></main>`;
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

function enhanceEditor() {
  const editor = document.querySelector("[data-delivery-editor]");
  if (!editor) return;
  document.body.classList.add("delivery-editor-ready");
  const heading = editor.querySelector(".delivery-heading");
  const eyebrow = heading?.querySelector(".eyebrow");
  if (eyebrow) eyebrow.textContent = "LEAD · GEROT · ENTREGA";
  const title = heading?.querySelector("h2");
  if (title && !title.dataset.internalTitle) {
    title.dataset.internalTitle = "true";
    title.insertAdjacentHTML("beforeend", ' <small style="font-size:.55em;font-weight:600;color:#74839a">· Edição</small>');
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
}

function prepareRouteShell() {
  if (!routeActive) previousTitle = document.title;
  routeActive = true;
  document.body.classList.add("delivery-workspace-page", "gerot-delivery-internal-route");
  document.title = "GEROT Entrega | Edição — LEAD Gestão";
  const app = document.querySelector("#app");
  const workspace = document.querySelector("#workspace");
  const login = document.querySelector("#loginRoot");
  if (state.token) {
    if (login) login.hidden = true;
    if (app) app.hidden = false;
    if (workspace) workspace.hidden = false;
  }
}

function cleanupRouteShell() {
  routeActive = false;
  hadEditor = false;
  reopenAfterSave = false;
  document.body.classList.remove("delivery-workspace-page", "delivery-editor-ready", "gerot-delivery-internal-route");
  document.querySelector("[data-gerot-delivery-route-root]")?.remove();
  if (previousTitle) document.title = previousTitle;
}

function goBackToGerot() {
  cleanupRouteShell();
  if (window.location.hash !== GEROT_HASH) window.location.hash = "gerot";
}

async function loadInternalEditor() {
  if (loading || !isEditorRoute()) return;
  loading = true;
  prepareRouteShell();
  await ensureWorkspaceStyles();
  const root = routeRoot();
  root.innerHTML = '<div class="delivery-workspace-loading" aria-live="polite"><span></span><p>Preparando planilha do GEROT Entrega...</p></div>';
  try {
    if (!state.token) {
      renderRouteState("Sessão necessária", "Entre novamente no LEAD para editar o GEROT Entrega.");
      return;
    }
    const bootstrap = await api.me(state.token);
    setSession({ token: state.token, user: bootstrap.user, lookups: bootstrap.lookups });
    const gerot = await api.list(state.token, "/gerot");
    const delivery = gerot?.areas?.find((area) => area.area === "ENTREGA");
    if (!delivery) {
      renderRouteState("GEROT Entrega indisponível", "Não foi possível carregar a planilha de Entrega agora.");
      return;
    }
    if (!delivery.canEdit) {
      renderRouteState("Acesso somente para consulta", "Seu perfil não possui permissão de edição do GEROT Entrega. Os acessos atuais foram mantidos.");
      return;
    }
    root.innerHTML = "";
    openDeliveryEditor(root, delivery, async (cells) => {
      await api.patch(state.token, "/gerot/warehouse", { area: "ENTREGA", cells });
      localStorage.setItem("lead-gerot-entrega-updated", String(Date.now()));
      reopenAfterSave = true;
    });
    window.requestAnimationFrame(enhanceEditor);
  } catch (error) {
    renderRouteState("Não foi possível abrir a edição", error?.message || "Ocorreu uma falha ao carregar o GEROT Entrega.");
  } finally {
    loading = false;
  }
}

function openInternalRoute() {
  if (!isEditorRoute()) history.pushState({ leadRoute: "gerot-entrega-editor" }, "", EDITOR_HASH);
  loadInternalEditor();
}

document.addEventListener("click", (event) => {
  const button = entregaEditButton(event.target);
  if (button) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openInternalRoute();
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

const pageObserver = new MutationObserver(() => decorateEntregaEditButtons());
pageObserver.observe(document.documentElement, { childList: true, subtree: true });
decorateEntregaEditButtons();

const editorObserver = new MutationObserver(() => {
  if (!routeActive) return;
  const editor = document.querySelector("[data-delivery-editor]");
  if (editor) {
    hadEditor = true;
    window.requestAnimationFrame(enhanceEditor);
    return;
  }
  if (!hadEditor) return;
  hadEditor = false;
  document.body.classList.remove("delivery-editor-ready");
  if (reopenAfterSave && isEditorRoute()) {
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
    if (document.querySelector("[data-delivery-editor]")) history.pushState({ leadRoute: "gerot-entrega-editor" }, "", EDITOR_HASH);
    return;
  }
  cleanupRouteShell();
});

if (isEditorRoute()) window.setTimeout(loadInternalEditor, 0);
