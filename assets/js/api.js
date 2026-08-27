const STORAGE_KEY = "lead-gestao-db-v2";
const SESSION_DURATION_HOURS = 12;

const ROLE_LABELS = {
  admin: "Administrador",
  manager: "Gerente",
  supervisor: "Supervisor",
  operator: "Operador"
};

const ROLE_PERMISSIONS = {
  admin: [
    "dashboard.view",
    "users.read",
    "users.manage",
    "companies.read",
    "companies.manage",
    "units.read",
    "units.manage",
    "tasks.read",
    "tasks.manage",
    "checklists.read",
    "checklists.manage",
    "safety.read",
    "safety.manage",
    "trainings.read",
    "trainings.manage",
    "tickets.read",
    "tickets.manage",
    "reports.view",
    "reports.export",
    "notifications.view",
    "history.view"
  ],
  manager: [
    "dashboard.view",
    "users.read",
    "companies.read",
    "units.read",
    "tasks.read",
    "tasks.manage",
    "checklists.read",
    "checklists.manage",
    "safety.read",
    "safety.manage",
    "trainings.read",
    "trainings.manage",
    "tickets.read",
    "tickets.manage",
    "reports.view",
    "reports.export",
    "notifications.view",
    "history.view"
  ],
  supervisor: [
    "dashboard.view",
    "units.read",
    "tasks.read",
    "tasks.manage",
    "checklists.read",
    "checklists.manage",
    "safety.read",
    "safety.manage",
    "trainings.read",
    "trainings.manage",
    "tickets.read",
    "tickets.manage",
    "reports.view",
    "notifications.view",
    "history.view"
  ],
  operator: [
    "dashboard.view",
    "tasks.read",
    "checklists.read",
    "safety.read",
    "safety.manage",
    "trainings.read",
    "tickets.read",
    "tickets.manage",
    "notifications.view"
  ]
};

const NAVIGATION = [
  { id: "dashboard", label: "Dashboard", permission: "dashboard.view" },
  { id: "users", label: "Usuarios", permission: "users.read" },
  { id: "tasks", label: "Tarefas", permission: "tasks.read" },
  { id: "checklists", label: "Checklists", permission: "checklists.read" },
  { id: "safety", label: "Relatos de seguranca", permission: "safety.read" },
  { id: "trainings", label: "Treinamentos", permission: "trainings.read" },
  { id: "tickets", label: "Chamados", permission: "tickets.read" },
  { id: "reports", label: "Relatorios", permission: "reports.view" },
  { id: "notifications", label: "Notificacoes", permission: "notifications.view" },
  { id: "history", label: "Historico", permission: "history.view" }
];

const PASSWORD_HASH_GABY0739 = "5fab329183a90c4fa0f3d52559f267fc8a7c152c27c8f64a1d5efc25e058ea42";

