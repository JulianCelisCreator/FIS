class PSTooltip extends HTMLElement {
  connectedCallback() {
    if (this.dataset.psBuilt === "1") return;
    this.dataset.psBuilt = "1";
    const text = this.getAttribute("text") || "";
    const children = [...this.childNodes];
    const wrap = document.createElement("span");
    wrap.className = "ps-tooltip";
    wrap.append(...children);
    const bubble = document.createElement("span");
    bubble.className = "ps-tooltip__bubble";
    bubble.setAttribute("role", "tooltip");
    bubble.id = `tooltip-${Math.random().toString(36).slice(2, 9)}`;
    bubble.hidden = true;
    bubble.textContent = text;
    wrap.append(bubble);
    this.replaceChildren(wrap);
    const trigger = wrap.querySelector("button, a, input, select, textarea, [tabindex]") || wrap;
    const descriptions = new Set((trigger.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    descriptions.add(bubble.id);
    trigger.setAttribute("aria-describedby", [...descriptions].join(" "));
    const show = () => bubble.hidden = false;
    const hide = () => bubble.hidden = true;
    wrap.addEventListener("mouseenter", show); wrap.addEventListener("mouseleave", hide);
    wrap.addEventListener("focusin", show); wrap.addEventListener("focusout", hide);
    wrap.addEventListener("click", () => bubble.hidden = !bubble.hidden);
  }
}
customElements.define("ps-tooltip", PSTooltip);
