import assert from "node:assert/strict";
import { databaseStorage } from '../assets/js/database-storage.js';

const KEY = "lead-gestao-db-v2";
const TOKEN_KEY = "lead-gestao-sync-token";
const values = new Map([[TOKEN_KEY, "test-session"]]);
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key)
};

const action = { id: 17, objective: "Plano original", priority: "medium", dueDate: "2026-09-30", ownerId: 2, requesterId: 3, createdBy: 3 };
const database = (items) => ({ actionPlans: items, notifications: [], sequence: { actionPlans: 17 } });
const calls = [];
let shared = database([action]);
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, method: options.method || "GET" });
  if (url === "/api/shared-data") return Response.json({ data: structuredClone(shared) });
  if (url === "/api/live-actions" && options.method === "POST") {
    const item = JSON.parse(options.body).item;
    shared.actionPlans = [structuredClone(item)];
    return Response.json({ success: true, item });
  }
  if (url === "/api/live-actions/17" && options.method === "DELETE") {
    shared.actionPlans = [];
    return Response.json({ success: true });
  }
  return new Response(null, { status: 404 });
};

values.set(KEY, JSON.stringify(database([action])));
const { deleteOwnedAction, updateOwnedAction } = await import("../assets/js/action-owner.js");
const admin = { id: 1, role: "admin", username: "Gabriely" };

await updateOwnedAction(admin, 17, { objective: "Plano corrigido", priority: "high", dueDate: "2026-10-01" });
assert.equal(JSON.parse(databaseStorage.getItem(KEY)).actionPlans[0].objective, "Plano corrigido");
assert.equal(calls.some(({ url, method }) => url === "/api/shared-data" && method === "PUT"), false);

await deleteOwnedAction(admin, 17);
assert.equal(JSON.parse(databaseStorage.getItem(KEY)).actionPlans.length, 0);
assert.equal(calls.some(({ url, method }) => url === "/api/shared-data" && method === "PUT"), false);
console.log("Action edit/delete transactional sync tests passed");
