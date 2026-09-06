import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const launcher = readFileSync(new URL("../assets/js/gerot-delivery-launcher.js", import.meta.url), "utf8");

test("GEROT Entrega opens as an internal LEAD route instead of a browser tab", () => {
  assert.match(launcher, /#gerot-entrega-editor/);
  assert.match(launcher, /history\.pushState/);
  assert.match(launcher, /openDeliveryEditor/);
  assert.match(launcher, /delivery-workspace-page/);
  assert.match(launcher, /api\.patch\(state\.token, "\/gerot\/warehouse"/);
  assert.doesNotMatch(launcher, /window\.open\s*\(/);
  assert.doesNotMatch(launcher, /gerot-entrega-editor\.html/);
});
