import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveCapacity } from "../js/capacity.js";

describe("capacity-meter (spec §9.2, RF M3-02)", () => {
  const cases = [
    [[0, 20], "success"], [[17, 20], "success"], [[18, 20], "warning"],
    [[19, 20], "warning"], [[20, 20], "error"], [[21, 20], "error"],
  ];
  for (const [[v, m], tone] of cases) it(`${v}/${m} → ${tone}`, () => assert.equal(resolveCapacity(v, m).tone, tone));
  it("5/0 → inválido «—»", () => {
    const r = resolveCapacity(5, 0);
    assert.equal(r.invalid, true);
    assert.equal(r.label, "—");
  });
});
