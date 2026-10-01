import { formatCOP, parseCOP, formatTime, parseTime, formatDate, parseDate } from "../../js/format.js";
// ADR-07: valor canónico en hidden + visible formateado.
function masked(tag, format, parse) {
  class El extends HTMLElement {
    connectedCallback() {
      const name = this.getAttribute("name") || "value";
      const val = this.getAttribute("value") || "";
      this.innerHTML = `<span class="ps-masked-wrap"><input class="ps-input ps-input--numeric" inputmode="numeric" value="${val ? format(Number(val)) ?? val : ""}"><input type="hidden" name="${name}" value="${val}"></span>`;
      const [vis, hid] = this.querySelectorAll("input");
      vis.addEventListener("input", () => {
        const canonical = parse(vis.value);
        if (canonical === null || Number.isNaN(canonical)) { vis.setAttribute("aria-invalid", "true"); return; }
        vis.removeAttribute("aria-invalid");
        hid.value = String(canonical);
        hid.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    get value() { return this.querySelector('input[type="hidden"]')?.value ?? ""; }
  }
  customElements.define(tag, El);
}
masked("ps-currency-input", (v) => formatCOP(v), (t) => parseCOP(t));
masked("ps-time-input", (v) => formatTime(v), (t) => parseTime(t));
masked("ps-date-input", (v) => v, (t) => parseDate(t));
