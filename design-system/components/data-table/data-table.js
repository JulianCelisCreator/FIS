class PSDataTable extends HTMLElement {
  static get observedAttributes() { return ["state"]; }

  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const content = document.createElement("div");
    content.dataset.tableContent = "";
    while (this.firstChild) content.append(this.firstChild);
    const status = document.createElement("div");
    status.dataset.tableState = "";
    status.className = "ps-stack";
    status.setAttribute("role", "status");
    this.append(content, status);
    this.addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (th) this.dispatchEvent(new CustomEvent("ps-sort", { bubbles: true, composed: true, detail: { key: th.dataset.sort } }));
    });
    this.renderState();
  }

  attributeChangedCallback() {
    if (this.dataset.psBuilt === "1") this.renderState();
  }

  renderState() {
    const content = this.querySelector("[data-table-content]");
    const status = this.querySelector("[data-table-state]");
    if (!content || !status) return;
    const state = this.getAttribute("state") || "ready";
    content.hidden = state !== "ready";
    status.replaceChildren();
    status.hidden = state === "ready";
    status.setAttribute("role", state === "error" ? "alert" : "status");
    if (state === "loading") {
      status.setAttribute("aria-label", "Cargando");
      for (let i = 0; i < 3; i++) {
        const skeleton = document.createElement("span");
        skeleton.className = "ps-skeleton";
        status.append(skeleton);
      }
    } else if (state === "empty") {
      status.removeAttribute("aria-label");
      status.textContent = this.getAttribute("empty-message") || "No hay resultados.";
    } else if (state === "error") {
      status.removeAttribute("aria-label");
      status.textContent = this.getAttribute("error-message") || "No se pudieron cargar los datos.";
    } else {
      content.hidden = false;
      status.hidden = true;
    }
  }
}
customElements.define("ps-data-table", PSDataTable);
