class PSDialog extends HTMLElement {
  static get observedAttributes() { return ["loading"]; }

  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const variant = this.getAttribute("variant") || "confirm";
    const id = `dlg-${Math.random().toString(36).slice(2, 7)}`;
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-labelledby", `${id}-t`);
    const heading = document.createElement("h3");
    heading.id = `${id}-t`;
    heading.className = "ps-text-heading-h4";
    heading.textContent = this.getAttribute("heading") || "";
    const body = document.createElement("div");
    body.dataset.slot = "body";
    while (this.firstChild) body.append(this.firstChild);
    dialog.append(heading, body);
    if (variant === "reason") {
      const field = document.createElement("ps-field");
      field.setAttribute("label", this.getAttribute("reason-label") || "Motivo de la anulación");
      field.setAttribute("required", "");
      field.setAttribute("for", `${id}-r`);
      const textarea = document.createElement("textarea");
      textarea.id = `${id}-r`;
      textarea.className = "ps-textarea";
      textarea.rows = 3;
      field.append(textarea);
      const caption = document.createElement("p");
      caption.className = "ps-text-caption";
      caption.textContent = "Quedará registrado con tu usuario, la fecha y este motivo";
      const error = document.createElement("div");
      error.dataset.slot = "error";
      dialog.append(field, caption, error);
    }
    const actions = document.createElement("div");
    actions.className = "ps-dialog__actions";
    const cancel = document.createElement("button");
    cancel.className = "ps-button ps-button--secondary";
    cancel.dataset.act = "cancel";
    cancel.textContent = this.getAttribute("cancel-label") || "Cancelar";
    const confirm = document.createElement("button");
    confirm.className = `ps-button ${variant === "reason" ? "ps-button--destructive" : "ps-button--primary"}`;
    confirm.dataset.act = "confirm";
    confirm.textContent = this.getAttribute("confirm-label") || "Confirmar";
    if (variant === "reason") confirm.setAttribute("aria-disabled", "true");
    actions.append(cancel, confirm);
    dialog.append(actions);
    this.replaceChildren(dialog);
    const dlg = this.querySelector("dialog");
    this.show = () => { this._opener = document.activeElement; dlg.showModal(); this.querySelector("textarea")?.focus(); };
    this.close = () => {
      if (this.hasAttribute("loading")) return;
      dlg.close();
      this._opener?.focus();
    };
    this.querySelector('[data-act="cancel"]').addEventListener("click", () => {
      if (this.hasAttribute("loading")) return;
      this.dispatchEvent(new CustomEvent("ps-cancel", { bubbles: true, composed: true }));
      this.close();
    });
    this.querySelector('[data-act="confirm"]').addEventListener("click", () => {
      if (this.getAttribute("loading") !== null) return;
      const reason = this.querySelector("textarea")?.value.trim() ?? "";
      if (variant === "reason" && !reason) return;
      this.dispatchEvent(new CustomEvent("ps-confirm", { bubbles: true, composed: true, detail: { reason } }));
    });
    this.querySelector("textarea")?.addEventListener("input", (e) => {
      const btn = this.querySelector('[data-act="confirm"]');
      if (e.target.value.trim()) btn.removeAttribute("aria-disabled"); else btn.setAttribute("aria-disabled", "true");
    });
    dlg.addEventListener("cancel", (e) => {
      if (this.getAttribute("loading") !== null) { e.preventDefault(); return; }
      this.dispatchEvent(new CustomEvent("ps-cancel", { bubbles: true, composed: true }));
    });
    this.updateLoading();
  }

  attributeChangedCallback() {
    if (this.dataset.psBuilt === "1") this.updateLoading();
  }

  updateLoading() {
    const loading = this.hasAttribute("loading");
    const dialog = this.querySelector("dialog");
    if (!dialog) return;
    if (loading) dialog.setAttribute("aria-busy", "true");
    else dialog.removeAttribute("aria-busy");
    this.querySelectorAll('[data-act="cancel"], [data-act="confirm"]').forEach((button) => {
      button.disabled = loading;
    });
  }
}
customElements.define("ps-dialog", PSDialog);
