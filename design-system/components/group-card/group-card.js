class PSGroupCard extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const full = this.getAttribute("status") === "lleno";
    if (full) this.setAttribute("aria-disabled", "true");
    this.innerHTML = `<article class="ps-group-card"${full ? ' aria-disabled="true"' : ""}>${this.innerHTML}</article>`;
  }
}
customElements.define("ps-group-card", PSGroupCard);
