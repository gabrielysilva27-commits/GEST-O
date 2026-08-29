import { api, ApiError } from "./api.js?v=20260828-6";
import { clearSession, setSession, state } from "./state.js";
import { views } from "./modules/index.js?v=20260828-6";

const elements = {
  loginRoot: document.querySelector("#loginRoot"),
  app: document.querySelector("#app"),
  workspace: document.querySelector("#workspace"),
  loginForm: document.querySelector("#login-form"),
  loginError: document.querySelector("#login-error"),
  navList: document.querySelector("#nav-list"),
  footerNavList: document.querySelector("#footer-nav-list"),
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
  elements.loginError.hidden = true;
  elements.loginError.textContent = "";
  elements.sidebar.classList.remove("is-open");
  state.isSidebarOpen = false;
  window.scrollTo(0, 0);
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
  return (state.lookups?.navigation || []).filter((item) => state.user.permissions.includes(item.permission));
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

  state.currentView = viewId;
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
    const data = await view.load(api, state.token);
    state.dataCache[viewId] = data;
    elements.pageContent.innerHTML = view.render(data, state);

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
    await api.create(state.token, path, payload);
    showToast("Registro criado com sucesso.");

    if (formName === "meetingActions") {
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
  if (exportButton) {
    try {
      const entity = exportButton.dataset.export;
      const csv = await api.exportCsv(state.token, entity);
      downloadCsv(`lead-${entity}.csv`, csv);
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
}

function handleDynamicChange(event) {
  const meetingSelect = event.target.closest("[data-meeting-select]");
  if (meetingSelect) {
    syncMeetingSubjectOptions(meetingSelect);
  }
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
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.navList.addEventListener("click", handleDynamicClick);
  elements.footerNavList.addEventListener("click", handleDynamicClick);
  elements.pageContent.addEventListener("click", handleDynamicClick);
  elements.pageContent.addEventListener("change", handleDynamicChange);
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
  document.body.classList.add("app-logged-out");

  if (!state.token) {
    setLoggedOutUi();
    return;
  }

  try {
    await refreshBootstrap();
    setLoggedInUi();
    await syncRoute();
  } catch (error) {
    clearSession();
    setLoggedOutUi();
    showToast("Sua sessão expirou. Faça login novamente.", "error");
  }
}

bootstrap();
