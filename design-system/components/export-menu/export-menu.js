class PSExportMenu extends HTMLElement {
  static get observedAttributes() { return ["loading", "status"]; }

  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const formats = (this.getAttribute("formats") || "pdf,xlsx").split(",");
    this.innerHTML = `<ps-menu><button class="ps-button ps-button--secondary" aria-haspopup="menu">Exportar</button><div role="menu">${formats.map((f) => `<button role="menuitem" data-f="${f.trim()}">${f.trim().toUpperCase()}</button>`).join("")}</div><p role="status" data-export-status hidden></p><button type="button" data-export-retry hidden>Reintentar</button></ps-menu>`;
    this.querySelector("[data-export-retry]").addEventListener("click", () => {
      if (!this._lastFormat || this.hasAttribute("loading")) return;
      this.setAttribute("loading", "");
      this.removeAttribute("status");
      this.dispatchEvent(new CustomEvent("ps-export-retry", {
        bubbles: true,
        composed: true,
        detail: { format: this._lastFormat },
      }));
    });
    this.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
      if (this.hasAttribute("loading")) return;
      this._lastFormat = b.dataset.f;
      this.setAttribute("loading", "");
      this.removeAttribute("status");
      this.dispatchEvent(new CustomEvent("ps-export", { bubbles: true, composed: true, detail: { format: b.dataset.f } }));
    }));
    this.updateState();
  }

  attributeChangedCallback() {
    if (this.dataset.psBuilt === "1") this.updateState();
  }

  updateState() {
    const loading = this.hasAttribute("loading");
    const status = this.getAttribute("status") || "";
    const trigger = this.querySelector("ps-menu > button");
    const items = this.querySelectorAll("[data-f]");
    const statusElement = this.querySelector("[data-export-status]");
    const retry = this.querySelector("[data-export-retry]");
    if (!trigger || !statusElement || !retry) return;

    trigger.setAttribute("aria-busy", String(loading));
    trigger.setAttribute("aria-disabled", String(loading));
    items.forEach((item) => item.setAttribute("aria-disabled", String(loading)));
    statusElement.hidden = !loading && !status;
    statusElement.textContent = loading
      ? "Exportando…"
      : status === "error"
        ? "La exportación falló."
        : status === "success"
          ? "Exportación completada."
          : "";
    retry.hidden = loading || status !== "error";
  }
}
customElements.define("ps-export-menu", PSExportMenu);
