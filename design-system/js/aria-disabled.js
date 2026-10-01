// Bloqueo delegado de [aria-disabled="true"] (spec §7.5).
// Cargando = aria-busy + aria-disabled. El elemento conserva el foco.
document.addEventListener(
  "click",
  (e) => {
    const t = e.target.closest('[aria-disabled="true"]');
    if (t) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true
);
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const t = e.target.closest?.('[aria-disabled="true"]');
    if (t) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true
);
