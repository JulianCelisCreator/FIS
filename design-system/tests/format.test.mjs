import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatTime, parseTime, formatCOP, parseCOP, formatDate, parseDate, formatPosition } from "../js/format.js";

describe("format.js (spec §7.7)", () => {
  it("formatTime/parseTime", () => {
    assert.equal(formatTime(83450), "01:23.450");
    assert.equal(formatTime(0), "00:00.000");
    assert.equal(parseTime("01:23.450"), 83450);
    assert.equal(parseTime("mal"), null);
    assert.equal(parseTime("1:23.450"), null);
  });
  it("formatCOP/parseCOP", () => {
    assert.equal(formatCOP(85000), "$ 85.000");
    assert.equal(formatCOP(0), "$ 0");
    assert.equal(parseCOP("$ 85.000"), 85000);
  });
  it("formatDate/parseDate con 2-digit forzado", () => {
    assert.equal(formatDate("2026-09-21"), "21/09/2026");
    assert.equal(formatDate("2026-09-30"), "30/09/2026");
    assert.equal(parseDate("21/09/2026"), "2026-09-21");
    assert.equal(parseDate("31/02/2026"), null);
    assert.equal(parseDate("30/9/2026"), null);
  });
  it("formatPosition", () => {
    assert.equal(formatPosition(1), "1.º");
    assert.equal(formatPosition(2), "2.º");
  });
});
