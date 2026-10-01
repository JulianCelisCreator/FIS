class PSCalendar extends HTMLElement {
  static get observedAttributes() { return ["view", "date"]; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const view = ["month", "week", "day"].includes(this.getAttribute("view")) ? this.getAttribute("view") : "month";
    const inputDate = this.getAttribute("date") || "";
    const candidate = /^\d{4}-\d{2}-\d{2}$/.test(inputDate) ? new Date(`${inputDate}T00:00:00Z`) : null;
    const reference = candidate && candidate.toISOString().slice(0, 10) === inputDate ? candidate : new Date();
    const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
    if (view === "month") start.setUTCDate(1);
    if (view === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    const count = view === "day" ? 1 : view === "week" ? 7 : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    const calendar = document.createElement("div");
    calendar.className = "ps-calendar";
    calendar.dataset.view = view;
    const grid = document.createElement("div");
    grid.className = "ps-calendar__grid";
    grid.setAttribute("role", "grid");
    for (let i = 0; i < count; i++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const cell = document.createElement("div");
      cell.className = "ps-calendar__day";
      cell.setAttribute("role", "gridcell");
      cell.dataset.date = date.toISOString().slice(0, 10);
      const label = document.createElement("span");
      label.className = "ps-text-caption";
      label.textContent = String(date.getUTCDate());
      if (date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)) cell.setAttribute("aria-current", "date");
      const slot = document.createElement("slot");
      slot.name = `day-${date.getUTCDate()}`;
      cell.append(label, slot);
      grid.append(cell);
    }
    calendar.append(grid);
    this.replaceChildren(calendar);
  }
}
customElements.define("ps-calendar", PSCalendar);