const INITIAL_DATABASE = {
  meta: {
    appName: "LEAD Gestao",
    seededAt: "2026-08-26T00:00:00.000Z",
    lastExport: null,
    storageVersion: 2
  },
  sequence: {
    users: 1,
    companies: 0,
    units: 0,
    tasks: 0,
    checklists: 0,
    safetyReports: 0,
    trainings: 0,
    tickets: 0,
    notifications: 0,
    history: 0,
    sessions: 0
  },
  users: [
    {
      id: 1,
      name: "Gabriely",
      username: "Gabriely",
      role: "admin",
      companyId: 0,
      unitIds: [],
      status: "active",
      passwordHash: PASSWORD_HASH_GABY0739,
      avatar: "GA",
      title: "Administradora da plataforma",
      createdAt: "2026-08-01T09:00:00.000Z"
    }
  ],
  companies: [],
  units: [],
  tasks: [],
  checklists: [],
  safetyReports: [],
  trainings: [],
  tickets: [],
  notifications: [],
  history: [],
  sessions: []
};

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function getRolePermissions(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function nowIso() {
  return new Date().toISOString();
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function todaysDateKey() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeDatabase(database) {
  if (!database || database.meta?.storageVersion !== INITIAL_DATABASE.meta.storageVersion) {
    return clone(INITIAL_DATABASE);
  }

  return {
    meta: {
      appName: database.meta.appName || INITIAL_DATABASE.meta.appName,
      seededAt: database.meta.seededAt || INITIAL_DATABASE.meta.seededAt,
      lastExport: database.meta.lastExport || null,
      storageVersion: INITIAL_DATABASE.meta.storageVersion
    },
    sequence: {
      users: toInt(database.sequence?.users, INITIAL_DATABASE.sequence.users),
      companies: toInt(database.sequence?.companies, INITIAL_DATABASE.sequence.companies),
      units: toInt(database.sequence?.units, INITIAL_DATABASE.sequence.units),
      tasks: toInt(database.sequence?.tasks, INITIAL_DATABASE.sequence.tasks),
      checklists: toInt(database.sequence?.checklists, INITIAL_DATABASE.sequence.checklists),
      safetyReports: toInt(database.sequence?.safetyReports, INITIAL_DATABASE.sequence.safetyReports),
      trainings: toInt(database.sequence?.trainings, INITIAL_DATABASE.sequence.trainings),
      tickets: toInt(database.sequence?.tickets, INITIAL_DATABASE.sequence.tickets),
      notifications: toInt(database.sequence?.notifications, INITIAL_DATABASE.sequence.notifications),
      history: toInt(database.sequence?.history, INITIAL_DATABASE.sequence.history),
      sessions: toInt(database.sequence?.sessions, 0)
    },
    users: arrayValue(database.users),
    companies: arrayValue(database.companies),
    units: arrayValue(database.units),
    tasks: arrayValue(database.tasks),
    checklists: arrayValue(database.checklists),
    safetyReports: arrayValue(database.safetyReports),
    trainings: arrayValue(database.trainings),
    tickets: arrayValue(database.tickets),
    notifications: arrayValue(database.notifications),
    history: arrayValue(database.history),
    sessions: arrayValue(database.sessions)
  };
}

function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = clone(INITIAL_DATABASE);
      saveDatabase(seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeDatabase(parsed);
    saveDatabase(sanitized);
    return sanitized;
  } catch {
    const seeded = clone(INITIAL_DATABASE);
    saveDatabase(seeded);
    return seeded;
  }
}

function saveDatabase(database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function nextId(database, collectionName) {
  const nextValue = toInt(database.sequence[collectionName], 0) + 1;
  database.sequence[collectionName] = nextValue;
  return nextValue;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "LG";
  }

  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getCompany(database, companyId) {
  return database.companies.find((item) => toInt(item.id) === toInt(companyId)) || null;
}

function getUnit(database, unitId) {
  return database.units.find((item) => toInt(item.id) === toInt(unitId)) || null;
}

function getUserById(database, userId) {
  return database.users.find((item) => toInt(item.id) === toInt(userId)) || null;
}

function getUserByUsername(database, username) {
  const normalized = String(username || "").trim().toLowerCase();
  return database.users.find((item) => String(item.username || "").trim().toLowerCase() === normalized) || null;
}

function getUserProfile(database, userRecord) {
  const company = getCompany(database, userRecord.companyId);
  const units = database.units.filter((item) => arrayValue(userRecord.unitIds).includes(toInt(item.id)));

  return {
    id: toInt(userRecord.id),
    name: userRecord.name,
    username: userRecord.username,
    role: userRecord.role,
    roleLabel: getRoleLabel(userRecord.role),
    companyId: toInt(userRecord.companyId),
    companyName: company?.name || null,
    unitIds: arrayValue(userRecord.unitIds).map((item) => toInt(item)),
    unitNames: units.map((item) => item.name),
    status: userRecord.status || "active",
    avatar: userRecord.avatar || getInitials(userRecord.name),
    title: userRecord.title || "Usuario da plataforma",
    permissions: getRolePermissions(userRecord.role)
  };
}

function getScopedCollection(database, user, collectionName) {
  return arrayValue(database[collectionName]).filter((record) => testCollectionScope(collectionName, record, user));
}

function testCollectionScope(collectionName, record, user) {
  if (collectionName === "notifications") {
    return toInt(record.userId) === toInt(user.id);
  }

  if (user.role === "admin") {
    return true;
  }

  const userUnitIds = arrayValue(user.unitIds).map((item) => toInt(item));

  switch (collectionName) {
    case "users":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return (
          toInt(record.companyId) === toInt(user.companyId) &&
          arrayValue(record.unitIds).some((unitId) => userUnitIds.includes(toInt(unitId)))
        );
      }
      return toInt(record.id) === toInt(user.id);
    case "companies":
      return toInt(record.id) === toInt(user.companyId);
    case "units":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      return userUnitIds.includes(toInt(record.id));
    case "tasks":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.assigneeId) === toInt(user.id) || toInt(record.createdBy) === toInt(user.id);
    case "checklists":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      return arrayValue(record.unitIds).some((unitId) => userUnitIds.includes(toInt(unitId)));
    case "safetyReports":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.reportedBy) === toInt(user.id) || userUnitIds.includes(toInt(record.unitId));
    case "trainings":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return arrayValue(record.participants).some((participant) => toInt(participant.userId) === toInt(user.id));
    case "tickets":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.requesterId) === toInt(user.id) || toInt(record.ownerId) === toInt(user.id);
    case "history":
      if (user.role === "manager") {
        return toInt(record.companyId) === toInt(user.companyId);
      }
      if (user.role === "supervisor") {
        return userUnitIds.includes(toInt(record.unitId));
      }
      return toInt(record.actorId) === toInt(user.id);
    default:
      return true;
  }
}

