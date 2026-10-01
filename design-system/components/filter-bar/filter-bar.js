class PSFilterBar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const controls = [...this.childNodes];
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ps-button ps-button--secondary ps-filter-bar__trigger";
    trigger.textContent = "Filtros";
    const dialog = document.createElement("dialog");
    dialog.className = "ps-filter-bar__dialog";
    dialog.id = `filters-${Math.random().toString(36).slice(2, 8)}`;
    dialog.setAttribute("aria-label", "Filtros");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", dialog.id);
    trigger.setAttribute("aria-expanded", "false");
    const form = document.createElement("form");
    form.className = "ps-filter-bar";
    form.setAttribute("role", "search");
    form.append(...controls);
    const reset = document.createElement("button");
    reset.className = "ps-button ps-button--secondary ps-button--sm";
    reset.type = "reset";
    reset.textContent = "Limpiar filtros";
    const apply = document.createElement("button");
    apply.className = "ps-button ps-button--primary ps-filter-bar__apply";
    apply.type = "submit";
    apply.textContent = "Aplicar filtros";
    const cancel = document.createElement("button");
    cancel.className = "ps-button ps-button--secondary ps-filter-bar__cancel";
    cancel.type = "button";
    cancel.textContent = "Cerrar";
    form.append(reset, cancel, apply);
    dialog.append(form);
    this.replaceChildren(trigger, dialog);
    this._mobileQuery = window.matchMedia("(max-width: 768px)");
    const syncDialog = () => {
      if (dialog.open) dialog.close();
      if (!this._mobileQuery.matches) dialog.show();
    };
    syncDialog();
    this._mobileQuery.addEventListener("change", syncDialog);
    trigger.addEventListener("click", () => {
      if (this._mobileQuery.matches && !dialog.open) {
        dialog.showModal();
        trigger.setAttribute("aria-expanded", "true");
      }
    });
    cancel.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      trigger.setAttribute("aria-expanded", "false");
      if (this._mobileQuery.matches) trigger.focus();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this._mobileQuery.matches) dialog.close();
    });
    form.addEventListener("reset", () => {
      this.dispatchEvent(new CustomEvent("ps-filter-change", { bubbles: true, composed: true, detail: { cleared: true } }));
    });
    form.addEventListener("input", (e) => {
      this.dispatchEvent(new CustomEvent("ps-filter-change", { bubbles: true, composed: true, detail: { field: e.target.name, value: e.target.value } }));
    });
  }
}
customElements.define("ps-filter-bar", PSFilterBar);
