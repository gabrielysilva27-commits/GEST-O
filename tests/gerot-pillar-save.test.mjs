import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const { api } = await import("../assets/js/api.js");
const { databaseStorage } = await import("../assets/js/database-storage.js");

await assert.rejects(api.login({ username: "missing-gerot-pillar-test", password: "missing" }));
const database = JSON.parse(databaseStorage.getItem("lead-gestao-db-v2"));
const admin = database.users.find((user) => user.username === "Gabriely");
assert.ok(admin, "Usuária administradora de teste não encontrada");
database.sessions.push({ id: 19001, token: "test-gerot-pillars", userId: admin.id, expiresAt: "2099-01-01T00:00:00.000Z" });
store.set("lead-gestao-db-v2", JSON.stringify(database));

function editableCoordinate(area) {
  for (const row of area.rows || []) {
    if (area.area === "ARMAZÉM" && (row.formulaInputs || []).length) continue;
    for (let month = 0; month < 12; month += 1) {
      if (area.area !== "ARMAZÉM" && (row.formulas || [])[month]) continue;
      return { row, month };
    }
  }
  throw new Error(`Nenhuma célula editável encontrada em ${area.area}`);
}

test("ARMAZÉM, PLANEJAMENTO e CONTROLE persistem células editáveis pela API compartilhada", async () => {
  for (const areaName of ["ARMAZÉM", "PLANEJAMENTO", "CONTROLE"]) {
    const before = await api.list("test-gerot-pillars", "/gerot");
    const area = before.areas.find((item) => item.area === areaName);
    assert.ok(area, `${areaName} não encontrado`);
    const { row, month } = editableCoordinate(area);
    const monthly = Array.from({ length: 12 }, (_, index) => row.monthly?.[index] === "" || row.monthly?.[index] === undefined ? null : row.monthly[index]);
    const current = Number(monthly[month]);
    const next = Number.isFinite(current) ? current + 1.2345 : 1.2345;
    monthly[month] = next;

    await api.patch("test-gerot-pillars", "/gerot/warehouse", { area: areaName, rows: [{ id: row.id, monthly }] });

    const after = await api.list("test-gerot-pillars", "/gerot");
    const saved = after.areas.find((item) => item.area === areaName)?.rows.find((item) => String(item.id) === String(row.id));
    assert.ok(saved, `Linha salva de ${areaName} não encontrada`);
    assert.equal(saved.monthly[month], next, `${areaName} não persistiu a célula editável`);
  }
});
