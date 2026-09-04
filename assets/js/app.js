import { api as localApi, ApiError } from "./api.js?v=20260904-04";
import { createSharedApi } from "./shared-api.js?v=20260904-03";
import { createAuditApi } from "./audit-api.js?v=20260904-01";
import { clearSession, setSession, state } from "./state.js";
import { views } from "./modules/index.js?v=20260902-13";
import { applyGerotAdminChanges, loadGerotAdminChanges, removeGerotIndicator, saveGerotIndicator } from "./gerot-admin.js?v=20260904-03";
import { deleteOwnedAction, updateOwnedAction } from "./action-owner.js?v=20260903-01";

const api = createSharedApi(localApi);

const elements = {
  loginRoot: document.querySelector("#loginRoot"),
  app: document.querySelector("#app"),
  workspace: document.querySelector("#workspace"),
  loginForm: document.querySelector("#login-form"),
  loginError: document.querySelector("#login-error"),
  passwordResetForm: document.querySelector("#password-reset-form"),
  passwordResetError: document.querySelector("#password-reset-error"),
  passwordResetCodeInfo: document.querySelector("#password-reset-code-info"),
  passwordResetVerify: document.querySelector(".password-reset-verify"),
  passwordResetSubmit: document.querySelector("#password-reset-submit"),
  openPasswordReset: document.querySelector("#open-password-reset"),
  returnLoginButton: document.querySelector("#return-login-button"),
  loginPanelTitle: document.querySelector("#login-panel-title"),
  loginPanelDescription: document.querySelector("#login-panel-description"),
  loginCard: document.querySelector(".login-card"),
  navList: document.querySelector("#nav-list"),
  footerNavList: document.querySelector("#footer-nav-list"),
  darkModeToggle: document.querySelector("#dark-mode-toggle"),
  loginDarkModeToggle: document.querySelector("#login-dark-mode-toggle"),
  pageTitle: document.querySelector("#page-title"),
  pageContent: document.querySelector("#page-content"),
  userName: document.querySelector("#user-name"),
  userAvatar: document.querySelector("#user-avatar"),
  logoutButton: document.querySelector("#logout-button"),
  toastRegion: document.querySelector("#toast-region"),
  notificationBadge: document.querySelector("#notification-badge"),
  notificationLink: document.querySelector("#notification-link"),
  sidebar: document.querySelector(".sidebar"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  topbarMenu: document.querySelector("#topbar-menu"),
  statusBanner: document.querySelector("#status-banner")
};

const formRoutes = {
  users: "/users",
  companies: "/companies",
  units: "/units",
  adminMeetings: "/administration/meetings",
  actionPlans: "/action-plans",
  meetingActions: "/meetings/actions",
  meetings: "/meetings",
  gapa: "/gapa",
  dto: "/dto",
  anomalyReports: "/anomaly-reports",
  gerot: "/gerot"
};

let meetingTimerInterval = null;
let meetingTimerStartedAt = null;
let auditRefreshInterval = null;
const auditApi = createAuditApi(() => state.user);
let passwordResetStep = "request";

function applyTheme(isDark) {
  document.body.classList.toggle("dark-mode", isDark);
  [elements.darkModeToggle, elements.loginDarkModeToggle].forEach((toggle) => {
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(isDark));
      const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", isDark ? "Modo claro" : "Modo escuro");
    }
  });
}

function toggleDarkMode() {
  const isDark = !document.body.classList.contains("dark-mode");
  localStorage.setItem("lead-gestao-dark-mode", String(isDark));
  applyTheme(isDark);
}

function gerotRowsInDisplayOrder(area) {
  const rows = Array.isArray(area?.rows) ? area.rows : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const rendered = new Set();
  const memoriesFor = (row, visited = new Set()) => (Array.isArray(row.formulaInputs) ? row.formulaInputs : []).flatMap((id) => {
    if (visited.has(id)) return [];
    const memory = byId.get(id);
    if (!memory) return [];
    const next = new Set(visited).add(id);
    return [memory, ...memoriesFor(memory, next)];
  });
  const ordered = rows.filter((row) => !row.calculationInput).flatMap((row) => {
    const memories = memoriesFor(row);
    memories.forEach((memory) => rendered.add(memory.id));
    return [row, ...memories];
  });
  rows.filter((row) => row.calculationInput && !rendered.has(row.id)).forEach((row) => ordered.push(row));
  return ordered;
}

function createGerotBoard(table, area, isGeneral = false) {
  if (!table || table.dataset.boardReady === "true") return;
  table.dataset.boardReady = "true";
  const editorLayout = table.closest(".gerot-card");
  if (!editorLayout) return;
  editorLayout.dataset.gerotEditorLayout = "";
  const columnOffset = isGeneral ? 1 : 0;
  const rows = [...table.querySelectorAll("tbody tr")]
    .filter((row) => !row.classList.contains("gerot-memory-row"))
    .map((row) => {
      const cells = [...row.cells];
      const cellAt = (index) => cells[index + columnOffset];
      const kpi = cellAt(1)?.textContent.trim() || "";
      if (/^(REAL|TEND|TENDÊNCIA|TENDENCIA)$/i.test(kpi)) return "";
      const valueCell = (index) => {
        const cell = cellAt(index);
        const state = cell?.classList.contains("success") ? "success" : cell?.classList.contains("danger") ? "danger" : "";
        return '<td class="' + state + '">' + (cell?.textContent.trim() || "–") + "</td>";
      };
      const unit = cellAt(2)?.textContent.trim() || "–";
      const fy = cellAt(4)?.textContent.trim() || "–";
      const meta = cellAt(5)?.textContent.trim() || "–";
      const cia = cellAt(3)?.textContent.trim() || "–";
      const months = Array.from({ length: 12 }, (_, index) => valueCell(7 + index)).join("");
      return '<tr><th scope="row">' + (kpi || "Indicador") + "</th><td>" + unit + "</td><td>" + fy + '</td><td class="meta">' + meta + "</td><td>" + cia + "</td>" + valueCell(6) + months + "</tr>";
    }).filter(Boolean).join("");
  const board = document.createElement("section");
  board.className = "gerot-executive-board";
  board.dataset.gerotDisplayBoard = "";
  board.innerHTML = '<div class="gerot-board-banner"><span>GEROT - ' + area + '</span><small>Resultados mensais</small></div><div class="gerot-board-scroll"><table><thead><tr><th>KPI</th><th>UN</th><th>FY</th><th>META 2026</th><th>CIA</th><th>YTD</th><th>JAN</th><th>FEV</th><th>MAR</th><th>ABR</th><th>MAI</th><th>JUN</th><th>JUL</th><th>AGO</th><th>SET</th><th>OUT</th><th>NOV</th><th>DEZ</th></tr></thead><tbody>' + (rows || '<tr><td colspan="18" class="empty">Sem indicadores para exibição.</td></tr>') + '</tbody></table></div><p class="gerot-board-note">FY: EOY 2025 · CIA: comparativo 2024 · Valores atualizados conforme a memória de cálculo.</p>';
  editorLayout.before(board);
  editorLayout.hidden = true;
}

