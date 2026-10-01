class PSPlayerSwitcher extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const players = JSON.parse(this.getAttribute("players") || "[]");
    if (players.length <= 1) { this.style.display = "none"; return; }
    this.innerHTML = `<label class="ps-field__label">Viendo a: <select class="ps-select"></select></label>`;
    const select = this.querySelector("select");
    for (const p of players) {
      const option = document.createElement("option");
      option.value = String(p.id);
      option.textContent = `${p.name} · ${p.category}`;
      select.append(option);
    }
    this.querySelector("select").addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("ps-player-change", { bubbles: true, composed: true, detail: { id: e.target.value } }));
    });
  }
}
customElements.define("ps-player-switcher", PSPlayerSwitcher);