function ensurePermission(user, permission) {
  if (!arrayValue(user.permissions).includes(permission)) {
    throw new ApiError("Seu perfil nao tem permissao para esta acao.", 403);
  }
}

function buildLookups(database, user) {
  return {
    users: getScopedCollection(database, user, "users").map((record) => {
      const profile = getUserProfile(database, record);
      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        role: profile.role,
        roleLabel: profile.roleLabel,
        companyId: profile.companyId,
        unitIds: profile.unitIds
      };
    }),
    companies: getScopedCollection(database, user, "companies").map((record) => ({
      id: toInt(record.id),
      name: record.name,
      segment: record.segment,
      headquarters: record.headquarters
    })),
    units: getScopedCollection(database, user, "units").map((record) => ({
      id: toInt(record.id),
      name: record.name,
      companyId: toInt(record.companyId),
      city: record.city,
      state: record.state
    })),
    roles: Object.entries(ROLE_LABELS).map(([id, label]) => ({ id, label })),
    navigation: NAVIGATION.map((item) => ({ ...item }))
  };
}

function addHistoryEntry(database, values) {
  const entry = {
    id: nextId(database, "history"),
    module: values.module,
    action: values.action,
    entityId: toInt(values.entityId),
    actorId: toInt(values.actorId),
    companyId: toInt(values.companyId),
    unitId: toInt(values.unitId),
    description: values.description,
    createdAt: nowIso()
  };

  database.history.push(entry);
  return entry;
}

function addNotification(database, values) {
  const notification = {
    id: nextId(database, "notifications"),
    userId: toInt(values.userId),
    title: values.title,
    message: values.message,
    level: values.level || "info",
    link: values.link || "dashboard",
    read: false,
    createdAt: nowIso()
  };

  database.notifications.push(notification);
  return notification;
}

function resolveCompanyIdForRecord(database, user, companyId, unitId = 0) {
  if (user.role !== "admin") {
    return toInt(user.companyId);
  }

  if (toInt(unitId) > 0) {
    const unit = getUnit(database, unitId);
    if (unit) {
      return toInt(unit.companyId);
    }
  }

  return toInt(companyId);
}

