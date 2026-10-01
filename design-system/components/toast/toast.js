class PSToastRegion extends HTMLElement {
  connectedCallback() {
    this.setAttribute("role", "status");
    this.setAttribute("aria-live", "polite");
  }
  toast({ tone = "info", title = "", message = "" }) {
    const el = document.createElement("div");
    el.className = `ps-toast ps-toast--${tone}`;
    el.setAttribute("popover", "manual");
    const titleElement = document.createElement("p");
    titleElement.className = "ps-alert__title";
    titleElement.textContent = title;
    const messageElement = document.createElement("p");
    messageElement.className = "ps-text-body-sm";
    messageElement.textContent = message;
    el.append(titleElement, messageElement);
    this.append(el);
    el.showPopover?.();
    setTimeout(() => el.remove(), 5000);
  }
}
customElements.define("ps-toast-region", PSToastRegion);
window.PS = window.PS || {};
window.PS.toast = (opts) => document.querySelector("ps-toast-region")?.toast(opts);
