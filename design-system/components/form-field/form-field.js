class PSField extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const label = this.getAttribute("label") || "";
    const help = this.getAttribute("help") || "";
    const error = this.getAttribute("error") || "";
    const required = this.hasAttribute("required");
    const id = this.getAttribute("for") || `f-${Math.random().toString(36).slice(2, 7)}`;
    const children = [...this.childNodes];
    const fieldLabel = document.createElement("label");
    fieldLabel.className = "ps-field__label";
    fieldLabel.htmlFor = id;
    fieldLabel.append(document.createTextNode(label));
    if (required) {
      const marker = document.createElement("span");
      marker.className = "ps-field__req";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "*";
      const requiredText = document.createElement("span");
      requiredText.className = "ps-text-caption";
      requiredText.textContent = " obligatorio";
      fieldLabel.append(marker, requiredText);
    }
    this.replaceChildren(fieldLabel, ...children);
    if (help) {
      const helpText = document.createElement("p");
      helpText.className = "ps-field__help";
      helpText.id = `${id}-help`;
      helpText.textContent = help;
      this.append(helpText);
    }
    if (error) {
      const errorText = document.createElement("p");
      errorText.className = "ps-field__error";
      errorText.setAttribute("role", "alert");
      errorText.id = `${id}-error`;
      errorText.textContent = error;
      this.append(errorText);
    }
    const ctrl = this.querySelector("input,select,textarea");
    if (ctrl) {
      ctrl.id = id;
      const descriptions = [help && `${id}-help`, error && `${id}-error`].filter(Boolean);
      if (descriptions.length) ctrl.setAttribute("aria-describedby", descriptions.join(" "));
      if (error) ctrl.setAttribute("aria-invalid", "true");
      if (required) ctrl.setAttribute("required", "");
    }
  }
}
customElements.define("ps-field", PSField);
