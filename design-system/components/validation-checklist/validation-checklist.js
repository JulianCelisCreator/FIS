import { resolveStatus } from "../../js/status-catalog.js";
const ROWS = [["poliza", "Póliza"], ["cartera", "Cartera"], ["autorizacion", "Autorización"], ["sancion", "Sanción"]];
class PSValidationChecklist extends HTMLElement {
  connectedCallback() {
    const state = JSON.parse(this.getAttribute("state") || "{}");
    this.innerHTML = `<ul>${ROWS.map(([k, label]) => {
      const s = state[k] || "en-validacion";
      const r = resolveStatus("validacion", s === "ok" ? "aprobo" : s === "fail" ? "fallo" : s === "na" ? "no-aplica" : "en-validacion");
      return `<li class="ps-validation-checklist__row"><span class="ps-badge ps-badge--${r.tone}">${r.label}</span><span>${label}</span></li>`;
    }).join("")}</ul>`;
  }
}
customElements.define("ps-validation-checklist", PSValidationChecklist);