function buildGerotDisplayBoards(data) {
  if (!Array.isArray(data?.areas)) return;
  const general = elements.pageContent.querySelector("[data-gerot-general]");
  createGerotBoard(general?.querySelector(".gerot-general-table"), "GERAL", true);
  data.areas.forEach((area) => {
    const panel = elements.pageContent.querySelector('[data-gerot-panel="' + CSS.escape(area.area) + '"]');
    createGerotBoard(panel?.querySelector(".gerot-table"), area.area);
  });
}


function addGerotEditorControls(data) {
  buildGerotDisplayBoards(data);
  if (state.user?.role === "admin" || !Array.isArray(data?.areas)) return;
  data.areas.filter((area) => area.canEdit).forEach((area) => {
    const panel = elements.pageContent.querySelector('[data-gerot-panel="' + CSS.escape(area.area) + '"]');
    const table = panel?.querySelector(".gerot-table");
    if (!table || table.dataset.editorControls === "true") return;
    table.dataset.editorControls = "true";
    const header = table.querySelector("thead tr");
    if (header) header.insertAdjacentHTML("beforeend", '<th aria-label="Editar indicador"></th>');
    const orderedRows = gerotRowsInDisplayOrder(area);
    [...table.querySelectorAll("tbody tr")].forEach((tableRow, index) => {
      const row = orderedRows[index];
      const cell = document.createElement("td");
      cell.className = "gerot-indicator-actions";
      if (row && !row.calculationInput) {
        cell.innerHTML = '<button class="gerot-icon-button" type="button" data-gerot-indicator-edit="' + String(row.id).replaceAll('"', "&quot;") + '" data-gerot-indicator-area="' + String(area.area).replaceAll('"', "&quot;") + '" aria-label="Editar indicador" title="Editar indicador">✎</button>';
      }
      tableRow.appendChild(cell);
    });
  });
}

function showToast(message, tone = "success") {
  const node = document.createElement("div");
  node.className = `toast ${tone}`;
  node.textContent = message;
  elements.toastRegion.appendChild(node);
  setTimeout(() => node.remove(), 3600);
}

function showStatus(message) {
  elements.statusBanner.hidden = false;
  elements.statusBanner.textContent = message;
}

function hideStatus() {
  elements.statusBanner.hidden = true;
  elements.statusBanner.textContent = "";
}

function setLoggedOutUi() {
  elements.app.hidden = true;
  elements.workspace.hidden = true;
  elements.loginRoot.hidden = false;
  document.body.classList.remove("app-authenticated");
  document.body.classList.add("app-logged-out");
  elements.loginForm.reset();
  elements.passwordResetForm.reset();
  setLoginMode("login");
  elements.loginError.hidden = true;
  elements.loginError.textContent = "";
  elements.sidebar.classList.remove("is-open");
  state.isSidebarOpen = false;
  window.scrollTo(0, 0);
}

function setLoginMode(mode) {
  const isReset = mode === "reset";
  elements.loginForm.hidden = isReset;
  elements.passwordResetForm.hidden = !isReset;
  elements.loginCard.classList.toggle("is-reset", isReset);
  elements.loginPanelTitle.textContent = isReset ? "Redefinir senha" : "Acesse sua conta";
  elements.loginPanelDescription.textContent = isReset
    ? "Solicite um código temporário, validado pelo administrador."
    : "Entre para continuar o acompanhamento da sua operação.";
  elements.loginError.hidden = true;
  elements.loginError.textContent = "";
  elements.passwordResetError.hidden = true;
  elements.passwordResetError.textContent = "";
  passwordResetStep = "request";
  elements.passwordResetForm.reset();
  elements.passwordResetVerify.hidden = true;
  elements.passwordResetCodeInfo.hidden = true;
  elements.passwordResetCodeInfo.textContent = "";
  elements.passwordResetSubmit.textContent = "Solicitar código";

  if (isReset) {
    elements.passwordResetForm.querySelector("input[name='username']").focus();
  }
}

function setLoggedInUi() {
  elements.loginRoot.hidden = true;
  elements.app.hidden = false;
  elements.workspace.hidden = false;
  document.body.classList.remove("app-logged-out");
  document.body.classList.add("app-authenticated");
  window.scrollTo(0, 0);
}

function getAllowedViews() {
  const commonReadModules = new Set(["audit", "meetings", "gerot"]);
  return (state.lookups?.navigation || []).filter((item) =>
    commonReadModules.has(item.id) || state.user.permissions.includes(item.permission)
  );
}

