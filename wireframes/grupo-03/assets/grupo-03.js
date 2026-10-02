// Interacciones de demostración. Los componentes y sus estilos pertenecen al DS.
import "../../../design-system/ps.js";

document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open]");
  if (!opener || opener.getAttribute("aria-disabled") === "true") return;
  event.preventDefault();
  document.getElementById(opener.dataset.open)?.show();
});

document.addEventListener("ps-confirm", (event) => {
  const dialog = event.target.closest("ps-dialog");
  if (!dialog) return;
  dialog.close();
  const notice = document.getElementById(dialog.dataset.notice || "");
  if (notice) notice.hidden = false;
});

document.querySelectorAll("ps-tabs").forEach((tabs) => {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')];
  const sync = () => buttons.forEach((button) => {
    const panel = document.getElementById(button.dataset.panel);
    if (panel) panel.hidden = button.getAttribute("aria-selected") !== "true";
  });
  tabs.addEventListener("ps-tab-change", ({ detail }) => {
    sync();
    history.replaceState(null, "", `#${detail.panel}`);
  });
  const fromHash = buttons.find((button) => button.dataset.panel === location.hash.slice(1));
  if (fromHash) fromHash.click(); else sync();
});

document.addEventListener("change", (event) => {
  if (!event.target.matches("[data-skill-toggle]")) return;
  const counter = document.querySelector("[data-skill-count]");
  if (counter) counter.textContent = String(document.querySelectorAll("[data-skill-toggle]:checked").length);
});
