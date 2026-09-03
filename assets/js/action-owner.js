const STORAGE_KEY = "lead-gestao-db-v2";

function readDatabase() {
  const database = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (!database || !Array.isArray(database.actionPlans)) throw new Error("Não foi possível acessar as ações.");
  return database;
}

function saveDatabase(database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function ownedAction(database, user, actionId) {
  const action = database.actionPlans.find((item) => Number(item.id) === Number(actionId));
  if (!action || Number(action.ownerId) !== Number(user?.id)) {
    throw new Error("Somente o responsável pode alterar esta ação.");
  }
  return action;
}

export function updateOwnedAction(user, actionId, values = {}) {
  const database = readDatabase();
  const action = ownedAction(database, user, actionId);
  const objective = String(values.objective || "").trim();
  if (!objective) throw new Error("Informe o plano de ação.");
  action.objective = objective;
  action.priority = ["low", "medium", "high", "critical"].includes(values.priority) ? values.priority : action.priority;
  action.dueDate = values.dueDate || action.dueDate;
  action.updatedAt = new Date().toISOString();
  saveDatabase(database);
}

export function deleteOwnedAction(user, actionId) {
  const database = readDatabase();
  const action = ownedAction(database, user, actionId);
  database.actionPlans = database.actionPlans.filter((item) => Number(item.id) !== Number(action.id));
  saveDatabase(database);
}
