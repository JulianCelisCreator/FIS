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
    this.dataset.tone = r.tone;
    if (r.invalid) this.setAttribute("aria-invalid", "true"); else this.removeAttribute("aria-invalid");
    const pct = r.percent === null ? "—" : `${this.hasAttribute("show-percent") ? ` · ${r.percent} %` : ""}`;
    this.innerHTML = `<div class="ps-capacity"><div class="ps-capacity__bar" role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><div class="ps-capacity__fill" style="width:${r.percent === null ? 0 : Math.min(100, r.percent)}%"></div></div><p class="ps-capacity__meta"><span>${Number.isFinite(value) && Number.isFinite(max) ? `${value}/${max}` : "—"}</span><span>${r.label}${pct}</span></p></div>`;
  }
}
customElements.define("ps-capacity-meter", PSCapacityMeter);
