// Imported history is closed by request on 2026-09-14. Site-created actions
// retain their normal lifecycle. Keep source status and dates as audit evidence.
export const completionMarker = 'importedActionsCompleted:20260914:v1';
export const isImportedAction = action => ['legacy_excel', 'excel_import'].includes(action?.source);

export function completeImportedAction(action, completedAt) {
  if (!isImportedAction(action) || action.status === 'done') return action;
  return { ...action, status: 'done', completedAt, updatedAt: completedAt,
    importClosure: { version: completionMarker, previousStatus: action.status ?? null,
      previousCompletedAt: action.completedAt ?? null, previousUpdatedAt: action.updatedAt ?? null } };
}

export async function completeImportedActions(state) {
  const storage = state.storage;
  const previous = await storage.get(completionMarker);
  if (previous) { state.importedActionsCompletedAt = previous.completedAt; return; }
  const migrate = async tx => {
    const saved = await tx.get(completionMarker);
    if (saved) return saved;
    const data = await tx.get('data');
    if (!data) return null;
    const completedAt = new Date().toISOString();
    const changedIds = new Set();
    const close = actions => (actions || []).map(action => {
      const next = completeImportedAction(action, completedAt);
      if (next !== action) changedIds.add(Number(action.id));
      return next;
    });
    const keys = ['centralImportOverlay', 'liveActions'];
    for (const key of ['actionImport20260914:manifest', 'actionImport20260914AptasV1:manifest']) {
      const manifest = await tx.get(key);
      keys.push(...(manifest?.keys || []));
    }
    for (const key of keys) {
      const actions = await tx.get(key);
      if (!Array.isArray(actions)) continue;
      const next = close(actions);
      if (next.some((action, i) => action !== actions[i])) await tx.put(key, next);
    }
    const actions = data.actionPlans || [];
    const next = close(actions);
    if (next.some((action, i) => action !== actions[i])) await tx.put('data', { ...data, actionPlans: next });
    const result = { completedAt, changedIds: [...changedIds], count: changedIds.size };
    await tx.put(completionMarker, result);
    if (changedIds.size) await tx.put('revision', Number(await tx.get('revision') || 0) + 1);
    return result;
  };
  const result = await (storage.transaction ? storage.transaction(migrate) : migrate(storage));
  if (!result) return;
  state.importedActionsCompletedAt = result.completedAt;
  for (const key of ['reviewedActionImport', 'reviewedAptActionImport']) {
    state[key] = (state[key] || []).map(action => completeImportedAction(action, result.completedAt));
  }
}
