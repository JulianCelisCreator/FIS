import { resolveStatus } from "../../js/status-catalog.js";
const SPRITE = new URL("../../icons/sprite.svg", import.meta.url).href;
class PSStatusBadge extends HTMLElement {
  static get observedAttributes() { return ["entity", "status"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const { label, tone, icon } = resolveStatus(this.getAttribute("entity") || "", this.getAttribute("status") || "");
    const badge = document.createElement("span");
    badge.className = `ps-badge ps-badge--${tone} ps-badge--md`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `${SPRITE}#${icon}`);
    svg.append(use);
    badge.append(svg, document.createTextNode(label));
    this.replaceChildren(badge);
  }
}
customElements.define("ps-status-badge", PSStatusBadge);
