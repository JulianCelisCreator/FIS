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
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    nav.style.display = isMobile ? "none" : "";
    menuBtn.setAttribute("aria-expanded", String(!isMobile));
    menuBtn.addEventListener("click", () => {
      const isHidden = nav.style.display === "none";
      nav.style.display = isHidden ? "" : "none";
      menuBtn.setAttribute("aria-expanded", String(isHidden));
    });
  }
}
customElements.define("ps-app-shell", PSAppShell);
