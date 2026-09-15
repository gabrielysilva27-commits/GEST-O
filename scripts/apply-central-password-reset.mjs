import fs from 'node:fs/promises';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Marcador ausente em ${label}`);
  return source.replace(before, after);
}

async function patchFile(path, patcher) {
  const source = await fs.readFile(path, 'utf8');
  const next = patcher(source);
  if (next !== source) await fs.writeFile(path, next);
}

await patchFile('recovered/runtime.js', (initial) => {
  let source = initial;

  source = replaceRequired(
    source,
    '      const body = await request.json().catch(() => ({})), user = sourceUser(body?.username);\n      if (!user || user.hash !== await passwordHash(body?.password))',
    '      const body = await request.json().catch(() => ({})), user = sourceUser(body?.username);\n      const passwordOverrides = await this.state.storage.get("passwordOverrides") || {};\n      const expectedHash = user ? passwordOverrides[normalizeUsername(user.username)] || user.hash : "";\n      if (!user || expectedHash !== await passwordHash(body?.password))',
    'autenticacao central'
  );

  if (!source.includes('// PASSWORD_RESET_CENTRAL_V1')) {
    const marker = '    if (path === "/api/shared-view") {';
    if (!source.includes(marker)) throw new Error('Marcador de shared-view ausente');
    const block = `    // PASSWORD_RESET_CENTRAL_V1\n    if (path === "/api/password-reset/request") {\n      if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });\n      const body = await request.json().catch(() => ({}));\n      const username = String(body?.username || "").trim();\n      if (!username) return Response.json({ error: "Informe seu nome de usuário para continuar." }, { status: 400 });\n      const user = sourceUser(username);\n      if (!user) return Response.json({ success: true, message: "Se o usuário existir, a solicitação será encaminhada para validação do ADM." });\n      const now = Date.now();\n      let requests = await this.state.storage.get("passwordResetRequests") || [];\n      requests = Array.isArray(requests) ? requests : [];\n      requests = requests.map((entry) => {\n        const expiredPending = entry.status === "pending" && Number(new Date(entry.requestExpiresAt || entry.expiresAt || 0)) < now;\n        const expiredApproved = entry.status === "approved" && Number(new Date(entry.expiresAt || 0)) < now;\n        return expiredPending || expiredApproved ? { ...entry, status: "expired" } : entry;\n      });\n      const normalized = normalizeUsername(user.username);\n      const active = requests.find((entry) => normalizeUsername(entry.username) === normalized && ["pending", "approved"].includes(entry.status));\n      if (active) {\n        await this.state.storage.put("passwordResetRequests", requests);\n        return Response.json({ success: true, message: "Solicitação já registrada. Aguarde a validação do ADM." });\n      }\n      const id = crypto.randomUUID();\n      const createdAt = new Date(now).toISOString();\n      const requestExpiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();\n      requests.push({ id, username: user.username, status: "pending", createdAt, requestExpiresAt, approvedAt: null, approvedBy: null, code: null, expiresAt: null });\n      await this.state.storage.put("passwordResetRequests", requests);\n      let notifications = await this.state.storage.get("liveNotifications") || [];\n      notifications = Array.isArray(notifications) ? notifications : [];\n      notifications.push({ id: "password-reset-" + id, userId: 1, actionPlanId: 0, title: "Redefinição de senha", message: user.username + " solicitou redefinição de senha.", level: "warning", link: "administration", read: false, createdAt });\n      await this.state.storage.put("liveNotifications", notifications);\n      return Response.json({ success: true, message: "Solicitação registrada. O ADM precisa aprovar o código antes da troca de senha." });\n    }\n    if (path === "/api/password-reset/reset") {\n      if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });\n      const body = await request.json().catch(() => ({}));\n      const username = String(body?.username || "").trim();\n      const code = String(body?.code || "").trim();\n      const newPassword = String(body?.newPassword || "").trim();\n      if (!username || !code || !newPassword) return Response.json({ error: "Informe usuário, código temporário e nova senha." }, { status: 400 });\n      if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\\d/.test(newPassword)) return Response.json({ error: "A nova senha deve ter ao menos 8 caracteres, com letras e números." }, { status: 400 });\n      const user = sourceUser(username);\n      let requests = await this.state.storage.get("passwordResetRequests") || [];\n      requests = Array.isArray(requests) ? requests : [];\n      const normalized = normalizeUsername(username);\n      const entry = requests.find((item) => normalizeUsername(item.username) === normalized && String(item.code || "") === code && item.status === "approved");\n      if (!user || !entry) return Response.json({ error: "Código temporário inválido ou ainda não aprovado pelo ADM." }, { status: 401 });\n      if (new Date(entry.expiresAt || 0).getTime() < Date.now()) {\n        entry.status = "expired";\n        await this.state.storage.put("passwordResetRequests", requests);\n        return Response.json({ error: "O código temporário expirou. Solicite um novo código." }, { status: 401 });\n      }\n      const overrides = await this.state.storage.get("passwordOverrides") || {};\n      overrides[normalizeUsername(user.username)] = await passwordHash(newPassword);\n      await this.state.storage.put("passwordOverrides", overrides);\n      entry.status = "used";\n      entry.usedAt = new Date().toISOString();\n      await this.state.storage.put("passwordResetRequests", requests);\n      const sessions = await this.state.storage.get("sessions") || {};\n      for (const [token, claim] of Object.entries(sessions)) if (normalizeUsername(claim?.username) === normalizeUsername(user.username)) delete sessions[token];\n      await this.state.storage.put("sessions", sessions);\n      return Response.json({ success: true });\n    }\n`;
    source = source.replace(marker, block + marker);
  }

  if (!source.includes('// PASSWORD_RESET_ADMIN_V1')) {
    const marker = '    const liveActionDelete = path.match(/^\\/api\\/live-actions\\/(\\d+)$/);';
    if (!source.includes(marker)) throw new Error('Marcador de rotas autenticadas ausente');
    const block = `    // PASSWORD_RESET_ADMIN_V1\n    if (path === "/api/password-reset/requests") {\n      if (request.method !== "GET") return Response.json({ error: "Método não permitido." }, { status: 405 });\n      if (claim.role !== "admin") return Response.json({ error: "Somente o ADM pode visualizar solicitações de senha." }, { status: 403 });\n      const now = Date.now();\n      let requests = await this.state.storage.get("passwordResetRequests") || [];\n      requests = Array.isArray(requests) ? requests : [];\n      let changed = false;\n      const expiredIds = new Set();\n      requests = requests.map((entry) => {\n        const expiredPending = entry.status === "pending" && new Date(entry.requestExpiresAt || entry.expiresAt || 0).getTime() < now;\n        const expiredApproved = entry.status === "approved" && new Date(entry.expiresAt || 0).getTime() < now;\n        if (expiredPending || expiredApproved) { changed = true; expiredIds.add(String(entry.id)); return { ...entry, status: "expired" }; }\n        return entry;\n      });\n      if (changed) {\n        await this.state.storage.put("passwordResetRequests", requests);\n        const notifications = (await this.state.storage.get("liveNotifications") || []).filter((item) => !expiredIds.has(String(item.id || "").replace(/^password-reset-/, "")));\n        await this.state.storage.put("liveNotifications", notifications);\n      }\n      const items = requests.filter((entry) => ["pending", "approved"].includes(entry.status)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map((entry) => ({ id: entry.id, username: entry.username, status: entry.status, createdAt: entry.createdAt, approvedAt: entry.approvedAt || null, expiresAt: entry.status === "approved" ? entry.expiresAt : entry.requestExpiresAt, code: entry.status === "approved" ? entry.code : null }));\n      return Response.json({ items });\n    }\n    const passwordResetApprove = path.match(/^\\/api\\/password-reset\\/requests\\/([^/]+)\\/approve$/);\n    if (passwordResetApprove) {\n      if (request.method !== "PATCH") return Response.json({ error: "Método não permitido." }, { status: 405 });\n      if (claim.role !== "admin") return Response.json({ error: "Somente o ADM pode aprovar redefinições de senha." }, { status: 403 });\n      const requests = await this.state.storage.get("passwordResetRequests") || [];\n      const entry = (Array.isArray(requests) ? requests : []).find((item) => String(item.id) === String(passwordResetApprove[1]));\n      if (!entry || entry.status !== "pending") return Response.json({ error: "Solicitação não encontrada ou já processada." }, { status: 404 });\n      if (new Date(entry.requestExpiresAt || 0).getTime() < Date.now()) {\n        entry.status = "expired";\n        await this.state.storage.put("passwordResetRequests", requests);\n        return Response.json({ error: "A solicitação expirou. O usuário deve solicitar novamente." }, { status: 400 });\n      }\n      const values = new Uint32Array(1);\n      crypto.getRandomValues(values);\n      entry.code = String(values[0] % 1000000).padStart(6, "0");\n      entry.status = "approved";\n      entry.approvedAt = new Date().toISOString();\n      entry.approvedBy = claim.username;\n      entry.expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();\n      await this.state.storage.put("passwordResetRequests", requests);\n      const notificationId = "password-reset-" + entry.id;\n      await this.state.storage.put("liveNotifications", (await this.state.storage.get("liveNotifications") || []).filter((item) => String(item.id) !== notificationId));\n      return Response.json({ success: true, code: entry.code, expiresAt: entry.expiresAt });\n    }\n    const passwordResetNotification = path.match(/^\\/api\\/password-reset\\/notifications\\/([^/]+)\\/read$/);\n    if (passwordResetNotification) {\n      if (request.method !== "PATCH") return Response.json({ error: "Método não permitido." }, { status: 405 });\n      if (claim.role !== "admin") return Response.json({ error: "Somente o ADM pode atualizar este alerta." }, { status: 403 });\n      const id = decodeURIComponent(passwordResetNotification[1]);\n      const notifications = await this.state.storage.get("liveNotifications") || [];\n      const item = (Array.isArray(notifications) ? notifications : []).find((entry) => String(entry.id) === id);\n      if (!item) return Response.json({ error: "Notificação não encontrada." }, { status: 404 });\n      item.read = true;\n      await this.state.storage.put("liveNotifications", notifications);\n      return Response.json({ success: true, item });\n    }\n`;
    source = source.replace(marker, block + marker);
  }

  source = replaceRequired(
    source,
    '    if (pathname === "/api/session" || pathname.startsWith("/api/live-actions/")',
    '    if (pathname === "/api/session" || pathname.startsWith("/api/password-reset/") || pathname.startsWith("/api/live-actions/")',
    'roteamento password reset'
  );

  return source;
});

