import { formatTime, formatCOP, formatPosition } from "../../js/format.js";
class PSTimeDisplay extends HTMLElement {
  static get observedAttributes() { return ["value", "size"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const v = Number(this.getAttribute("value"));
    this.innerHTML = `<span class="ps-text-numeric-${this.getAttribute("size") === "lg" ? "lg" : "md"}">${formatTime(v)}</span>`;
  }
}
customElements.define("ps-time-display", PSTimeDisplay);
class PSCurrencyDisplay extends HTMLElement {
  static get observedAttributes() { return ["value", "size"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const v = Number(this.getAttribute("value"));
    this.innerHTML = `<span class="ps-text-numeric-${this.getAttribute("size") === "lg" ? "lg" : "md"}">${formatCOP(v)}</span>`;
  }
}
customElements.define("ps-currency-display", PSCurrencyDisplay);
