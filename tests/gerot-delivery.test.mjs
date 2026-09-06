import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GEROT_DELIVERY } from "../assets/js/gerot-delivery-data.js";
import { createDeliveryCalculator, parseDeliveryInput, deliveryInputValue } from "../assets/js/gerot-delivery-engine.js";

const fixture = JSON.parse(readFileSync(new URL("fixtures/gerot-delivery-workbook.json", import.meta.url)));
const freshRows = () => structuredClone(GEROT_DELIVERY.rows);
const near = (actual, expected, label = "") => assert.ok(typeof actual === "number" && Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);

test("all 587 cached formula results match the attached workbook, including blank/error cells", () => {
  const calc = createDeliveryCalculator(freshRows());
  let checked = 0;
  for (const [address, cell] of Object.entries(fixture.cells)) {
    if (!cell.formula) continue;
    const expected = cell.type === "e" || cell.value === "" ? null : cell.value;
    if (typeof expected === "number") near(calc.cell(address), expected, address);
    else assert.equal(calc.cell(address), expected, address);
    checked++;
  }
  assert.equal(checked, 587);
});

test("every monthly input and formula is retained at its sheet coordinate; only approved formulas differ", () => {
  const corrections = new Map(GEROT_DELIVERY.corrections.map((change) => [change.cell, change.formula]));
  assert.equal(corrections.size, 25);
  for (const row of GEROT_DELIVERY.rows) {
    for (let month = 0; month < 12; month++) {
      const address = `${String.fromCharCode(79 + month)}${row.sheetRow}`, source = fixture.cells[address];
      assert.equal(row.formulas[month], corrections.get(address) ?? source?.formula ?? "", address);
      if (!row.formulas[month]) assert.equal(row.monthly[month], source?.value ?? null, address);
    }
  }
});

test("working days propagate through driver/helper totals, monthly delays and weighted YTD", () => {
  const rows = freshRows(); rows.find((row) => row.sheetRow === 8).monthly[0] = 20;
  const calc = createDeliveryCalculator(rows);
  assert.equal(calc.cell("O16"), 700); assert.equal(calc.cell("O17"), 1400);
  near(calc.cell("O11"), 108 / 2100);
  near(calc.cell("N11"), 2355 / (18585 - 630));
});

test("monthly formulas and YTD do not fall back to stale cached workbook results", () => {
  const rows = freshRows();
  rows.find((row) => row.sheetRow === 21).monthly[0] = 1000;
  rows.find((row) => row.sheetRow === 22).monthly[0] = 0;
  const calc = createDeliveryCalculator(rows);
  assert.equal(calc.cell("O20"), null);
  near(calc.cell("N20"), (3249.48 - 430.59 + 1000) / (311773.47 - 46910.22));
  assert.equal(calc.cell("N33"), null); // Excel #DIV/0!, not cached error code 7.
});

test("zero and empty months retain Excel SUM, AVERAGE, IF and IFERROR semantics", () => {
  const rows = freshRows();
  rows.find((row) => row.sheetRow === 14).monthly[0] = 0;
  rows.find((row) => row.sheetRow === 15).monthly[0] = 0;
  rows.find((row) => row.sheetRow === 32).monthly = [1, 0, null, ...Array(9).fill(null)];
  const calc = createDeliveryCalculator(rows);
  assert.equal(calc.cell("O18"), null); assert.equal(calc.cell("O11"), null);
  assert.equal(calc.cell("N32"), .5);
  assert.equal(calc.cell("V46"), null); // Formula-produced empty string times 3.4 is not zero.
});

test("approved ratio corrections apply to July–December without modifying Jan–June", () => {
  for (const [indicator, numerator, denominator] of [[114,116,115], [117,119,118], [120,122,121], [126,128,127]]) {
    const rows = freshRows();
    for (let month = 6; month < 12; month++) {
      rows.find((row) => row.sheetRow === numerator).monthly[month] = 90;
      rows.find((row) => row.sheetRow === denominator).monthly[month] = 100;
    }
    const calc = createDeliveryCalculator(rows);
    for (let month = 6; month < 12; month++) near(calc.cell(`${String.fromCharCode(79 + month)}${indicator}`), .9);
  }
});

test("absenteeism YTD includes November and December; average-based OTIF remains an average", () => {
  const rows = freshRows(); rows.find((row) => row.sheetRow === 142).monthly = [...Array(10).fill(.1), .2, .3];
  const calc = createDeliveryCalculator(rows); near(calc.cell("N142"), 1.5 / 12);
  const values = Array.from({length:12}, (_, month) => calc.cell(`${String.fromCharCode(79 + month)}111`)).filter((value) => value !== null);
  near(calc.cell("N111"), values.reduce((sum, value) => sum + value, 0) / values.length);
});

