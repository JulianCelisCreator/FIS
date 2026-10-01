class PSField extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const label = this.getAttribute("label") || "";
    const help = this.getAttribute("help") || "";
    const error = this.getAttribute("error") || "";
    const required = this.hasAttribute("required");
    const id = this.getAttribute("for") || `f-${Math.random().toString(36).slice(2, 7)}`;
    const inner = this.innerHTML;
    this.innerHTML = `<label class="ps-field__label" for="${id}">${label}${required ? ' <span class="ps-field__req" aria-hidden="true">*</span><span class="ps-text-caption"> obligatorio</span>' : ""}</label>${inner}${help ? `<p class="ps-field__help" id="${id}-help">${help}</p>` : ""}${error ? `<p class="ps-field__error" role="alert" id="${id}-error">${error}</p>` : ""}`;
    const ctrl = this.querySelector("input,select,textarea");
    if (ctrl) {
      ctrl.id = id;
      if (help) ctrl.setAttribute("aria-describedby", `${id}-help`);
      if (error) { ctrl.setAttribute("aria-describedby", `${id}-error`); ctrl.setAttribute("aria-invalid", "true"); }
      if (required) ctrl.setAttribute("required", "");
    }
  }
}
customElements.define("ps-field", PSField);
