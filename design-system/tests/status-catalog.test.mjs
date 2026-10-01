import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveStatus, resolveCartera } from "../js/status-catalog.js";

describe("status-catalog (spec §10)", () => {
  it("Anulado/Cancelado → neutral", () => {
    for (const [e, s] of [["cobro", "anulado"], ["pago", "anulado"], ["comprobante", "anulado"], ["inscripcion", "anulada"], ["competencia", "cancelada"], ["plan", "inactivo"]]) {
      assert.equal(resolveStatus(e, s).tone, "neutral", `${e}/${s}`);
    }
  });
  it("Rechazado → error", () => {
    assert.equal(resolveStatus("inscripcion", "rechazada").tone, "error");
  });
  it("Vencido prevalece sobre Pendiente", () => {
    assert.equal(resolveCartera(["pendiente", "vencido"]).label, "Vencido");
    assert.equal(resolveCartera(["pendiente"]).label, "Pendiente");
    assert.equal(resolveCartera([]).label, "Al día");
  });
  it("capacidad: tonos base existen", () => {
    assert.equal(resolveStatus("grupo", "con-cupo").tone, "success");
    assert.equal(resolveStatus("grupo", "alerta-90").tone, "warning");
    assert.equal(resolveStatus("grupo", "lleno").tone, "error");
  });
  it("correo: resuelve etiqueta y tono (M1-04)", () => {
    assert.deepEqual(resolveStatus("correo", "pendiente-verificacion"), { label: "Pendiente de verificación", tone: "warning", icon: "alert-triangle" });
    assert.deepEqual(resolveStatus("correo", "verificado"), { label: "Verificado", tone: "success", icon: "check-circle" });
  });
  it("cuenta: resuelve etiqueta y tono (M1-05)", () => {
    assert.deepEqual(resolveStatus("cuenta", "activa"), { label: "Activa", tone: "success", icon: "check-circle" });
    assert.deepEqual(resolveStatus("cuenta", "desactivada"), { label: "Desactivada", tone: "neutral", icon: "minus-circle" });
  });
});
