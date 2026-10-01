function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
class PSAvatar extends HTMLElement {
  static get observedAttributes() { return ["name", "size"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const size = this.getAttribute("size") || "md";
    this.setAttribute("role", "img");
    this.setAttribute("aria-label", this.getAttribute("name") || "Avatar");
    this.innerHTML = `<span class="ps-avatar ps-avatar--${size}">${initials(this.getAttribute("name"))}</span>`;
  }
}
customElements.define("ps-avatar", PSAvatar);