function bootstrapPayload(database, user) {
  return {
    user,
    lookups: buildLookups(database, user)
  };
}

function buildDashboard(database, user) {
  const tasks = getScopedCollection(database, user, "tasks");
  const tickets = getScopedCollection(database, user, "tickets");
  const trainings = getScopedCollection(database, user, "trainings");
  const safety = getScopedCollection(database, user, "safetyReports");
  const checklists = getScopedCollection(database, user, "checklists");
  const notifications = getScopedCollection(database, user, "notifications");
  const today = todaysDateKey();

  const overdueTasks = tasks.filter((item) => {
    if (item.status === "done" || !item.dueDate) {
      return false;
    }

    const date = new Date(item.dueDate);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    date.setHours(0, 0, 0, 0);
    return date < today;
  });

  let pendingTrainingCount = 0;
  for (const training of trainings) {
    for (const participant of arrayValue(training.participants)) {
      if (toInt(participant.userId) === toInt(user.id) && participant.status !== "completed") {
        pendingTrainingCount += 1;
      }
    }

    if (["admin", "manager", "supervisor"].includes(user.role) && training.status !== "completed") {
      pendingTrainingCount += 1;
    }
  }

  return {
    kpis: [
      {
        label: "Tarefas ativas",
        value: tasks.filter((item) => item.status !== "done").length,
        helper: "Fluxo operacional em execucao"
      },
      {
        label: "Tarefas vencidas",
        value: overdueTasks.length,
        helper: "Prioridade imediata"
      },
      {
        label: "Chamados abertos",
        value: tickets.filter((item) => !["resolved", "closed"].includes(item.status)).length,
        helper: "Demandas de suporte"
      },
      {
        label: "Treinamentos pendentes",
        value: pendingTrainingCount,
        helper: "Planos ainda nao concluidos"
      },
      {
        label: "Nao conformidades",
        value: safety.filter((item) => item.status !== "resolved").length,
        helper: "Ocorrencias de seguranca"
      },
      {
        label: "Checklists ativos",
        value: checklists.length,
        helper: "Rotinas monitoradas"
      }
    ],
    charts: {
      tasksByStatus: [
        { label: "Abertas", value: tasks.filter((item) => item.status === "open").length },
        { label: "Em andamento", value: tasks.filter((item) => item.status === "in_progress").length },
        { label: "Concluidas", value: tasks.filter((item) => item.status === "done").length }
      ],
      safetyBySeverity: [
        { label: "Critico/alto", value: safety.filter((item) => ["critical", "high"].includes(item.severity)).length },
        { label: "Medio", value: safety.filter((item) => item.severity === "medium").length },
        { label: "Baixo", value: safety.filter((item) => item.severity === "low").length }
      ],
      trainingCompletion: trainings.map((training) => {
        const participants = arrayValue(training.participants);
        const completed = participants.filter((item) => item.status === "completed").length;
        const total = Math.max(participants.length, 1);
        return {
          label: training.title,
          value: Math.round((completed / total) * 100)
        };
      })
    },
    highlights: {
      overdueTasks: overdueTasks.slice(0, 5),
      urgentSafetyItems: safety
        .filter((item) => ["critical", "high"].includes(item.severity) && item.status !== "resolved")
        .slice(0, 5),
      unreadNotifications: notifications.filter((item) => !item.read).length
    },
    feed: getScopedCollection(database, user, "history")
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
      .slice(0, 6)
  };
}

