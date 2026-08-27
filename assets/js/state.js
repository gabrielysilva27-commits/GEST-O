const STORAGE_KEY = "lead-gestao-token";

export const state = {
  token: localStorage.getItem(STORAGE_KEY) || "",
  user: null,
  lookups: null,
  currentView: "dashboard",
  dataCache: {},
  isSidebarOpen: false
};

export function persistToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function setSession({ token = "", user = null, lookups = null }) {
  persistToken(token);
  state.user = user;
  state.lookups = lookups;
}

export function clearSession() {
  persistToken("");
  state.user = null;
  state.lookups = null;
  state.dataCache = {};
}
