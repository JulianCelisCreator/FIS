// El design system oculta los ps-* que aún no están definidos (base.css, para
// evitar parpadeos). Los contenedores que genera React (shell, pestañas, diálogo,
// tabla) se registran sin comportamiento: quedan visibles y estilizados por
// etiqueta, y sus scripts originales no mueven los nodos que maneja React.
const CONTENEDORES = ['ps-app-shell', 'ps-tabs', 'ps-dialog', 'ps-data-table']

for (const etiqueta of CONTENEDORES) {
  if (!customElements.get(etiqueta)) {
    customElements.define(etiqueta, class extends HTMLElement {})
  }
}
