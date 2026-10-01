class PSDataTable extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const state = this.getAttribute("state") || "ready";
    if (state === "loading") this.innerHTML = `<div class="ps-stack"><span class="ps-skeleton"></span><span class="ps-skeleton"></span><span class="ps-skeleton"></span></div>`;
    this.addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (th) this.dispatchEvent(new CustomEvent("ps-sort", { bubbles: true, composed: true, detail: { key: th.dataset.sort } }));
    });
  }
}
customElements.define("ps-data-table", PSDataTable);