function renderNavigation() {
  const items = getAllowedViews();
  const iconPaths = {
    dashboard: '<path d="M4 13h6V4H4v9zM14 20h6v-7h-6v7zM4 20h6v-3H4v3zM14 10h6V4h-6v6z"></path>',
    audit: '<path d="M5 3h11l3 3v15H5z"></path><path d="M16 3v4h4M8 12h8M8 16h6"></path>',
    actionPlans: '<path d="M5 12l4 4L19 6"></path><path d="M21 12a9 9 0 1 1-5-8.2"></path>',
    meetings: '<path d="M7 3v4M17 3v4M4 9h16M5 5h14v15H5z"></path><path d="M8 13h3M13 13h3"></path>',
    gapa: '<path d="M12 3v18M3 12h18"></path><circle cx="12" cy="12" r="8"></circle>',
    dto: '<path d="M6 3h9l3 3v15H6z"></path><path d="M9 12h6M9 16h4M15 3v4h4"></path>',
    anomalyReports: '<path d="M12 3l9 17H3z"></path><path d="M12 9v4M12 17h.01"></path>',
    gerot: '<path d="M4 7h16M7 3v4M17 3v4M6 11h12v9H6z"></path><path d="M9 14h6"></path>',
    users: '<circle cx="9" cy="8" r="3"></circle><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M17 11a3 3 0 1 0-1-5.8M18 14c2 1 3 3 3 6"></path>',
    notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5M12 7v5l3 2"></path>',
    administration: '<path d="M12 3v18M3 12h18"></path><path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"></path><circle cx="12" cy="12" r="3"></circle>'
  };
  const button = (item) => `
    <li>
      <button type="button" data-view="${item.id}" class="${state.currentView === item.id ? "active" : ""}">
        <span class="nav-icon-frame"><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[item.id] || iconPaths.dashboard}</svg></span>
        <span>${item.label}</span>
      </button>
    </li>`;
  elements.navList.innerHTML = items.filter((item) => item.id !== "administration").map(button).join("");
  elements.footerNavList.innerHTML = items.filter((item) => item.id === "administration").map(button).join("");
}

function refreshUserHeader() {
  const initials = state.user.avatar || (state.user.name || "LG").slice(0, 2).toUpperCase();
  elements.userName.textContent = state.user.name;
  elements.userAvatar.textContent = initials;
}

function getFormData(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());

  ["companyId", "unitId", "ownerId", "meetingId"].forEach((key) => {
    if (payload[key]) {
      payload[key] = Number(payload[key]);
    }
  });

  return payload;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("Não foi possível ler o documento selecionado.")));
    reader.readAsDataURL(file);
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function stopMeetingTimer() {
  if (meetingTimerInterval) {
    clearInterval(meetingTimerInterval);
  }
  meetingTimerInterval = null;
  meetingTimerStartedAt = null;
}

function startMeetingTimer(form) {
  const output = form.querySelector("[data-meeting-timer]");
  const button = form.querySelector("[data-start-meeting]");
  if (!output) {
    return;
  }

  stopMeetingTimer();
  meetingTimerStartedAt = Date.now();
  output.textContent = "00:00:00";
  if (button) {
    button.textContent = "Reunião em andamento";
    button.disabled = true;
  }
  meetingTimerInterval = setInterval(() => {
    output.textContent = formatDuration(Date.now() - meetingTimerStartedAt);
  }, 1000);
}

async function refreshBootstrap() {
  const bootstrap = await api.me(state.token);
  setSession({ token: state.token, user: bootstrap.user, lookups: bootstrap.lookups });
  refreshUserHeader();
  renderNavigation();
}

async function loadView(viewId) {
  const view = views[viewId];
  if (!view) {
    return;
  }

  if (viewId !== "meetings") {
    stopMeetingTimer();
  }

  if (auditRefreshInterval) {
    window.clearInterval(auditRefreshInterval);
    auditRefreshInterval = null;
  }

  if (viewId !== "actionPlans") {
    state.actionWorkspace = "list";
  }

  if (viewId !== "meetings") {
    state.meetingWorkspace = "active";
  }

  state.currentView = viewId;
  try {
    await api.presence(state.token, viewId);
  } catch {
    // A presença não impede o uso dos módulos se a conexão oscilar.
  }
  renderNavigation();
  elements.pageTitle.textContent = view.title;
  elements.pageContent.innerHTML = `
    <div class="empty-state">
      <div>
        <h2>Carregando...</h2>
        <p>Buscando dados do módulo selecionado.</p>
      </div>
    </div>
  `;

  try {
    const loadedData = await view.load(viewId === "audit" ? auditApi : api, state.token);
    const data = viewId === "gerot" ? applyGerotAdminChanges(loadedData, await loadGerotAdminChanges()) : loadedData;
    state.dataCache[viewId] = data;
    elements.pageContent.innerHTML = view.render(data, state);
    if (viewId === "gerot") addGerotEditorControls(data);

    if (viewId === "audit") {
      elements.notificationBadge.textContent = String(data.unreadCount || 0);
      auditRefreshInterval = window.setInterval(async () => {
        if (state.currentView !== "audit" || !state.token) return;
        try {
          const refreshed = await views.audit.load(auditApi, state.token);
          const previous = state.dataCache.audit;
          state.dataCache.audit = refreshed;
          const previousSignature = JSON.stringify((previous?.items || []).map((item) => [item.id, item.status, item.updatedAt]));
          const nextSignature = JSON.stringify((refreshed.items || []).map((item) => [item.id, item.status, item.updatedAt]));
          if (previousSignature === nextSignature) return;
          const activeFilters = Object.fromEntries([...elements.pageContent.querySelectorAll("[data-audit-filter]")].map((field) => [field.dataset.auditFilter, field.value]));
          elements.pageContent.innerHTML = views.audit.render(refreshed, state);
          Object.entries(activeFilters).forEach(([key, value]) => {
            const field = elements.pageContent.querySelector(`[data-audit-filter="${key}"]`);
            if (field) field.value = value;
          });
          applyAuditFilters();
        } catch {
          // Uma oscilação de sincronização não interrompe a tela atual.
        }
      }, 5000);
    }

    if (viewId === "notifications") {
      elements.notificationBadge.textContent = String(data.unreadCount || 0);
    }

    if (viewId === "dashboard") {
      elements.notificationBadge.textContent = String(data.highlights?.unreadNotifications || 0);
    }
  } catch (error) {
    handleError(error, "Não foi possível abrir o módulo selecionado.");
  }
}

function startPresenceHeartbeat() {
  window.setInterval(() => {
    if (state.token && state.user) {
      api.presence(state.token, state.currentView).catch(() => {});
    }
  }, 30000);
}

