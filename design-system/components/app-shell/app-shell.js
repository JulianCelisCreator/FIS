class PSAppShell extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    // Conserva el contenido que cada equipo pasa en hijos con data-slot (spec §7.4).
    const provided = {};
    this.querySelectorAll(":scope > [data-slot]").forEach((el) => {
      provided[el.getAttribute("data-slot")] = el;
    });
    this.innerHTML = `<div class="ps-shell"><header class="ps-shell__top"><button class="ps-icon-button" data-act="menu" aria-label="Abrir menú">☰</button><span data-slot="brand">Escuela de patinaje</span><span data-slot="context"></span><span data-slot="user"></span></header><div class="ps-shell__body"><nav class="ps-shell__nav" data-slot="nav" aria-label="Principal"></nav><main class="ps-container"><div data-slot="content"></div></main></div></div>`;
    for (const [name, el] of Object.entries(provided)) {
      const target = this.querySelector(`.ps-shell [data-slot="${name}"]`);
      if (target) {
        // La navegación aportada conserva la clase de layout del shell.
        if (name === "nav") el.classList.add("ps-shell__nav");
        target.replaceWith(el);
      } else this.querySelector('[data-slot="content"]').append(el);
    }
    const nav = this.querySelector(".ps-shell__nav");
    const menuBtn = this.querySelector('[data-act="menu"]');
    // Variante pública: sin navegación no hay nada que alternar; se oculta la hamburguesa.
    if (nav.children.length === 0 && nav.textContent.trim() === "") {
      menuBtn.style.display = "none";
    }
    this._mobileQuery = window.matchMedia("(max-width: 1023px)");
    this._navOpen = !this._mobileQuery.matches;
    const syncNav = () => {
      if (nav.children.length === 0 && nav.textContent.trim() === "") return;
      if (this._mobileQuery.matches !== this._wasMobile) {
        this._navOpen = !this._mobileQuery.matches;
        this._wasMobile = this._mobileQuery.matches;
      }
      nav.style.display = this._navOpen ? "" : "none";
      menuBtn.setAttribute("aria-expanded", String(this._navOpen));
    };
    this._wasMobile = this._mobileQuery.matches;
    syncNav();
    this._mobileQuery.addEventListener("change", syncNav);
    menuBtn.addEventListener("click", () => {
      this._navOpen = !this._navOpen;
      syncNav();
    });
  }
}
customElements.define("ps-app-shell", PSAppShell);
