const GEROT_ENTREGA_EDITOR_URL = "/gerot-entrega-editor.html";

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
    button.title = "Abrir planilha de edição do GEROT Entrega em uma nova guia";
    button.setAttribute("aria-label", "Abrir planilha do GEROT Entrega em nova guia");
  });
}

document.addEventListener("click", (event) => {
  const button = entregaEditButton(event.target);
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const url = new URL(GEROT_ENTREGA_EDITOR_URL, window.location.origin);
  const editorTab = window.open(url.href, "_blank");
  if (editorTab) {
    editorTab.focus();
    return;
  }
  window.location.assign(url.href);
}, true);

const observer = new MutationObserver(() => decorateEntregaEditButtons());
observer.observe(document.documentElement, { childList: true, subtree: true });
decorateEntregaEditButtons();