async function handleLogin(event) {
  event.preventDefault();
  elements.loginError.hidden = true;
  elements.loginError.textContent = "";

  const payload = Object.fromEntries(new FormData(elements.loginForm).entries());

  if (!payload.username?.trim() || !payload.password?.trim()) {
    elements.loginError.hidden = false;
    elements.loginError.textContent = "Informe usuário e senha para continuar.";
    return;
  }

  try {
    const session = await api.login(payload);
    setSession(session);
    setLoggedInUi();
    refreshUserHeader();
    renderNavigation();
    if (!window.location.hash) {
      window.location.hash = "dashboard";
    }
    await syncRoute();
    showToast("Login realizado com sucesso.");
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Falha ao autenticar.";
    elements.loginError.hidden = false;
    elements.loginError.textContent = message;
  }
}

async function handlePasswordReset(event) {
  event.preventDefault();
  elements.passwordResetError.hidden = true;
  elements.passwordResetError.textContent = "";

  const payload = Object.fromEntries(new FormData(elements.passwordResetForm).entries());

  if (passwordResetStep === "request") {
    if (!payload.username?.trim()) {
      elements.passwordResetError.hidden = false;
      elements.passwordResetError.textContent = "Informe seu nome de usuário para continuar.";
      return;
    }

    try {
      const response = await api.requestPasswordReset({ username: payload.username });
      passwordResetStep = "verify";
      elements.passwordResetVerify.hidden = false;
      elements.passwordResetCodeInfo.hidden = false;
      elements.passwordResetCodeInfo.textContent = response.message;
      elements.passwordResetSubmit.textContent = "Atualizar senha";
      elements.passwordResetForm.querySelector("input[name='code']").focus();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Não foi possível solicitar o código temporário.";
      elements.passwordResetError.hidden = false;
      elements.passwordResetError.textContent = message;
    }
    return;
  }

  if (payload.newPassword !== payload.confirmPassword) {
    elements.passwordResetError.hidden = false;
    elements.passwordResetError.textContent = "A confirmação deve ser igual à nova senha.";
    return;
  }

  try {
    await api.resetPassword(payload);
    const username = payload.username.trim();
    setLoginMode("login");
    elements.loginForm.querySelector("input[name='username']").value = username;
    elements.loginError.hidden = false;
    elements.loginError.textContent = "Senha atualizada. Entre com sua nova senha.";
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Não foi possível atualizar a senha.";
    elements.passwordResetError.hidden = false;
    elements.passwordResetError.textContent = message;
  }
}

async function handleLogout() {
  try {
    if (state.token) {
      await api.logout(state.token);
    }
  } catch (error) {
    showToast("A sessão local foi encerrada, mas a API retornou um aviso.", "error");
  } finally {
    clearSession();
    hideStatus();
    setLoggedOutUi();
    window.location.hash = "";
  }
}

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function gerotCsv(areas) {
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const headers = ["Área", "Categoria", "Tipo", "Indicador", "Unidade", "EOY 2024", "EOY 2025", "Meta 2026", "YTD referência", "Memórias utilizadas", "Fórmulas mensais", ...months];
  const escapeCell = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = areas.flatMap((area) => {
    const areaRows = Array.isArray(area.rows) ? area.rows : [];
    const rowsById = new Map(areaRows.map((row) => [row.id, row]));
    return areaRows.map((row) => [
      area.area,
      row.calculationInput ? "Memória de cálculo" : "Indicador",
      row.type || "",
      row.indicator || "",
      row.unit || "",
      row.eoy2024 ?? "",
      row.eoy2025 ?? "",
      row.goalMode === "range" ? `${row.targetMin ?? ""} a ${row.targetMax ?? ""}` : row.target ?? "",
      row.referenceYtd ?? "",
      (Array.isArray(row.formulaInputs) ? row.formulaInputs : []).map((id) => rowsById.get(id)?.indicator || id).join(" | "),
      (Array.isArray(row.formulas) ? row.formulas : []).filter(Boolean).join(" | "),
      ...months.map((_, index) => row.monthly?.[index] ?? "")
    ]);
  });
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

async function handleDynamicSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const formName = form.dataset.form;
  const path = formRoutes[formName];

  if (!path) {
    handleError(new Error("Formulário não reconhecido."), "Não foi possível identificar o formulário.");
    return;
  }

  try {
    const payload = getFormData(form);
    if (formName === "meetingActions" && payload.attachment instanceof File && payload.attachment.size > 0) {
      if (payload.attachment.size > 5 * 1024 * 1024) {
        throw new ApiError("O documento deve ter no máximo 5 MB.", 400);
      }
      payload.attachment = {
        name: payload.attachment.name,
        type: payload.attachment.type,
        size: payload.attachment.size,
        data: await fileToDataUrl(payload.attachment)
      };
    } else if (formName === "meetingActions") {
      delete payload.attachment;
    }
    await api.create(state.token, path, payload);
    showToast("Registro criado com sucesso.");

    if (formName === "meetingActions") {
      if (state.currentView === "actionPlans") {
        state.actionWorkspace = "list";
        await refreshBootstrap();
        await loadView("actionPlans");
        return;
      }
      form.querySelectorAll("[data-action-field]").forEach((field) => {
        if (field.tagName === "SELECT") {
          field.selectedIndex = 0;
          return;
        }
        field.value = "";
      });
      await refreshBootstrap();
      return;
    }

    await refreshBootstrap();
    await loadView(state.currentView);
    form.reset();
  } catch (error) {
    handleError(error, "Não foi possível salvar o registro.");
  }
}

