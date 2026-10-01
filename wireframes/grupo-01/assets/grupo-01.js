// Comportamiento de los wireframes del grupo 01 (Módulo 1). Sin estilos:
// solo conecta componentes del Design System (diálogos y menús de fila).
import "../../../design-system/ps.js";

// Abre un <ps-dialog>: <button data-open="id-del-dialogo">.
document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open]");
  if (!opener || opener.getAttribute("aria-disabled") === "true") return;
  event.preventDefault();
  document.getElementById(opener.dataset.open)?.show();
});

// Menús de acciones por fila (IconButton + Menu).
const menuTriggers = () => document.querySelectorAll('[aria-haspopup="menu"][aria-controls]');
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
  if (trigger) {
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
  if (!menu) return;
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
