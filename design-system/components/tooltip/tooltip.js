class PSTooltip extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const text = this.getAttribute("text") || "";
    this.innerHTML = `<span style="position:relative;display:inline-block">${this.innerHTML}<span class="ps-tooltip__bubble" role="tooltip" hidden>${text}</span></span>`;
    const wrap = this.firstElementChild;
    const bubble = wrap.querySelector(".ps-tooltip__bubble");
    const show = () => bubble.hidden = false;
    const hide = () => bubble.hidden = true;
    wrap.addEventListener("mouseenter", show); wrap.addEventListener("mouseleave", hide);
    wrap.addEventListener("focusin", show); wrap.addEventListener("focusout", hide);
    wrap.addEventListener("click", () => bubble.hidden = !bubble.hidden);
  }
}
customElements.define("ps-tooltip", PSTooltip);