function escapeOption(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function syncMeetingSubjectOptions(meetingSelect) {
  const form = meetingSelect.closest("form");
  const subjectSelect = form?.querySelector("[data-meeting-subject]");
  const submitButton = form?.querySelector("[data-save-meeting-action]");
  if (!subjectSelect) {
    return;
  }

  let subjects = [];
  try {
    subjects = JSON.parse(meetingSelect.selectedOptions[0]?.dataset.subjects || "[]");
  } catch {
    subjects = [];
  }

  if (subjects.length === 0) {
    subjectSelect.innerHTML = "<option value=\"\">Nenhum assunto cadastrado</option>";
    subjectSelect.disabled = true;
    if (submitButton) {
      submitButton.disabled = true;
    }
    return;
  }

  subjectSelect.disabled = false;
  if (submitButton) {
    submitButton.disabled = false;
  }
  subjectSelect.innerHTML = subjects
    .map((subject) => `<option value="${escapeOption(subject)}">${escapeOption(subject)}</option>`)
    .join("");
}

async function closeMeetingFromForm(form) {
  const payload = getFormData(form);

  if (!payload.meetingId || !payload.executionDate) {
    handleError(new Error("Informe reunião e data de execução."), "Informe reunião e data de execução.");
    return;
  }

  try {
    await api.patch(state.token, `/meetings/${payload.meetingId}/close`, {
      executionDate: payload.executionDate
    });
    stopMeetingTimer();
    showToast("Reunião encerrada com sucesso.");
    await refreshBootstrap();
    await loadView("meetings");
  } catch (error) {
    handleError(error, "Não foi possível encerrar a reunião.");
  }
}

async function handleDynamicClick(event) {
  const navButton = event.target.closest("[data-view]");
  if (navButton) {
    const viewId = navButton.dataset.view;
    window.location.hash = viewId;
    if (window.innerWidth <= 900) {
      toggleSidebar(false);
    }
    return;
  }

  const exportButton = event.target.closest("[data-export]");
  const auditActionButton = event.target.closest("[data-audit-action]");
  if (auditActionButton) {
    try {
      auditActionButton.disabled = true;
      const nextStatus = auditActionButton.dataset.auditStatus;
      await auditApi.updateAuditAction(state.token, auditActionButton.dataset.auditAction, nextStatus);
      showToast(nextStatus === "done" ? "Ação concluída com sucesso." : "Ação iniciada com sucesso.");
      await loadView("audit");
    } catch (error) {
      auditActionButton.disabled = false;
      handleError(error, "Não foi possível atualizar a ação de auditoria.");
    }
    return;
  }

  const clearAuditFiltersButton = event.target.closest("[data-clear-audit-filters]");
  if (clearAuditFiltersButton) {
    elements.pageContent.querySelectorAll("[data-audit-filter]").forEach((field) => { field.value = ""; });
    applyAuditFilters();
    return;
  }
  const gerotIndicatorAddButton = event.target.closest("[data-gerot-indicator-add]");
  if (gerotIndicatorAddButton) {
    const area = gerotIndicatorAddButton.dataset.gerotActionArea;
    if (!area || state.user?.role !== "admin") return;
    const indicator = window.prompt("Nome do indicador:");
    if (indicator === null) return;
    const unit = window.prompt("Unidade (ex.: %, R$, N°):", "%");
    if (unit === null) return;
    const target = window.prompt("Meta (deixe vazio se não houver):", "");
    if (target === null) return;
    const direction = window.prompt("Direção da meta: MA (maior), ME (menor) ou vazio:", "MA");
    if (direction === null) return;
    try {
      await saveGerotIndicator(area, { indicator, unit, target, goalMode: direction.trim().toUpperCase() === "ME" ? "lower" : direction.trim() ? "higher" : "none" }, true);
      showToast("Indicador incluído no GEROT.");
      await loadView("gerot");
    } catch (error) { handleError(error, "Não foi possível incluir o indicador."); }
    return;
  }
  const gerotIndicatorEditButton = event.target.closest("[data-gerot-indicator-edit]");
  if (gerotIndicatorEditButton) {
    const area = gerotIndicatorEditButton.dataset.gerotIndicatorArea;
    const areaRecord = state.dataCache.gerot?.areas?.find((item) => item.area === area);
    if (!areaRecord?.canEdit && state.user?.role !== "admin") return;
    const row = areaRecord?.rows?.find((item) => item.id === gerotIndicatorEditButton.dataset.gerotIndicatorEdit);
    if (!row) return;
    const indicator = window.prompt("Nome do indicador:", row.indicator || "");
    if (indicator === null) return;
    const unit = window.prompt("Unidade:", row.unit || "");
    if (unit === null) return;
    const eoy2024 = window.prompt("EOY 2024 (deixe vazio se não houver):", row.eoy2024 ?? "");
    if (eoy2024 === null) return;
    const eoy2025 = window.prompt("EOY 2025 (deixe vazio se não houver):", row.eoy2025 ?? "");
    if (eoy2025 === null) return;
    const target = window.prompt("Meta (deixe vazio se não houver):", row.target ?? "");
    if (target === null) return;
    const direction = window.prompt("Direção da meta: MA (maior), ME (menor) ou vazio:", row.goalMode === "lower" ? "ME" : row.goalMode === "higher" ? "MA" : "");
    if (direction === null) return;
    try {
      await saveGerotIndicator(area, { ...row, indicator, unit, eoy2024, eoy2025, target, goalMode: direction.trim().toUpperCase() === "ME" ? "lower" : direction.trim() ? "higher" : "none" });
      showToast("Indicador atualizado.");
      await loadView("gerot");
    } catch (error) { handleError(error, "Não foi possível atualizar o indicador."); }
    return;
  }
  const gerotIndicatorDeleteButton = event.target.closest("[data-gerot-indicator-delete]");
  if (gerotIndicatorDeleteButton) {
    if (state.user?.role !== "admin") return;
    const area = gerotIndicatorDeleteButton.dataset.gerotIndicatorArea;
    if (!window.confirm("Excluir este indicador do GEROT?")) return;
    await removeGerotIndicator(area, gerotIndicatorDeleteButton.dataset.gerotIndicatorDelete);
    showToast("Indicador excluído.");
    await loadView("gerot");
    return;
  }

  const editOwnedActionButton = event.target.closest("[data-edit-owned-action]");
  if (editOwnedActionButton) {
    const item = state.dataCache.actionPlans?.items?.find((entry) => String(entry.id) === String(editOwnedActionButton.dataset.editOwnedAction));
    if (!item || Number(item.ownerId) !== Number(state.user?.id)) return;
    const objective = window.prompt("Plano de ação:", item.objective || item.title || "");
    if (objective === null) return;
    const dueDate = window.prompt("Prazo (AAAA-MM-DD):", item.dueDate || "");
    if (dueDate === null) return;
    const priority = window.prompt("Prioridade: low, medium, high ou critical:", item.priority || "medium");
    if (priority === null) return;
    try {
      await updateOwnedAction(state.user, item.id, { objective, dueDate, priority });
      showToast("Ação atualizada.");
      await loadView("actionPlans");
    } catch (error) {
      handleError(error, "Não foi possível atualizar a ação.");
    }
    return;
  }

  const deleteOwnedActionButton = event.target.closest("[data-delete-owned-action]");
  if (deleteOwnedActionButton) {
    const item = state.dataCache.actionPlans?.items?.find((entry) => String(entry.id) === String(deleteOwnedActionButton.dataset.deleteOwnedAction));
    if (!item || Number(item.ownerId) !== Number(state.user?.id)) return;
    if (!window.confirm("Excluir esta ação?")) return;
    try {
      await deleteOwnedAction(state.user, item.id);
      showToast("Ação excluída.");
      await loadView("actionPlans");
    } catch (error) {
      handleError(error, "Não foi possível excluir a ação.");
    }
    return;
  }

  const gerotEditButton = event.target.closest("[data-gerot-edit]");
  if (gerotEditButton) {
    const actionArea = gerotEditButton.dataset.gerotActionArea;
    const scope = (actionArea && [...elements.pageContent.querySelectorAll("[data-gerot-panel]")].find((panel) => panel.dataset.gerotPanel === actionArea)) || gerotEditButton.closest("[data-gerot-panel]") || elements.pageContent;
    scope.querySelector("[data-gerot-display-board]")?.setAttribute("hidden", "");
    scope.querySelector("[data-gerot-editor-layout]")?.removeAttribute("hidden");
    scope.querySelector(".gerot-card")?.classList.add("is-editing");
    scope.querySelectorAll("[data-gerot-input]").forEach((input) => { input.disabled = false; });
    gerotEditButton.hidden = true;
    const saveButton = gerotEditButton.parentElement?.querySelector("[data-gerot-save]") || scope.querySelector("[data-gerot-save]");
    if (saveButton) saveButton.hidden = false;
    showToast("Edição mensal liberada.");
    return;
  }

  const gerotSaveButton = event.target.closest("[data-gerot-save]");
  if (gerotSaveButton) {
    try {
      const actionArea = gerotSaveButton.dataset.gerotActionArea;
      const scope = (actionArea && [...elements.pageContent.querySelectorAll("[data-gerot-panel]")].find((panel) => panel.dataset.gerotPanel === actionArea)) || gerotSaveButton.closest("[data-gerot-panel]") || elements.pageContent;
      const rows = new Map();
      scope.querySelectorAll("[data-gerot-input]").forEach((input) => {
        const id = input.dataset.gerotRow;
        if (!rows.has(id)) rows.set(id, { id, monthly: Array(12).fill(null) });
        rows.get(id).monthly[Number(input.dataset.gerotMonth)] = input.value === "" ? null : Number(input.value);
      });
      await api.patch(state.token, "/gerot/warehouse", { area: actionArea || scope.dataset.gerotPanel || "ARMAZÉM", rows: [...rows.values()] });
      showToast(`GEROT ${actionArea || scope.dataset.gerotPanel || "Armazém"} atualizado com sucesso.`);
      await loadView("gerot");
    } catch (error) {
      handleError(error, "Não foi possível atualizar o GEROT.");
    }
    return;
  }

  if (exportButton) {
    try {
      const entity = exportButton.dataset.export;
      const csv = entity === "gerot"
        ? gerotCsv(state.dataCache.gerot?.areas || [])
        : await api.exportCsv(state.token, entity);
      const filename = entity === "gerot"
        ? "GEROT-completo.csv"
        : entity === "meetings"
          ? "lead-reunioes-e-assuntos.csv"
          : `lead-${entity}.csv`;
      downloadCsv(filename, csv);
      showToast("Exportação concluída.");
    } catch (error) {
      handleError(error, "Não foi possível exportar o relatório.");
    }
    return;
  }

  const startMeetingButton = event.target.closest("[data-start-meeting]");
  if (startMeetingButton) {
    const form = startMeetingButton.closest("form[data-form='meetingActions']");
    if (form) {
      startMeetingTimer(form);
    }
    return;
  }

  const closeMeetingButton = event.target.closest("[data-close-meeting]");
  if (closeMeetingButton) {
    const form = closeMeetingButton.closest("form[data-form='meetingActions']");
    if (form) {
      await closeMeetingFromForm(form);
    }
    return;
  }

  const openActionFormButton = event.target.closest("[data-open-action-form]");
  if (openActionFormButton) {
    state.actionWorkspace = "create";
    await loadView("actionPlans");
    return;
  }

  const closeActionFormButton = event.target.closest("[data-close-action-form]");
  if (closeActionFormButton) {
    state.actionWorkspace = "list";
    await loadView("actionPlans");
    return;
  }

  const clearActionFiltersButton = event.target.closest("[data-clear-action-filters]");
  if (clearActionFiltersButton) {
    clearActionFilters();
    return;
  }

  const showHistoryButton = event.target.closest("[data-show-meeting-history]");
  if (showHistoryButton) {
    state.meetingWorkspace = "history";
    await loadView("meetings");
    return;
  }

  const showActiveMeetingsButton = event.target.closest("[data-show-active-meetings]");
  if (showActiveMeetingsButton) {
    state.meetingWorkspace = "active";
    await loadView("meetings");
    return;
  }

  const clearMeetingHistoryButton = event.target.closest("[data-meeting-history-clear]");
  if (clearMeetingHistoryButton) {
    elements.pageContent.querySelectorAll("[data-meeting-history-filter]").forEach((field) => { field.value = ""; });
    elements.pageContent.dataset.meetingHistoryPeriod = "all";
    applyMeetingHistoryFilters();
    return;
  }

  const meetingHistoryPeriodButton = event.target.closest("[data-meeting-history-period]");
  if (meetingHistoryPeriodButton) {
    elements.pageContent.dataset.meetingHistoryPeriod = meetingHistoryPeriodButton.dataset.meetingHistoryPeriod;
    applyMeetingHistoryFilters();
    return;
  }

  const deleteMeetingButton = event.target.closest("[data-delete-meeting]");
  if (deleteMeetingButton) {
    if (!window.confirm("Excluir esta reunião cadastrada?")) {
      return;
    }

    try {
      await api.patch(state.token, `/administration/meetings/${deleteMeetingButton.dataset.deleteMeeting}/delete`);
      showToast("Reunião excluída com sucesso.");
      await refreshBootstrap();
      await loadView("administration");
    } catch (error) {
      handleError(error, "Não foi possível excluir a reunião.");
    }
    return;
  }

  const completeActionButton = event.target.closest("[data-complete-action]");
  if (completeActionButton) {
    try {
      await api.patch(state.token, `/action-plans/${completeActionButton.dataset.completeAction}/complete`);
      showToast("Ação concluída com sucesso.");
      await refreshBootstrap();
      await loadView("actionPlans");
    } catch (error) {
      handleError(error, "Não foi possível concluir a ação.");
    }
    return;
  }

  const readButton = event.target.closest("[data-read-notification]");
  if (readButton) {
    try {
      await api.patch(state.token, `/notifications/${readButton.dataset.readNotification}/read`);
      await loadView("notifications");
      showToast("Notificação marcada como lida.");
    } catch (error) {
      handleError(error, "Não foi possível atualizar a notificação.");
    }
  }

  const approveResetButton = event.target.closest("[data-approve-password-reset]");
  if (approveResetButton) {
    try {
      const response = await api.patch(state.token, `/password-reset-requests/${approveResetButton.dataset.approvePasswordReset}/approve`);
      showToast(`Solicitação aprovada. Código: ${response.code}`);
      await loadView("users");
    } catch (error) {
      handleError(error, "Não foi possível aprovar a solicitação.");
    }
  }
}

function handleDynamicChange(event) {
  const gerotArea = event.target.closest("[data-gerot-area]");
  if (gerotArea) {
    const area = gerotArea.value;
    const panels = [...elements.pageContent.querySelectorAll("[data-gerot-panel]")];
    if (panels.length) {
      panels.forEach((panel) => { panel.hidden = panel.dataset.gerotPanel !== area; });
      const generalPanel = elements.pageContent.querySelector("[data-gerot-general]");
      if (generalPanel) generalPanel.hidden = area !== "GERAL";
      const selectedPanel = panels.find((panel) => panel.dataset.gerotPanel === area);
      const masterActions = elements.pageContent.querySelector("[data-gerot-master-actions]");
      if (masterActions) {
        const canEditArea = area !== "GERAL" && selectedPanel?.dataset.gerotCanEdit === "true";
        masterActions.hidden = !canEditArea;
        masterActions.querySelectorAll("[data-gerot-action-area], [data-gerot-edit], [data-gerot-save], [data-gerot-indicator-add]").forEach((button) => {
          button.dataset.gerotActionArea = canEditArea ? area : "";
        });
        const editButton = masterActions.querySelector("[data-gerot-edit]");
        const saveButton = masterActions.querySelector("[data-gerot-save]");
        if (editButton) editButton.hidden = false;
        if (saveButton) saveButton.hidden = true;
      }
      const masterTitle = elements.pageContent.querySelector("[data-gerot-master-title]");
      const masterSummary = elements.pageContent.querySelector("[data-gerot-master-summary]");
      if (masterTitle) masterTitle.textContent = `${area} · GEROT 2026`;
      if (masterSummary) masterSummary.textContent = area === "GERAL" ? "Todos os indicadores consolidados." : selectedPanel?.dataset.gerotPanelSummary || "";
      return;
    }
    const available = area === "ARMAZÉM";
    elements.pageContent.querySelectorAll("[data-gerot-details]").forEach((section) => { section.hidden = !available; });
    const editorActions = elements.pageContent.querySelector(".gerot-editor-actions");
    if (editorActions) editorActions.hidden = !available;
    if (!available) {
      elements.pageContent.querySelector(".gerot-card")?.classList.remove("is-editing");
      elements.pageContent.querySelectorAll("[data-gerot-input]").forEach((input) => { input.disabled = true; });
      const editButton = elements.pageContent.querySelector("[data-gerot-edit]");
      const saveButton = elements.pageContent.querySelector("[data-gerot-save]");
      if (editButton) editButton.hidden = false;
      if (saveButton) saveButton.hidden = true;
    }
    const title = elements.pageContent.querySelector("[data-gerot-title]");
    const summary = elements.pageContent.querySelector("[data-gerot-summary]");
    if (title) title.textContent = `${area} · GEROT 2026`;
    if (summary) summary.textContent = available ? summary.dataset.gerotDefaultSummary : `Aguardando importação da planilha de ${area}.`;
    return;
  }

  const meetingSelect = event.target.closest("[data-meeting-select]");
  if (meetingSelect) {
    syncMeetingSubjectOptions(meetingSelect);
  }

  if (event.target.matches("[data-action-filter]")) {
    applyActionFilters();
  }

  if (event.target.matches("[data-audit-filter]")) {
    applyAuditFilters();
  }

  if (event.target.matches("[data-meeting-history-filter]")) {
    applyMeetingHistoryFilters();
  }
}

function normalizeFilterValue(value = "") {
  return String(value).trim().toLocaleLowerCase("pt-BR");
}

function applyActionFilters() {
  const filterRoot = elements.pageContent.querySelector("[data-action-filters]");
  if (!filterRoot) {
    return;
  }

  const filters = Object.fromEntries(
    [...filterRoot.querySelectorAll("[data-action-filter]")].map((field) => [field.dataset.actionFilter, normalizeFilterValue(field.value)])
  );
  const rows = [...elements.pageContent.querySelectorAll("[data-action-row]")];
  let visible = 0;

  rows.forEach((row) => {
    const matches =
      (!filters.text || normalizeFilterValue(row.dataset.actionText).includes(filters.text)) &&
      (!filters.meeting || normalizeFilterValue(row.dataset.meeting) === filters.meeting) &&
      (!filters.requester || normalizeFilterValue(row.dataset.requester) === filters.requester) &&
      (!filters.owner || normalizeFilterValue(row.dataset.owner) === filters.owner) &&
      (!filters.status || row.dataset.status === filters.status) &&
      (!filters.executionMonth || row.dataset.executionMonth === filters.executionMonth);
    row.hidden = !matches;
    if (matches) {
      visible += 1;
    }
  });

  const output = elements.pageContent.querySelector("[data-action-filter-result]");
  if (output) {
    output.textContent = `${visible} ${visible === 1 ? "ação encontrada" : "ações encontradas"}`;
  }
}

function clearActionFilters() {
  const filterRoot = elements.pageContent.querySelector("[data-action-filters]");
  if (!filterRoot) {
    return;
  }
  filterRoot.querySelectorAll("[data-action-filter]").forEach((field) => {
    field.value = "";
  });
  applyActionFilters();
}

function applyMeetingHistoryFilters() {
  const rows = [...elements.pageContent.querySelectorAll("[data-meeting-history-row]")];
  if (rows.length === 0 && !elements.pageContent.querySelector("[data-meeting-history-result]")) {
    return;
  }

  const text = normalizeFilterValue(elements.pageContent.querySelector('[data-meeting-history-filter="text"]')?.value);
  const date = elements.pageContent.querySelector('[data-meeting-history-filter="date"]')?.value || "";
  const period = elements.pageContent.dataset.meetingHistoryPeriod || "all";
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  let visible = 0;

  rows.forEach((row) => {
    const rowDate = row.dataset.date ? new Date(`${row.dataset.date}T00:00:00`) : null;
    const matches =
      (!text || normalizeFilterValue(`${row.dataset.title} ${row.dataset.subjects}`).includes(text)) &&
      (!date || row.dataset.date === date) &&
      (period !== "month" || (rowDate && rowDate >= monthStart));
    row.hidden = !matches;
    if (matches) visible += 1;
  });

  const output = elements.pageContent.querySelector("[data-meeting-history-result]");
  if (output) {
    output.textContent = `${visible} ${visible === 1 ? "reunião executada encontrada" : "reuniões executadas encontradas"}`;
  }
}

function handleDynamicInput(event) {
  if (event.target.matches("[data-action-filter]")) {
    applyActionFilters();
  }

  if (event.target.matches("[data-audit-filter]")) {
    applyAuditFilters();
  }

  if (event.target.matches("[data-meeting-history-filter]")) {
    applyMeetingHistoryFilters();
  }
}

function applyAuditFilters() {
  const root = elements.pageContent.querySelector("[data-audit-filters]");
  if (!root) return;
  const values = Object.fromEntries([...root.querySelectorAll("[data-audit-filter]")].map((field) => [field.dataset.auditFilter, normalizeFilterValue(field.value)]));
  let visible = 0;
  elements.pageContent.querySelectorAll("[data-audit-row]").forEach((row) => {
    const matches = (!values.text || normalizeFilterValue(row.dataset.search).includes(values.text))
      && (!values.pilar || normalizeFilterValue(row.dataset.pilar) === values.pilar)
      && (!values.owner || normalizeFilterValue(row.dataset.owner) === values.owner)
      && (!values.status || row.dataset.status === values.status);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const output = root.querySelector("[data-audit-filter-result]");
  if (output) output.textContent = `${visible} ${visible === 1 ? "ação encontrada" : "ações encontradas"}`;
}

function handleError(error, fallback) {
  const message = error instanceof ApiError ? error.message : fallback;
  showToast(message, "error");
  showStatus(message);
}

function toggleSidebar(force) {
  state.isSidebarOpen = typeof force === "boolean" ? force : !state.isSidebarOpen;
  elements.sidebar.classList.toggle("is-open", state.isSidebarOpen);
}

async function syncRoute() {
  if (!state.token || !state.user) {
    setLoggedOutUi();
    return;
  }

  const fallback = getAllowedViews()[0]?.id || "dashboard";
  const viewId = window.location.hash.replace("#", "") || fallback;
  hideStatus();

  if (!views[viewId]) {
    window.location.hash = fallback;
    return;
  }

  await loadView(viewId);
}

function wireEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.passwordResetForm.addEventListener("submit", handlePasswordReset);
  elements.openPasswordReset.addEventListener("click", () => setLoginMode("reset"));
  elements.returnLoginButton.addEventListener("click", () => setLoginMode("login"));
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.darkModeToggle.addEventListener("click", toggleDarkMode);
  elements.loginDarkModeToggle.addEventListener("click", toggleDarkMode);
  elements.navList.addEventListener("click", handleDynamicClick);
  elements.footerNavList.addEventListener("click", handleDynamicClick);
  elements.pageContent.addEventListener("click", handleDynamicClick);
  elements.pageContent.addEventListener("change", handleDynamicChange);
  elements.pageContent.addEventListener("input", handleDynamicInput);
  elements.pageContent.addEventListener("submit", handleDynamicSubmit);
  elements.notificationLink.addEventListener("click", () => {
    window.location.hash = "notifications";
  });
  elements.sidebarToggle.addEventListener("click", () => toggleSidebar());
  elements.topbarMenu.addEventListener("click", () => toggleSidebar());
  window.addEventListener("hashchange", syncRoute);
}

async function bootstrap() {
  wireEvents();
  applyTheme(localStorage.getItem("lead-gestao-dark-mode") === "true");
  document.body.classList.add("app-logged-out");

  if (!state.token) {
    setLoggedOutUi();
    return;
  }

  try {
    await refreshBootstrap();
    setLoggedInUi();
    startPresenceHeartbeat();
    await syncRoute();
  } catch (error) {
    clearSession();
    setLoggedOutUi();
    showToast("Sua sessão expirou. Faça login novamente.", "error");
  }
}

bootstrap();
