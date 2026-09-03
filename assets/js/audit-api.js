import { AUDIT_ACTIONS } from "./audit-actions-data.js?v=20260828-01";

const STORAGE_KEY = "lead-gestao-db-v2";
const FALLBACK_KEY = "lead-gestao-audit-fallback-v1";
const TOKEN_KEY = "lead-gestao-sync-token";

function fallbackItems() {
  try {
    const stored = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "null");
    return Array.isArray(stored) && stored.length ? stored : AUDIT_ACTIONS.map((item) => ({ ...item, updatedAt: null, updatedBy: null }));
  } catch {
    return AUDIT_ACTIONS.map((item) => ({ ...item, updatedAt: null, updatedBy: null }));
  }
}
function saveFallback(items) { localStorage.setItem(FALLBACK_KEY, JSON.stringify(items)); }
function userHeaders(includeJson = false) {
  const database = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  const session = (database?.sessions || []).find((item) => item.token === sessionStorage.getItem("lead-gestao-session"));
  const user = database?.users?.find((item) => Number(item.id) === Number(session?.userId));
  return {
    ...(includeJson ? { "content-type": "application/json" } : {}),
    ...(localStorage.getItem(TOKEN_KEY) ? { authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } : {}),
    "x-lead-username": user?.username || "",
    "x-lead-role": user?.role || ""
  };
}
function notificationCount(items) {
  try {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const user = database?.users?.find((item) => Number(item.id) === Number((database?.sessions || []).find((session) => session.token === sessionStorage.getItem("lead-gestao-session"))?.userId));
    if (!database || !user) return 0;
    const known = new Set((database.notifications || []).filter((item) => item.auditActionId).map((item) => Number(item.auditActionId)));
    items.filter((item) => item.username === user.username && !known.has(Number(item.id))).forEach((item) => {
      database.sequence.notifications = Number(database.sequence.notifications || 0) + 1;
      database.notifications.push({ id: database.sequence.notifications, auditActionId:Number(item.id), userId:Number(user.id), title:`Auditoria · ${item.pilar} ${item.questao}`, message:item.acao, level:item.status === "done" ? "success" : "warning", link:"audit", read:false, createdAt:new Date().toISOString() });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    return database.notifications.filter((item) => Number(item.userId) === Number(user.id) && !item.read).length;
  } catch { return 0; }
}
export function createAuditApi() {
  return {
    async auditActions() {
      try {
        const response = await fetch("/api/audit-actions", { headers:userHeaders(), cache:"no-store" });
        if (!response.ok) throw new Error("indisponível");
        const payload = await response.json();
        saveFallback(payload.items || []);
        payload.unreadCount = notificationCount(payload.items || []);
        return payload;
      } catch {
        const items = fallbackItems();
        return { items, syncedAt:new Date().toISOString(), unreadCount:notificationCount(items) };
      }
    },
    async updateAuditAction(_token, actionId, status) {
      try {
        const response = await fetch("/api/audit-actions", { method:"PATCH", headers:userHeaders(true), body:JSON.stringify({ actionId, status }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "indisponível");
        return payload;
      } catch {
        const items = fallbackItems();
        const item = items.find((entry) => Number(entry.id) === Number(actionId));
        if (!item) throw new Error("Ação não encontrada.");
        item.status = status; item.updatedAt = new Date().toISOString();
        saveFallback(items);
        return { item, syncedAt:item.updatedAt };
      }
    }
  };
}
