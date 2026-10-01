import { resolveStatus } from "../../js/status-catalog.js";
const SPRITE = new URL("../../icons/sprite.svg", import.meta.url).href;
class PSStatusBadge extends HTMLElement {
  static get observedAttributes() { return ["entity", "status"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const { label, tone, icon } = resolveStatus(this.getAttribute("entity") || "", this.getAttribute("status") || "");
    this.innerHTML = `<span class="ps-badge ps-badge--${tone} ps-badge--md"><svg aria-hidden="true"><use href="${SPRITE}#${icon}"></use></svg>${label}</span>`;
  }
}
customElements.define("ps-status-badge", PSStatusBadge);
