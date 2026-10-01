class PSDialog extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const variant = this.getAttribute("variant") || "confirm";
    const heading = this.getAttribute("heading") || "";
    const confirmLabel = this.getAttribute("confirm-label") || "Confirmar";
    const cancelLabel = this.getAttribute("cancel-label") || "Cancelar";
    const reasonLabel = this.getAttribute("reason-label") || "Motivo de la anulación";
    const id = `dlg-${Math.random().toString(36).slice(2, 7)}`;
    const body = this.innerHTML;
    this.innerHTML = `<dialog aria-labelledby="${id}-t"><h3 id="${id}-t" class="ps-text-heading-h4">${heading}</h3><div data-slot="body">${body}</div>${variant === "reason" ? `<ps-field label="${reasonLabel}" required for="${id}-r"><textarea id="${id}-r" class="ps-textarea" rows="3"></textarea></ps-field><p class="ps-text-caption">Quedará registrado con tu usuario, la fecha y este motivo</p><div data-slot="error"></div>` : ""}<div class="ps-dialog__actions"><button class="ps-button ps-button--secondary" data-act="cancel">${cancelLabel}</button><button class="ps-button ${variant === "reason" ? "ps-button--destructive" : "ps-button--primary"}" data-act="confirm" ${variant === "reason" ? 'aria-disabled="true"' : ""}>${confirmLabel}</button></div></dialog>`;
    const dlg = this.querySelector("dialog");
    this.show = () => { this._opener = document.activeElement; dlg.showModal(); this.querySelector("textarea")?.focus(); };
    this.close = () => { dlg.close(); this._opener?.focus(); };
    this.querySelector('[data-act="cancel"]').addEventListener("click", () => { this.dispatchEvent(new CustomEvent("ps-cancel", { bubbles: true, composed: true })); this.close(); });
    this.querySelector('[data-act="confirm"]').addEventListener("click", () => {
      if (this.getAttribute("loading") !== null) return;
      const reason = this.querySelector("textarea")?.value.trim() ?? "";
      if (variant === "reason" && !reason) return;
      this.dispatchEvent(new CustomEvent("ps-confirm", { bubbles: true, composed: true, detail: { reason } }));
      this.close();
    });
    this.querySelector("textarea")?.addEventListener("input", (e) => {
      const btn = this.querySelector('[data-act="confirm"]');
      if (e.target.value.trim()) btn.removeAttribute("aria-disabled"); else btn.setAttribute("aria-disabled", "true");
    });
    dlg.addEventListener("cancel", (e) => {
      if (this.getAttribute("loading") !== null) { e.preventDefault(); return; }
      this.dispatchEvent(new CustomEvent("ps-cancel", { bubbles: true, composed: true }));
    });
  }
}
customElements.define("ps-dialog", PSDialog);
