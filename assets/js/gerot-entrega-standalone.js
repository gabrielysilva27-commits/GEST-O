import { api as localApi } from "./api.js";
import { createSharedApi } from "./shared-api.js";
import { openDeliveryEditor } from "./gerot-delivery-editor.js";
import { setSession, state } from "./state.js";

const api = createSharedApi(localApi);
const root = document.querySelector("#delivery-workspace-root");
let loading = false;

function renderState(title, message, action = true) {
  root.innerHTML = `<main class="delivery-standalone-state"><div class="delivery-state-card"><span class="delivery-state-mark">GEROT · ENTREGA</span><h1>${title}</h1><p>${message}</p>${action ? '<button class="button primary" type="button" data-return-gerot>Voltar ao GEROT</button>' : ""}</div></main>`;
}

function returnToGerot() {
  if (window.opener && !window.opener.closed) {
    window.opener.focus();
    window.close();
    return;
  }
  window.location.assign("/#gerot");
}

function hasPendingChanges() {
  const editor = document.querySelector("[data-delivery-editor]");
  if (!editor) return false;
  return Boolean(editor.querySelector(".delivery-editable.is-changed, [data-delivery-input][aria-invalid='true']"));
}

function closeWorkspace() {
  if (hasPendingChanges() && !window.confirm("Descartar as alterações não salvas do GEROT Entrega?")) return;
  returnToGerot();
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
    controls.append(hint);
  }
}

async function loadEditor() {
  if (loading) return;
  loading = true;
  try {
    if (!state.token) {
      renderState("Sessão necessária", "Entre novamente no LEAD para editar o GEROT.");
      return;
    }
    const bootstrap = await api.me(state.token);
    setSession({ token: state.token, user: bootstrap.user, lookups: bootstrap.lookups });
    const gerot = await api.list(state.token, "/gerot");
    const delivery = gerot?.areas?.find((area) => area.area === "ENTREGA");
    if (!delivery) {
      renderState("GEROT Entrega indisponível", "Não foi possível carregar a planilha de Entrega agora.");
      return;
    }
    if (!delivery.canEdit) {
      renderState("Acesso somente para consulta", "Seu perfil não possui permissão de edição do GEROT Entrega. Os acessos existentes foram mantidos.");
      return;
    }

    root.innerHTML = '<div class="delivery-workspace-loading" aria-live="polite"><span></span><p>Preparando planilha...</p></div>';
    openDeliveryEditor(root, delivery, async (cells) => {
      await api.patch(state.token, "/gerot/warehouse", { area: "ENTREGA", cells });
      localStorage.setItem("lead-gerot-entrega-updated", String(Date.now()));
      window.setTimeout(() => loadEditor(), 80);
    });
    window.requestAnimationFrame(enhanceEditor);
  } catch (error) {
    renderState("Não foi possível abrir a edição", error?.message || "Ocorreu uma falha ao carregar o GEROT Entrega.");
  } finally {
    loading = false;
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-return-gerot]")) return returnToGerot();
  if (!event.target.closest("[data-delivery-close], [data-delivery-cancel]")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeWorkspace();
}, true);

document.addEventListener("keydown", (event) => {
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
  if (event.key === "Escape" && document.querySelector("[data-delivery-editor]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeWorkspace();
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
  document.querySelectorAll(".delivery-grid tr.is-active-row").forEach((row) => row.classList.remove("is-active-row"));
  const row = event.target.closest?.(".delivery-grid tbody tr");
  row?.classList.add("is-active-row");
});

window.addEventListener("beforeunload", (event) => {
  if (!hasPendingChanges()) return;
  event.preventDefault();
  event.returnValue = "";
});

loadEditor();
