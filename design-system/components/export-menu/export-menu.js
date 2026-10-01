class PSExportMenu extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const formats = (this.getAttribute("formats") || "pdf,xlsx").split(",");
    this.innerHTML = `<ps-menu><button class="ps-button ps-button--secondary" aria-haspopup="menu">Exportar</button><div role="menu">${formats.map((f) => `<button role="menuitem" data-f="${f.trim()}">${f.trim().toUpperCase()}</button>`).join("")}</div></ps-menu>`;
    this.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
      this.setAttribute("loading", "");
      this.dispatchEvent(new CustomEvent("ps-export", { bubbles: true, composed: true, detail: { format: b.dataset.f } }));
    }));
  }
}
customElements.define("ps-export-menu", PSExportMenu);
