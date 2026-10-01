import { formatCOP, parseCOP, formatTime, parseTime, formatDate, parseDate } from "../../js/format.js";
// ADR-07: valor canónico en hidden + visible formateado.
function masked(tag, format, parse) {
  class El extends HTMLElement {
    connectedCallback() {
      const name = this.getAttribute("name") || "value";
      const val = this.getAttribute("value") || "";
      const wrap = document.createElement("span");
      wrap.className = "ps-masked-wrap";
      const vis = document.createElement("input");
      vis.className = "ps-input ps-input--numeric";
      vis.inputMode = "numeric";
      vis.value = val
        ? tag === "ps-date-input" ? formatDate(val) : format(Number(val)) ?? val
        : "";
      const hid = document.createElement("input");
      hid.type = "hidden";
      hid.name = name;
      hid.value = val;
      wrap.append(vis, hid);
      this.replaceChildren(wrap);
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
