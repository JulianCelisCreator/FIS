class PSPagination extends HTMLElement {
  static get observedAttributes() { return ["page", "pages"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const page = Number(this.getAttribute("page") || 1);
    const pages = Number(this.getAttribute("pages") || 1);
    this.innerHTML = `<nav class="ps-pagination" aria-label="Paginación"><button class="ps-button ps-button--ghost ps-button--sm" data-p="${page - 1}" ${page <= 1 ? 'aria-disabled="true"' : ""}>← Anterior</button><span class="ps-pagination__info">${page} / ${pages}</span><button class="ps-button ps-button--ghost ps-button--sm" data-p="${page + 1}" ${page >= pages ? 'aria-disabled="true"' : ""}>Siguiente →</button></nav>`;
    this.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      if (b.hasAttribute("aria-disabled")) return;
      this.dispatchEvent(new CustomEvent("ps-page-change", { bubbles: true, composed: true, detail: { page: Number(b.dataset.p) } }));
    }));
  }
}
customElements.define("ps-pagination", PSPagination);
