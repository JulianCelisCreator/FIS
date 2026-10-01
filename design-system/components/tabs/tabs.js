class PSTabs extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    this.setAttribute("role", "tablist");
    const tabs = [...this.querySelectorAll('[role="tab"]')];
    tabs.forEach((t, i) => {
      t.tabIndex = t.getAttribute("aria-selected") === "true" ? 0 : -1;
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    const tabList = this;
    function select(i, focus = false) {
      tabs.forEach((t, j) => {
        t.setAttribute("aria-selected", String(j === i));
        t.tabIndex = j === i ? 0 : -1;
        if (j === i && focus) t.focus();
      });
      tabList.dispatchEvent(new CustomEvent("ps-tab-change", {
        bubbles: true,
        composed: true,
        detail: { index: i, tab: tabs[i], panel: tabs[i]?.dataset.panel },
      }));
    }
  }
}
customElements.define("ps-tabs", PSTabs);
