import { resolveCapacity } from "../../js/capacity.js";
export { resolveCapacity };
class PSCapacityMeter extends HTMLElement {
  static get observedAttributes() { return ["value", "max", "label", "show-percent"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const value = Number(this.getAttribute("value"));
    const max = Number(this.getAttribute("max"));
    const r = resolveCapacity(value, max);
    const label = this.getAttribute("label") || "";
    this.dataset.tone = r.tone;
    if (r.invalid) this.setAttribute("aria-invalid", "true"); else this.removeAttribute("aria-invalid");
    const capacity = document.createElement("div");
    capacity.className = "ps-capacity";
    const bar = document.createElement("div");
    bar.className = "ps-capacity__bar";
    bar.setAttribute("role", "meter");
    bar.setAttribute("aria-label", label || "Cupo");
    bar.setAttribute("aria-valuemin", "0");
    if (r.invalid) bar.setAttribute("aria-invalid", "true");
    if (!r.invalid) {
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(Math.min(value, max)));
    }
    const fill = document.createElement("div");
    fill.className = "ps-capacity__fill";
    fill.style.width = `${r.percent === null ? 0 : Math.min(100, r.percent)}%`;
    bar.append(fill);
    const meta = document.createElement("p");
    meta.className = "ps-capacity__meta";
    const amount = document.createElement("span");
    amount.textContent = Number.isFinite(value) && Number.isFinite(max) ? `${value}/${max}` : "—";
    const state = document.createElement("span");
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = r.tone === "success" ? "✓ " : r.tone === "warning" ? "! " : r.tone === "error" ? "× " : "— ";
    const stateLabel = document.createElement("span");
    stateLabel.textContent = `${r.label}${r.percent !== null && this.hasAttribute("show-percent") ? ` · ${r.percent} %` : ""}`;
    state.append(icon, stateLabel);
    meta.append(document.createTextNode(`${label}${label ? " · " : ""}`), amount, state);
    capacity.append(bar, meta);
    this.replaceChildren(capacity);
  }
}
customElements.define("ps-capacity-meter", PSCapacityMeter);
