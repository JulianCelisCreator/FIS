class PSCalendar extends HTMLElement {
  static get observedAttributes() { return ["view"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const view = this.getAttribute("view") || "month";
    this.innerHTML = `<div class="ps-calendar" data-view="${view}"><div class="ps-calendar__grid" role="grid">${Array.from({ length: view === "month" ? 30 : 7 }, (_, i) => `<div class="ps-calendar__day" role="gridcell"><span class="ps-text-caption">${i + 1}</span><slot name="day-${i + 1}"></slot></div>`).join("")}</div></div>`;
  }
}
customElements.define("ps-calendar", PSCalendar);