await patchFile('assets/js/shared-api.js', (initial) => {
  let source = initial;

  if (!source.includes('// PASSWORD_RESET_SHARED_V1')) {
    const marker = 'export async function persistOperationalData() {';
    if (!source.includes(marker)) throw new Error('Marcador shared-api ausente');
    const helpers = `// PASSWORD_RESET_SHARED_V1\nasync function passwordDigest(value) {\n  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")));\n  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");\n}\n\nasync function alignLocalPassword(username, password) {\n  const data = read();\n  const user = data?.users?.find((item) => String(item.username || "").trim().toLocaleLowerCase("pt-BR") === String(username || "").trim().toLocaleLowerCase("pt-BR"));\n  if (!user) return false;\n  user.passwordHash = await passwordDigest(password);\n  user.updatedAt = new Date().toISOString();\n  localStorage.setItem(KEY, JSON.stringify(data));\n  return true;\n}\n\nasync function passwordResetRequest(credentials) {\n  const response = await fetch("/api/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials || {}) });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(payload.error || "Não foi possível solicitar o código temporário.");\n  return payload;\n}\n\nasync function passwordResetApply(credentials) {\n  const response = await fetch("/api/password-reset/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials || {}) });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a senha.");\n  await alignLocalPassword(credentials?.username, credentials?.newPassword);\n  return payload;\n}\n\nasync function passwordResetRequests() {\n  const response = await fetch("/api/password-reset/requests", { headers: headers(), cache: "no-store" });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar as redefinições de senha.");\n  return payload;\n}\n\nasync function approvePasswordReset(requestId) {\n  const response = await fetch("/api/password-reset/requests/" + encodeURIComponent(requestId) + "/approve", { method: "PATCH", headers: headers(true), body: "{}" });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(payload.error || "Não foi possível aprovar a solicitação.");\n  return payload;\n}\n\nasync function markPasswordResetNotificationRead(notificationId) {\n  const response = await fetch("/api/password-reset/notifications/" + encodeURIComponent(notificationId) + "/read", { method: "PATCH", headers: headers(true), body: "{}" });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a notificação.");\n  return payload;\n}\n\n`;
    source = source.replace(marker, helpers + marker);
  }

  source = replaceRequired(
    source,
    '    requestPasswordReset: (...args) => api.requestPasswordReset(...args),\n    login: async (credentials) => {\n      const result = await api.login(credentials);\n      try {\n        await loginSession({ ...credentials, username: result.user?.username || credentials?.username });\n        await requireSharedSync({ force: true });\n        return result;',
    '    requestPasswordReset: (...args) => passwordResetRequest(...args),\n    login: async (credentials) => {\n      try {\n        await loginSession(credentials);\n        let result;\n        try {\n          result = await api.login(credentials);\n        } catch (localError) {\n          if (!await alignLocalPassword(credentials?.username, credentials?.password)) throw localError;\n          result = await api.login(credentials);\n        }\n        await requireSharedSync({ force: true });\n        return result;',
    'login compartilhado'
  );

  source = replaceRequired(
    source,
    '    resetPassword: (...args) => api.resetPassword(...args),\n    me: (...args) => readMethod("me", args, { fresh: true }),',
    '    resetPassword: (...args) => passwordResetApply(...args),\n    passwordResetRequests: () => passwordResetRequests(),\n    me: (...args) => readMethod("me", args, { fresh: true }),',
    'metodos password reset'
  );

  source = replaceRequired(
    source,
    '    patch: (...args) => mutate("patch", args),',
    '    patch: (...args) => {\n      const path = args[1] || "";\n      const approveMatch = path.match(/^\\/password-reset-requests\\/([^/]+)\\/approve$/);\n      if (approveMatch) return approvePasswordReset(approveMatch[1]);\n      const notificationMatch = path.match(/^\\/notifications\\/(password-reset-[^/]+)\\/read$/);\n      if (notificationMatch) return markPasswordResetNotificationRead(notificationMatch[1]);\n      return mutate("patch", args);\n    },',
    'patch remoto password reset'
  );

  return source;
});

