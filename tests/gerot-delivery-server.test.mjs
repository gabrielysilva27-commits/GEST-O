import test from "node:test";
import assert from "node:assert/strict";
import { SharedStore } from "../dist/server/index.js";
import { GEROT_DELIVERY } from "../assets/js/gerot-delivery-data.js";
import { createDeliveryCalculator } from "../assets/js/gerot-delivery-engine.js";

test("server validates delivery permissions and formulas and merges cell patches across sessions", async () => {
  const data = { gerotAdditionalAreas: { ENTREGA: structuredClone(GEROT_DELIVERY) }, actionPlans: [], dtoRecords: [], sequence: {} };
  const map = new Map([["data", data], ["sessions", {
    admin: { username: "Gabriely", role: "admin", expiresAt: Date.now() + 60000 },
    delivery: { username: "Luciano", role: "operator", expiresAt: Date.now() + 60000 },
    other: { username: "Leandro", role: "operator", expiresAt: Date.now() + 60000 }
  }]]);
  const storage = { get: async (key) => structuredClone(map.get(key)), put: async (key, value) => map.set(key, structuredClone(value)) };
  const server = new SharedStore({ storage }, {});
  const save = (token, cells) => server.fetch(new Request("https://test/api/gerot-data", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ area: "ENTREGA", cells }) }));
  assert.equal((await save("other", [{ id: "entrega-21", month: 0, value: 1 }])).status, 403);
  assert.equal((await save("absent", [{ id: "entrega-21", month: 0, value: 1 }])).status, 401);
  assert.equal((await save("delivery", [{ id: "entrega-21", month: 0, value: 1000 }])).status, 200);
  assert.equal((await save("admin", [{ id: "entrega-21", month: 1, value: 2000 }])).status, 200);
  assert.equal((await save("admin", [{ id: "entrega-21", month: 2, value: 3000 }, { id: "entrega-20", month: 2, value: .9 }])).status, 400);
  assert.equal((await save("admin", [{ id: "entrega-21", month: 12, value: 10 }])).status, 400);
  assert.equal((await save("admin", [{ id: "entrega-21", month: 0, value: "abc" }])).status, 400);
  const result = await server.fetch(new Request("https://test/api/shared-view"));
  assert.equal(result.status, 200);
  const area = (await result.json()).data.gerotAdditionalAreas.ENTREGA;
  const row = area.rows.find((item) => item.id === "entrega-21");
  assert.deepEqual(row.monthly.slice(0, 3), [1000, 2000, 419.32]);
  const calc = createDeliveryCalculator(area.rows);
  assert.ok(Math.abs(calc.cell("O20") - 1000 / 46910.22) < 1e-12);
  assert.equal(area.rows.find((item) => item.id === "entrega-114").formulas[6], 'IFERROR(U116/U115,"")');
  assert.equal(area.rows.find((item) => item.id === "entrega-142").ytdFormula, 'IFERROR(AVERAGE(O142:Z142),"")');
});
