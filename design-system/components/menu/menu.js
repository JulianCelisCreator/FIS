class PSMenu extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    this.setAttribute("role", "menu");
    this.addEventListener("keydown", (e) => {
      const items = [...this.querySelectorAll('[role="menuitem"]')];
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    });
  }
}
customElements.define("ps-menu", PSMenu);
