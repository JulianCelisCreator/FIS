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
  const feedback = document.querySelector(dialog.dataset.feedback);
  if (feedback) {
    feedback.hidden = false;
    feedback.textContent = dialog.dataset.message || "Acción demostrativa completada.";
  }
  const { href } = dialog.dataset;
  dialog.close();
  if (href) location.href = href;
});

document.querySelectorAll("ps-tabs").forEach((tabs) => {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')];
  const syncPanels = () => buttons.forEach((button) => {
    const panel = document.getElementById(button.dataset.panel);
    if (panel) panel.hidden = button.getAttribute("aria-selected") !== "true";
  });
  tabs.addEventListener("ps-tab-change", syncPanels);
  syncPanels();
});

document.addEventListener("change", (event) => {
  const role = event.target.closest("[data-role-view]");
  if (!role) return;
  const selectedRole = role.value;
  document.querySelectorAll("[data-role-content]").forEach((section) => {
    section.hidden = !section.dataset.roleContent.split(" ").includes(selectedRole);
  });
});

document.addEventListener("ps-export", (event) => {
  const component = event.target.closest("ps-export-menu");
  if (!component) return;
  setTimeout(() => {
    component.removeAttribute("loading");
    component.setAttribute("status", "success");
  }, 600);
});

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-report-generate]");
  if (!action) return;
  const feedback = document.querySelector("[data-report-feedback]");
  if (!feedback) return;
  feedback.hidden = false;
  feedback.textContent = "Reporte demostrativo generado con los filtros seleccionados.";
});