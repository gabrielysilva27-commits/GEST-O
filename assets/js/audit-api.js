const STORAGE_KEY = "lead-gestao-db-v2";
const TOKEN_KEY = "lead-gestao-sync-token";

export function createAuditApi(getUser) {
  function apiError(message, status) {
    const error = new Error(message);
    error.status = status;
    error.isSessionExpired = status === 401;
    return error;
  }

  function userHeaders(includeJson = false) {
    const user = getUser();
    return {
      ...(includeJson ? { "content-type": "application/json" } : {}),
      authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
      "x-lead-username": user?.username || "",
      "x-lead-role": user?.role || ""
    };
  }

  function notificationCount(items) {
    const user = getUser();
    if (!user || user.role === "admin") return 0;

    try {
      const database = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
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

  return {
    async auditActions() {
      if (!localStorage.getItem(TOKEN_KEY)) {
        throw apiError("Sua sessão de sincronização expirou. Saia e entre novamente para acessar as ações de auditoria.", 401);
      }
      const response = await fetch("/api/audit-actions", { headers: userHeaders(), cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw apiError(payload.error || "Não foi possível sincronizar o painel de auditoria.", response.status);
      payload.unreadCount = notificationCount(payload.items || []);
      return payload;
    },
    async updateAuditAction(_token, actionId, status) {
      if (!localStorage.getItem(TOKEN_KEY)) {
        throw apiError("Sua sessão de sincronização expirou. Saia e entre novamente antes de atualizar esta ação.", 401);
      }
      const response = await fetch("/api/audit-actions", { method: "PATCH", headers: userHeaders(true), body: JSON.stringify({ actionId, status }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw apiError(payload.error || "Não foi possível atualizar a ação.", response.status);
      return payload;
    }
  };
}
