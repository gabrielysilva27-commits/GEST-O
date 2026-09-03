const STORAGE_KEY = "lead-gestao-db-v2";

export function createAuditApi(getUser) {
  function userHeaders(includeJson = false) {
    const user = getUser();
    return {
      ...(includeJson ? { "content-type": "application/json" } : {}),
      "authorization": `Bearer ${localStorage.getItem("lead-gestao-sync-token") || ""}`,
      "x-lead-username": user?.username || "",
      "x-lead-role": user?.role || ""
    };
  }

  function ensureAssignmentNotifications(items) {
    const user = getUser();
    if (!user || user.role === "admin") return 0;

    try {
      const database = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!database?.notifications || !database?.sequence) return 0;

      const known = new Set(database.notifications.filter((item) => item.auditActionId).map((item) => Number(item.auditActionId)));
      items.filter((item) => item.username === user.username).forEach((item) => {
        if (known.has(Number(item.id))) return;
        database.sequence.notifications = Number(database.sequence.notifications || 0) + 1;
        database.notifications.push({
          id: database.sequence.notifications,
          userId: Number(user.id),
          auditActionId: Number(item.id),
          title: `Auditoria · ${item.pilar} ${item.questao}`,
          message: item.acao,
          level: item.status === "done" ? "success" : "warning",
          link: "audit",
          read: false,
          createdAt: new Date().toISOString()
        });
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
      return database.notifications.filter((item) => Number(item.userId) === Number(user.id) && !item.read).length;
    } catch {
      return 0;
    }
  }

  return {
    async auditActions() {
      const response = await fetch("/api/audit-actions", { headers: userHeaders(), cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível sincronizar o painel de auditoria.");
      const payload = await response.json();
      payload.unreadCount = ensureAssignmentNotifications(payload.items || []);
      return payload;
    },

    async updateAuditAction(_token, actionId, status) {
      const response = await fetch("/api/audit-actions", {
        method: "PATCH",
        headers: userHeaders(true),
        body: JSON.stringify({ actionId, status })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a ação.");
      return payload;
    }
  };
}
