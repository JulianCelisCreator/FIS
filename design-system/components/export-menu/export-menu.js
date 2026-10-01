class PSExportMenu extends HTMLElement {
  static get observedAttributes() { return ["loading", "status"]; }

  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const formats = (this.getAttribute("formats") || "pdf,xlsx").split(",");
    const menu = document.createElement("ps-menu");
    const container = document.createElement("div");
    container.className = "ps-export-menu__container";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ps-button ps-button--secondary";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    const menuId = `export-menu-${Math.random().toString(36).slice(2, 8)}`;
    trigger.setAttribute("aria-controls", menuId);
    trigger.textContent = "Exportar";
    menu.id = menuId;
    menu.hidden = true;
    for (const format of formats.map((f) => f.trim()).filter(Boolean)) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.dataset.f = format;
      item.textContent = format.toUpperCase();
      menu.append(item);
    }
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.dataset.exportStatus = "";
    status.hidden = true;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.dataset.exportRetry = "";
    retry.hidden = true;
    retry.textContent = "Reintentar";
    container.append(trigger, menu);
    this.replaceChildren(container, status, retry);
    const closeMenu = (restoreFocus = false) => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    };
    trigger.addEventListener("click", () => {
      if (this.hasAttribute("loading")) return;
      const open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) menu.querySelector('[role="menuitem"]')?.focus();
    });
    this.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        event.preventDefault();
        closeMenu(true);
      }
    });
    this.addEventListener("focusout", (event) => {
      if (!this.contains(event.relatedTarget)) closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!this.contains(event.target)) closeMenu();
    });
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
      closeMenu(true);
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
    const trigger = this.querySelector(".ps-export-menu__container > button");
    const menu = this.querySelector("ps-menu[role='menu']");
    const items = this.querySelectorAll("[data-f]");
    const statusElement = this.querySelector("[data-export-status]");
    const retry = this.querySelector("[data-export-retry]");
    if (!trigger || !statusElement || !retry) return;

    trigger.setAttribute("aria-busy", String(loading));
    trigger.setAttribute("aria-disabled", String(loading));
    if (loading && menu) {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
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