await patchFile('assets/js/modules/index.js', (initial) => {
  let source = initial;

  if (!source.includes('const resetRequests = arrayValue(data.passwordResetRequests);')) {
    source = replaceRequired(
      source,
      '  const users = data.users || [];\n  const activeUsers = users.filter((item) => item.status === "active").length;',
      '  const users = data.users || [];\n  const resetRequests = arrayValue(data.passwordResetRequests);\n  const pendingResetRequests = resetRequests.filter((item) => item.status === "pending");\n  const resetRows = resetRequests.map((item) => [\n    escapeHtml(item.username),\n    item.status === "approved" ? "<span class=\\"badge success\\">Aprovado</span>" : "<span class=\\"badge warning\\">Aguardando ADM</span>",\n    escapeHtml(formatDate(item.createdAt)),\n    item.status === "approved" && item.code ? `<strong class="reset-code">${escapeHtml(item.code)}</strong>` : "Aguardando aprovação",\n    escapeHtml(formatDate(item.expiresAt)),\n    item.status === "pending" ? `<button class="button secondary" type="button" data-approve-password-reset="${escapeHtml(item.id)}">Aprovar e gerar código</button>` : "<span class=\\"badge info\\">Código liberado</span>"\n  ]);\n  const activeUsers = users.filter((item) => item.status === "active").length;',
      'dados de reset no ADM'
    );
  }

  if (!source.includes('<span>Redefinições pendentes</span>')) {
    source = replaceRequired(
      source,
      '      <article>\n        <span>Usuários ativos</span>\n        <strong>${escapeHtml(activeUsers)}</strong>\n        <small>acessos liberados</small>\n      </article>\n    </section>',
      '      <article>\n        <span>Usuários ativos</span>\n        <strong>${escapeHtml(activeUsers)}</strong>\n        <small>acessos liberados</small>\n      </article>\n      <article>\n        <span>Redefinições pendentes</span>\n        <strong>${escapeHtml(pendingResetRequests.length)}</strong>\n        <small>aguardando aprovação</small>\n      </article>\n    </section>',
      'card de reset no ADM'
    );
  }

  if (!source.includes('administration-password-reset')) {
    source = replaceRequired(
      source,
      '    <div class="administration-export-actions">',
      '    ${tableCard("Redefinição de senha", "Solicitações centralizadas. Aprove para gerar um código válido por 30 minutos.", ["Usuário", "Status", "Solicitado em", "Código", "Validade", "Ação"], resetRows, "administration-password-reset")}\n    <div class="administration-export-actions">',
      'tabela de reset no ADM'
    );
  }

  source = replaceRequired(
    source,
    '    load: (api, token) => api.list(token, "/administration/meetings"),\n    render: (data, context) => administrationView(data, context)',
    '    load: async (api, token) => {\n      const [administration, passwordResets] = await Promise.all([\n        api.list(token, "/administration/meetings"),\n        api.passwordResetRequests(token)\n      ]);\n      return { ...administration, passwordResetRequests: passwordResets.items || [] };\n    },\n    render: (data, context) => administrationView(data, context)',
    'load do ADM'
  );

  return source;
});

