class PSFilterBar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    this.innerHTML = `<form class="ps-filter-bar" role="search">${this.innerHTML}<button class="ps-button ps-button--secondary ps-button--sm" type="reset">Limpiar filtros</button></form>`;
    this.querySelector("form").addEventListener("reset", () => {
      this.dispatchEvent(new CustomEvent("ps-filter-change", { bubbles: true, composed: true, detail: { cleared: true } }));
    });
    this.querySelector("form").addEventListener("input", (e) => {
      this.dispatchEvent(new CustomEvent("ps-filter-change", { bubbles: true, composed: true, detail: { field: e.target.name, value: e.target.value } }));
    });
  }
}
customElements.define("ps-filter-bar", PSFilterBar);
