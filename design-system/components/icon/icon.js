const SPRITE = new URL("../../icons/sprite.svg", import.meta.url).href;
class PSIcon extends HTMLElement {
  static get observedAttributes() { return ["name", "size"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const name = this.getAttribute("name") || "info";
    const size = this.getAttribute("size") || "md";
    this.innerHTML = `<svg class="ps-icon--${size}" aria-hidden="true"><use href="${SPRITE}#${name}"></use></svg>`;
  }
}
customElements.define("ps-icon", PSIcon);
