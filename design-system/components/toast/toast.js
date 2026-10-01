class PSToastRegion extends HTMLElement {
  connectedCallback() {
    this.setAttribute("role", "status");
    this.setAttribute("aria-live", "polite");
  }
  toast({ tone = "info", title = "", message = "" }) {
    const el = document.createElement("div");
    el.className = `ps-toast ps-toast--${tone}`;
    el.setAttribute("popover", "manual");
    el.innerHTML = `<p class="ps-alert__title">${title}</p><p class="ps-text-body-sm">${message}</p>`;
    this.append(el);
    el.showPopover?.();
    setTimeout(() => el.remove(), 5000);
  }
}
customElements.define("ps-toast-region", PSToastRegion);
window.PS = window.PS || {};
window.PS.toast = (opts) => document.querySelector("ps-toast-region")?.toast(opts);