function buildReportsSummary(database, user) {
  const tasks = getScopedCollection(database, user, "tasks");
  const safety = getScopedCollection(database, user, "safetyReports");
  const trainings = getScopedCollection(database, user, "trainings");
  const tickets = getScopedCollection(database, user, "tickets");
  const checklists = getScopedCollection(database, user, "checklists");
  const checklistAverage =
    checklists.length > 0
      ? Math.round(
          checklists.reduce((total, item) => total + toInt(item.complianceRate), 0) / checklists.length
        )
      : 0;

  return {
    generatedAt: nowIso(),
    cards: [
      { label: "Conformidade de checklists", value: checklistAverage, unit: "%" },
      { label: "Treinamentos concluidos", value: trainings.filter((item) => item.status === "completed").length, unit: "" },
      { label: "Relatos resolvidos", value: safety.filter((item) => item.status === "resolved").length, unit: "" },
      { label: "Chamados em SLA", value: tickets.filter((item) => ["open", "in_progress"].includes(item.status)).length, unit: "" }
    ],
    breakdown: {
      tasks: {
        open: tasks.filter((item) => item.status === "open").length,
        inProgress: tasks.filter((item) => item.status === "in_progress").length,
        done: tasks.filter((item) => item.status === "done").length
      },
      safety: {
        open: safety.filter((item) => item.status === "open").length,
        investigating: safety.filter((item) => item.status === "investigating").length,
        resolved: safety.filter((item) => item.status === "resolved").length
      },
      trainings: {
        scheduled: trainings.filter((item) => item.status === "scheduled").length,
        inProgress: trainings.filter((item) => item.status === "in_progress").length,
        completed: trainings.filter((item) => item.status === "completed").length
      }
    }
  };
}

