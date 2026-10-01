// Comportamiento de los wireframes del grupo 04. Sin estilos: solo conecta
// componentes del Design System (diálogos, pestañas, selección y patinador activo).
import "../../../design-system/ps.js";

// Abre un <ps-dialog>: <button data-open="id-del-dialogo">.
document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open]");
  if (!opener || opener.getAttribute("aria-disabled") === "true") return;
  event.preventDefault();
  document.getElementById(opener.dataset.open)?.show();
});

// Menús de acciones (fuera de ExportMenu, que trae su propio comportamiento).
const menuTriggers = () => document.querySelectorAll('[aria-haspopup="menu"][aria-controls]:not(ps-export-menu *)');
function closeMenus(except) {
  menuTriggers().forEach((trigger) => {
    const menu = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!menu || menu === except) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });
}
document.addEventListener("click", (event) => {
  const trigger = event.target.closest('[aria-haspopup="menu"][aria-controls]');
  if (trigger && !trigger.closest("ps-export-menu")) {
    const menu = document.getElementById(trigger.getAttribute("aria-controls"));
    closeMenus(menu);
    menu.hidden = !menu.hidden;
    trigger.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('[role="menuitem"]')?.focus();
    return;
  }
  closeMenus();
}, true);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const menu = event.target.closest("ps-menu");
  if (!menu || menu.closest("ps-export-menu")) return;
  closeMenus();
  document.querySelector(`[aria-controls="${menu.id}"]`)?.focus();
});

// Al confirmar un diálogo: data-next abre otro diálogo, data-href navega; si no, se cierra.
document.addEventListener("ps-confirm", (event) => {
  const dialog = event.target.closest("ps-dialog");
  if (!dialog) return;
  const { next, href } = dialog.dataset;
  dialog.close();
  if (next) document.getElementById(next)?.show();
  else if (href) location.href = href;
});

// Pestañas: cada tab lleva data-panel con el id de su sección. El ancla de la URL
// (#cambiar, #sesion) abre la pestaña correspondiente.
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
  if (fromHash) fromHash.click();
  else sync();
});

// Card seleccionable: refleja el radio marcado en aria-selected.
document.addEventListener("change", (event) => {
  const radio = event.target;
  if (radio.type !== "radio") return;
  document.querySelectorAll(`input[type="radio"][name="${radio.name}"]`).forEach((option) => {
    option.closest(".ps-card--selectable")?.setAttribute("aria-selected", String(option.checked));
  });
});

// ExportMenu: simula la generación del archivo (en la app real responde el servidor).
document.addEventListener("ps-export", (event) => {
  const menu = event.target;
  setTimeout(() => {
    menu.removeAttribute("loading");
    menu.setAttribute("status", "success");
  }, 800);
});

// Patinador activo (PlayerContextSwitcher): muestra solo su sección [data-player].
document.addEventListener("ps-player-change", ({ detail }) => {
  document.querySelectorAll("[data-player]").forEach((section) => {
    section.hidden = section.dataset.player !== detail.id;
  });
});
