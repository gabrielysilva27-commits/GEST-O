import { databaseStorage as localStorage } from './database-storage.js';

const KEY = "lead-gestao-db-v2";
const TOKEN_KEY = "lead-gestao-sync-token";
const FIELDS = ["companies", "units", "actionPlans", "meetings", "gapaRecords", "dtoRecords", "anomalyReports", "tickets", "tasks", "checklists", "safetyReports", "trainings", "notifications", "history", "gerotWarehouse", "gerotAdditionalAreas", "meta"];
const SYNC_ERROR = "Não foi possível confirmar a sincronização compartilhada. Nenhuma alteração foi aplicada.";
const SYNC_FRESH_MS = 1500;

let syncInFlight = null;
let lastSyncAt = 0;

const read = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
};

const headers = (json) => ({
  ...(json ? { "content-type": "application/json" } : {}),
  ...(localStorage.getItem(TOKEN_KEY) ? { authorization: "Bearer " + localStorage.getItem(TOKEN_KEY) } : {})
});

const project = (data) => {
  const output = {};
  for (const field of FIELDS) if (field in data) output[field] = data[field];
  output.sequence = Object.fromEntries(
    Object.entries(data.sequence || {}).filter(([field]) => !["users", "sessions", "passwordResetRequests"].includes(field))
  );
  return output;
};

const merge = (local, data) => local
  ? { ...local, ...data, sequence: { ...(local.sequence || {}), ...(data.sequence || {}) } }
  : local;

const markSynced = () => {
  lastSyncAt = Date.now();
};

async function loginSession(credentials) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(credentials)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível validar a sessão compartilhada.");
  localStorage.setItem(TOKEN_KEY, payload.token);
  lastSyncAt = 0;
}

export async function persistOperationalData() {
  const data = read();
  if (!data || !localStorage.getItem(TOKEN_KEY)) return false;
  try {
    const response = await fetch("/api/shared-data", {
      method: "PUT",
      headers: headers(true),
      body: JSON.stringify({ data: project(data) })
    });
    if (response.ok) markSynced();
    return response.ok;
  } catch {
    return false;
  }
}

async function performSharedSync() {
  const local = read();
  const hasSession = Boolean(localStorage.getItem(TOKEN_KEY));
  let response;
  try {
    response = await fetch(hasSession ? "/api/shared-data" : "/api/shared-view", {
      headers: headers(),
      cache: "no-store"
    });
  } catch {
    return false;
  }

  if (!response.ok) {
    if (hasSession && response.status === 401) localStorage.removeItem(TOKEN_KEY);
    return false;
  }

  const payload = await response.json().catch(() => null);
  if (!payload) return false;
  if (!payload.data) {
    const success = local && hasSession ? await persistOperationalData() : true;
    if (success) markSynced();
    return success;
  }

  const data = merge(local, payload.data);
  if (!data) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    return false;
  }
  markSynced();
  return true;
}

export async function syncOperationalData({ force = false } = {}) {
  if (!force && lastSyncAt && Date.now() - lastSyncAt < SYNC_FRESH_MS) return true;
  if (syncInFlight) return syncInFlight;

  syncInFlight = performSharedSync();
  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

async function requireSharedSync({ force = false } = {}) {
  if (!await syncOperationalData({ force })) throw new Error(SYNC_ERROR);
}

async function saveGerotRows(area, rows, cells) {
  const data = read();
  const areaData = String(area || "").toUpperCase() === "ARMAZÉM"
    ? data?.gerotWarehouse
    : data?.gerotAdditionalAreas?.[area];
  const response = await fetch("/api/gerot-data", {
    method: "PUT",
    headers: headers(true),
    body: JSON.stringify({ area, rows, cells, areaData })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível salvar o GEROT compartilhado.");
  markSynced();
  return payload;
}

export async function upsertLiveAction(item) {
  const response = await fetch("/api/live-actions", {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ item })
  });
  if (!response.ok) throw new Error(SYNC_ERROR);
  return (await response.json().catch(() => ({}))).item || item;
}

export async function removeLiveAction(actionId) {
  const response = await fetch("/api/live-actions/" + encodeURIComponent(actionId), {
    method: "DELETE",
    headers: headers()
  });
  if (!response.ok) throw new Error(SYNC_ERROR);
}

async function confirmLiveAction(item) {
  const saved = await upsertLiveAction(item);
  if (!await syncOperationalData({ force: true })) throw new Error(SYNC_ERROR);
  const current = read()?.actionPlans?.find((entry) => Number(entry.id) === Number(saved.id));
  if (!current || String(current.status) !== String(saved.status) || Number(current.ownerId) !== Number(saved.ownerId)) {
    throw new Error(SYNC_ERROR);
  }
  return current;
}

export function createSharedApi(api) {
  const readMethod = async (method, args) => {
    await requireSharedSync();
    return api[method](...args);
  };

  const mutate = async (method, args) => {
    const path = args[1] || "";
    const isGerotSave = method === "patch" && path === "/gerot/warehouse";
    const snapshot = localStorage.getItem(KEY);

    if (!isGerotSave) await requireSharedSync({ force: true });

    try {
      const result = await api[method](...args);
      if (isGerotSave) {
        await saveGerotRows(args[2]?.area, args[2]?.rows, args[2]?.cells);
        return result;
      }

      if (result?.item && (
        (method === "create" && (path === "/action-plans" || path === "/meetings/actions")) ||
        (method === "patch" && /^\/action-plans\/\d+\/complete$/.test(path))
      )) {
        return { ...result, item: await confirmLiveAction(result.item) };
      }

      if (!await persistOperationalData()) throw new Error(SYNC_ERROR);
      return result;
    } catch (error) {
      if (snapshot === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, snapshot);
      lastSyncAt = 0;
      throw error;
    }
  };

  return {
    ...api,
    requestPasswordReset: (...args) => api.requestPasswordReset(...args),
    login: async (credentials) => {
      const result = await api.login(credentials);
      try {
        await loginSession({ ...credentials, username: result.user?.username || credentials?.username });
        await requireSharedSync({ force: true });
        return result;
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        lastSyncAt = 0;
        throw error;
      }
    },
    resetPassword: (...args) => api.resetPassword(...args),
    me: (...args) => readMethod("me", args),
    logout: (...args) => api.logout(...args),
    dashboard: (...args) => readMethod("dashboard", args),
    // Presence is already persisted by its own Durable Object and never needs a full shared-database download.
    presence: (...args) => api.presence(...args),
    list: (...args) => readMethod("list", args),
    create: (...args) => mutate("create", args),
    patch: (...args) => mutate("patch", args),
    exportCsv: (...args) => readMethod("exportCsv", args)
  };
}