function csvEscape(value) {
  const normalized =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

function toCsv(items) {
  if (!items.length) {
    return "";
  }

  const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  const rows = items.map((item) => keys.map((key) => csvEscape(item[key])).join(","));
  return [keys.join(","), ...rows].join("\n");
}

function getSession(database, token) {
  return database.sessions.find((item) => item.token === token) || null;
}

function removeSession(database, token) {
  database.sessions = database.sessions.filter((item) => item.token !== token);
}

function getCurrentUser(database, token) {
  if (!token) {
    return null;
  }

  const session = getSession(database, token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    removeSession(database, token);
    saveDatabase(database);
    return null;
  }

  const userRecord = getUserById(database, session.userId);
  return userRecord ? getUserProfile(database, userRecord) : null;
}

function getAuthContext(token) {
  const database = loadDatabase();
  const user = getCurrentUser(database, token);
  if (!user) {
    throw new ApiError("Sessao invalida ou expirada. Faca login novamente.", 401);
  }

  return { database, user };
}

async function createUser(database, user, payload) {
  ensurePermission(user, "users.manage");

  if (!payload?.name?.trim() || !payload?.username?.trim() || !payload?.role?.trim()) {
    throw new ApiError("Nome, usuario e perfil sao obrigatorios.", 400);
  }

  if (getUserByUsername(database, payload.username)) {
    throw new ApiError("Ja existe um usuario com este nome de usuario.", 409);
  }

  const defaultUnitIds =
    payload.role === "admin"
      ? arrayValue(database.units).map((item) => toInt(item.id))
      : arrayValue(user.unitIds).length > 0
        ? arrayValue(user.unitIds).map((item) => toInt(item))
        : arrayValue(database.units).map((item) => toInt(item.id));
  const companyId = user.companyId || database.companies[0]?.id || 0;
  const passwordHash = await sha256(payload.password?.trim() || "Senha@123");
  const record = {
    id: nextId(database, "users"),
    name: payload.name.trim(),
    username: payload.username.trim(),
    role: payload.role,
    companyId: resolveCompanyIdForRecord(database, user, companyId, defaultUnitIds[0] || 0),
    unitIds: defaultUnitIds,
    status: "active",
    passwordHash,
    avatar: getInitials(payload.name),
    title: "Usuario da plataforma",
    createdAt: nowIso()
  };

  database.users.push(record);
  addHistoryEntry(database, {
    module: "users",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitIds[0] || 0,
    description: `Usuario ${record.name} criado com perfil ${getRoleLabel(record.role)}.`
  });

  return { item: getUserProfile(database, record) };
}

function createTask(database, user, payload) {
  ensurePermission(user, "tasks.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.assigneeId) {
    throw new ApiError("Titulo, unidade e responsavel sao obrigatorios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada nao existe.", 404);
  }

  const record = {
    id: nextId(database, "tasks"),
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    status: payload.status || "open",
    priority: payload.priority || "medium",
    dueDate: payload.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    companyId: resolveCompanyIdForRecord(database, user, unit.companyId, unit.id),
    unitId: toInt(unit.id),
    assigneeId: toInt(payload.assigneeId),
    createdBy: toInt(user.id),
    tags: arrayValue(payload.tags),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  if (!testCollectionScope("tasks", record, user)) {
    throw new ApiError("A tarefa precisa estar dentro da sua area de atuacao.", 403);
  }

  database.tasks.push(record);
  addHistoryEntry(database, {
    module: "tasks",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Tarefa '${record.title}' criada.`
  });
  addNotification(database, {
    userId: record.assigneeId,
    title: "Nova tarefa atribuida",
    message: record.title,
    level: "info",
    link: "tasks"
  });

  return { item: record };
}

function createChecklist(database, user, payload) {
  ensurePermission(user, "checklists.manage");

  const unitIds = arrayValue(payload.unitIds).map((item) => toInt(item)).filter((item) => item > 0);
  if (!payload?.name?.trim() || !payload?.category?.trim() || unitIds.length === 0) {
    throw new ApiError("Nome, categoria e ao menos uma unidade sao obrigatorios.", 400);
  }

  const items = arrayValue(payload.items)
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: index + 1,
      label,
      required: true,
      description: "Item criado pela interface"
    }));

  if (items.length === 0) {
    throw new ApiError("Inclua ao menos um item no checklist.", 400);
  }

  const record = {
    id: nextId(database, "checklists"),
    name: payload.name.trim(),
    category: payload.category.trim(),
    companyId: resolveCompanyIdForRecord(database, user, payload.companyId || user.companyId, unitIds[0]),
    unitIds,
    complianceRate: 0,
    lastRunAt: null,
    items,
    createdBy: toInt(user.id),
    createdAt: nowIso()
  };

  if (!testCollectionScope("checklists", record, user)) {
    throw new ApiError("Checklist fora do escopo permitido.", 403);
  }

  database.checklists.push(record);
  addHistoryEntry(database, {
    module: "checklists",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitIds[0] || 0,
    description: `Checklist '${record.name}' criado.`
  });

  return { item: record };
}

function createSafetyReport(database, user, payload) {
  ensurePermission(user, "safety.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.severity?.trim()) {
    throw new ApiError("Titulo, unidade e severidade sao obrigatorios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada nao existe.", 404);
  }

  const record = {
    id: nextId(database, "safetyReports"),
    title: payload.title.trim(),
    type: payload.type || "Desvio",
    severity: payload.severity,
    status: payload.status || "open",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    reportedBy: toInt(user.id),
    description: payload.description?.trim() || "",
    createdAt: nowIso(),
    dueDate: payload.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  };

  if (!testCollectionScope("safetyReports", record, user)) {
    throw new ApiError("Relato fora do seu escopo.", 403);
  }

  database.safetyReports.push(record);
  addHistoryEntry(database, {
    module: "safety",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Relato '${record.title}' registrado.`
  });
  addNotification(database, {
    userId: user.id,
    title: "Relato registrado",
    message: `Ocorrencia '${record.title}' adicionada com sucesso.`,
    level: "success",
    link: "safety"
  });

  return { item: record };
}

function createTraining(database, user, payload) {
  ensurePermission(user, "trainings.manage");

  if (!payload?.title?.trim() || !payload?.unitId || !payload?.dueDate?.trim()) {
    throw new ApiError("Titulo, unidade e data sao obrigatorios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada nao existe.", 404);
  }

  const participants = arrayValue(payload.participantIds)
    .map((item) => toInt(item))
    .filter((item) => item > 0)
    .map((userId) => ({
      userId,
      status: "pending",
      completedAt: null,
      score: null
    }));

  const record = {
    id: nextId(database, "trainings"),
    title: payload.title.trim(),
    category: payload.category?.trim() || "Operacao",
    status: payload.status || "scheduled",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    dueDate: payload.dueDate,
    instructor: payload.instructor?.trim() || user.name,
    targetRoles: arrayValue(payload.targetRoles).length > 0 ? arrayValue(payload.targetRoles) : [user.role],
    participants,
    createdBy: toInt(user.id),
    createdAt: nowIso()
  };

  if (!testCollectionScope("trainings", record, user)) {
    throw new ApiError("Treinamento fora do escopo permitido.", 403);
  }

  database.trainings.push(record);
  addHistoryEntry(database, {
    module: "trainings",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Treinamento '${record.title}' cadastrado.`
  });

  for (const participant of participants) {
    addNotification(database, {
      userId: participant.userId,
      title: "Novo treinamento",
      message: record.title,
      level: "info",
      link: "trainings"
    });
  }

  return { item: record };
}

function createTicket(database, user, payload) {
  ensurePermission(user, "tickets.manage");

  if (!payload?.title?.trim() || !payload?.unitId) {
    throw new ApiError("Titulo e unidade sao obrigatorios.", 400);
  }

  const unit = getUnit(database, payload.unitId);
  if (!unit) {
    throw new ApiError("Unidade informada nao existe.", 404);
  }

  const record = {
    id: nextId(database, "tickets"),
    title: payload.title.trim(),
    category: payload.category?.trim() || "Operacao",
    priority: payload.priority || "medium",
    status: payload.status || "open",
    companyId: toInt(unit.companyId),
    unitId: toInt(unit.id),
    requesterId: toInt(user.id),
    ownerId: payload.ownerId ? toInt(payload.ownerId) : toInt(user.id),
    description: payload.description?.trim() || "",
    openedAt: nowIso(),
    dueDate: payload.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  };

  if (!testCollectionScope("tickets", record, user)) {
    throw new ApiError("Chamado fora do escopo permitido.", 403);
  }

  database.tickets.push(record);
  addHistoryEntry(database, {
    module: "tickets",
    action: "created",
    entityId: record.id,
    actorId: user.id,
    companyId: record.companyId,
    unitId: record.unitId,
    description: `Chamado '${record.title}' aberto.`
  });
  addNotification(database, {
    userId: record.ownerId,
    title: "Novo chamado",
    message: record.title,
    level: "warning",
    link: "tickets"
  });

  return { item: record };
}

function listPath(database, user, path) {
  switch (path) {
    case "/users":
      ensurePermission(user, "users.read");
      return {
        items: getScopedCollection(database, user, "users").map((record) => getUserProfile(database, record))
      };
    case "/tasks":
      ensurePermission(user, "tasks.read");
      return { items: getScopedCollection(database, user, "tasks") };
    case "/checklists":
      ensurePermission(user, "checklists.read");
      return { items: getScopedCollection(database, user, "checklists") };
    case "/safety-reports":
      ensurePermission(user, "safety.read");
      return {
        items: getScopedCollection(database, user, "safetyReports").sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt))
        )
      };
    case "/trainings":
      ensurePermission(user, "trainings.read");
      return {
        items: getScopedCollection(database, user, "trainings").sort((left, right) =>
          String(left.dueDate).localeCompare(String(right.dueDate))
        )
      };
    case "/tickets":
      ensurePermission(user, "tickets.read");
      return {
        items: getScopedCollection(database, user, "tickets").sort((left, right) =>
          String(right.openedAt).localeCompare(String(left.openedAt))
        )
      };
    case "/notifications": {
      ensurePermission(user, "notifications.view");
      const items = getScopedCollection(database, user, "notifications").sort((left, right) =>
        String(right.createdAt).localeCompare(String(left.createdAt))
      );
      return {
        items,
        unreadCount: items.filter((item) => !item.read).length
      };
    }
    case "/history":
      ensurePermission(user, "history.view");
      return {
        items: getScopedCollection(database, user, "history")
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
          .slice(0, 40)
      };
    case "/reports/summary":
      ensurePermission(user, "reports.view");
      return buildReportsSummary(database, user);
    default:
      throw new ApiError("Endpoint nao encontrado.", 404);
  }
}

function createPath(database, user, path, body) {
  switch (path) {
    case "/users":
      return createUser(database, user, body);
    case "/tasks":
      return Promise.resolve(createTask(database, user, body));
    case "/checklists":
      return Promise.resolve(createChecklist(database, user, body));
    case "/safety-reports":
      return Promise.resolve(createSafetyReport(database, user, body));
    case "/trainings":
      return Promise.resolve(createTraining(database, user, body));
    case "/tickets":
      return Promise.resolve(createTicket(database, user, body));
    default:
      throw new ApiError("Endpoint nao encontrado.", 404);
  }
}

function patchPath(database, user, path) {
  const match = path.match(/^\/notifications\/(\d+)\/read$/);
  if (!match) {
    throw new ApiError("Endpoint nao encontrado.", 404);
  }

  ensurePermission(user, "notifications.view");
  const notificationId = toInt(match[1]);
  const notification = database.notifications.find((item) => toInt(item.id) === notificationId);
  if (!notification || toInt(notification.userId) !== toInt(user.id)) {
    throw new ApiError("Notificacao nao encontrada.", 404);
  }

  notification.read = true;
  return { item: notification };
}

export const api = {
  async login(credentials) {
    const database = loadDatabase();
    if (!credentials?.username?.trim() || !credentials?.password?.trim()) {
      throw new ApiError("Informe usuario e senha para continuar.", 400);
    }

    const userRecord = getUserByUsername(database, credentials.username);
    if (!userRecord) {
      throw new ApiError("Credenciais invalidas.", 401);
    }

    const passwordHash = await sha256(credentials.password.trim());
    if (passwordHash !== userRecord.passwordHash) {
      throw new ApiError("Credenciais invalidas.", 401);
    }

    const issuedAt = new Date();
    const session = {
      id: nextId(database, "sessions"),
      token: `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`,
      userId: toInt(userRecord.id),
      createdAt: issuedAt.toISOString(),
      expiresAt: addHours(issuedAt, SESSION_DURATION_HOURS).toISOString()
    };

    database.sessions.push(session);
    saveDatabase(database);

    const user = getUserProfile(database, userRecord);
    return {
      token: session.token,
      user,
      lookups: buildLookups(database, user)
    };
  },

  async me(token) {
    const { database, user } = getAuthContext(token);
    return bootstrapPayload(database, user);
  },

  async logout(token) {
    const database = loadDatabase();
    removeSession(database, token);
    saveDatabase(database);
    return { success: true };
  },

  async dashboard(token) {
    const { database, user } = getAuthContext(token);
    ensurePermission(user, "dashboard.view");
    return buildDashboard(database, user);
  },

  async list(token, path) {
    const { database, user } = getAuthContext(token);
    return listPath(database, user, path);
  },

  async create(token, path, body) {
    const { database, user } = getAuthContext(token);
    const payload = await createPath(database, user, path, body);
    saveDatabase(database);
    return payload;
  },

  async patch(token, path) {
    const { database, user } = getAuthContext(token);
    const payload = patchPath(database, user, path);
    saveDatabase(database);
    return payload;
  },

  async exportCsv(token, entity) {
    const { database, user } = getAuthContext(token);
    ensurePermission(user, "reports.export");

    const map = {
      tasks: "tasks",
      checklists: "checklists",
      safetyReports: "safetyReports",
      trainings: "trainings",
      tickets: "tickets"
    };

    const collectionName = map[entity];
    if (!collectionName) {
      throw new ApiError("Escolha um tipo de exportacao valido.", 400);
    }

    const items = getScopedCollection(database, user, collectionName);
    database.meta.lastExport = nowIso();
    saveDatabase(database);
    return toCsv(items);
  }
};