await patchFile('assets/js/app.js', (initial) => {
  let source = initial;
  source = replaceRequired(
    source,
    '      showToast(`Solicitação aprovada. Código: ${response.code}`);\n      await loadView("users");',
    '      showToast(`Solicitação aprovada. Código: ${response.code}`);\n      await loadView("administration");',
    'retorno da aprovacao'
  );
  source = source.replace('const message = error instanceof ApiError ? error.message : "Não foi possível solicitar o código temporário.";', 'const message = error instanceof ApiError ? error.message : error?.message || "Não foi possível solicitar o código temporário.";');
  source = source.replace('const message = error instanceof ApiError ? error.message : "Não foi possível atualizar a senha.";', 'const message = error instanceof ApiError ? error.message : error?.message || "Não foi possível atualizar a senha.";');
  return source;
});

const validations = [
  ['recovered/runtime.js', 'PASSWORD_RESET_CENTRAL_V1'],
  ['recovered/runtime.js', 'PASSWORD_RESET_ADMIN_V1'],
  ['assets/js/shared-api.js', 'PASSWORD_RESET_SHARED_V1'],
  ['assets/js/modules/index.js', 'administration-password-reset'],
  ['assets/js/app.js', 'loadView("administration")']
];
for (const [path, marker] of validations) {
  const source = await fs.readFile(path, 'utf8');
  if (!source.includes(marker)) throw new Error(`Validação falhou: ${path} -> ${marker}`);
}

console.log('Fluxo central de redefinição de senha aplicado.');