test("Brazilian decimals, percentages and duration inputs round-trip and invalid text is rejected", () => {
  assert.equal(parseDeliveryInput("1.234,56", "number"), 1234.56);
  assert.equal(parseDeliveryInput("1.234", "number"), 1234);
  assert.equal(parseDeliveryInput("95,25%", "percent"), .9525);
  assert.equal(parseDeliveryInput("", "number"), null);
  assert.equal(parseDeliveryInput("0", "number"), 0);
  near(parseDeliveryInput("08:30", "time"), 8.5 / 24);
  assert.equal(deliveryInputValue(8.5 / 24, "time"), "08:30:00");
  for (const text of ["NaN", "Infinity", "1,2,3", "abc", "=1+1"]) assert.throws(() => parseDeliveryInput(text, "number"));
  assert.throws(() => parseDeliveryInput("08:75", "time"));
});

test("delivery saves preserve other cells, mixed formula/input rows, migrations and permissions", async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
  const { api } = await import("../assets/js/api.js");
  const { databaseStorage } = await import("../assets/js/database-storage.js");
  // Isolated in-memory database and session; no local or production user data is read.
  await assert.rejects(api.login({ username: "missing-test-user", password: "missing" }));
  const db = JSON.parse(databaseStorage.getItem("lead-gestao-db-v2"));
  const admin = db.users.find((user) => user.username === "Gabriely");
  assert.ok(admin);
  db.sessions.push({ id: 9999, token: "test-admin", userId: admin.id, expiresAt: "2099-01-01T00:00:00.000Z" });
  // Simulate a pre-upgrade saved data set with the working-days row missing.
  db.gerotAdditionalAreas.ENTREGA.rows = db.gerotAdditionalAreas.ENTREGA.rows.filter((row) => row.sheetRow !== 8);
  db.gerotAdditionalAreas.ENTREGA.rows.find((row) => row.sheetRow === 21).monthly[1] = 123.45;
  store.set("lead-gestao-db-v2", JSON.stringify(db));
  const before = await api.list("test-admin", "/gerot");
  assert.ok(before.areas.find((area) => area.area === "ENTREGA").rows.find((row) => row.sheetRow === 8));
  await api.patch("test-admin", "/gerot/warehouse", { area: "ENTREGA", cells: [{ id: "entrega-35", month: 4, value: .98 }] });
  const after = await api.list("test-admin", "/gerot");
  const entrega = after.areas.find((area) => area.area === "ENTREGA");
  assert.equal(entrega.rows.find((row) => row.sheetRow === 35).monthly[4], .98);
  assert.equal(entrega.rows.find((row) => row.sheetRow === 21).monthly[1], 123.45);
  for (const area of ["ARMAZÉM", "CONTROLE", "PLANEJAMENTO"]) assert.deepEqual(after.areas.find((item) => item.area === area), before.areas.find((item) => item.area === area));
  await assert.rejects(api.patch("test-admin", "/gerot/warehouse", { area: "ENTREGA", cells: [{ id: "entrega-21", month: 0, value: 999 }, { id: "entrega-35", month: 0, value: .5 }] }), /automaticamente/);
  const unchanged = await api.list("test-admin", "/gerot");
  assert.equal(unchanged.areas.find((area) => area.area === "ENTREGA").rows.find((row) => row.sheetRow === 21).monthly[0], 430.59);
  await assert.rejects(api.patch("test-admin", "/gerot/warehouse", { area: "ENTREGA", cells: [{ id: "entrega-21", month: 0, value: Infinity }] }), /numérico/);
  const persisted = JSON.parse(databaseStorage.getItem("lead-gestao-db-v2"));
  const warehouseUser = persisted.users.find((user) => user.department === "ARMAZÉM");
  assert.ok(warehouseUser);
  persisted.sessions.push({ id: 10000, token: "test-other-area", userId: warehouseUser.id, expiresAt: "2099-01-01T00:00:00.000Z" });
  store.set("lead-gestao-db-v2", JSON.stringify(persisted));
  await assert.rejects(api.patch("test-other-area", "/gerot/warehouse", { area: "ENTREGA", cells: [{ id: "entrega-21", month: 0, value: 1 }] }), /somente ao setor/);
});
