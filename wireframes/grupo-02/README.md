# Grupo 02 · Módulo 3: Grupos, Horarios y Programación

**Integrantes:** Juan David Bejarano Cristancho, Maikol Quitian Caicedo, Erika Juliana Puerto Corchuelo, Juan Steban Valbuena Nuncira
**Docente:** Jaime Fernando Pérez González · Universidad Distrital Francisco José de Caldas
**Fuente:** *Historias de Usuario – Módulo 3* (23/09/2026)

## Páginas

| Carpeta | Historia | Actor | Requerimientos |
|---|---|---|---|
| `grupos/` | HU-3.1 Configuración de grupos y aforo | Administrador | RF2.5, RF1.4 |
| `asignacion-profesores/` | HU-3.2 Asignación de profesores | Administrador | RF2.2, RF1.3 |
| `horarios/` | HU-3.3 Programación de horarios de clase | Administrador | RF2.1, RF2.4 |
| `cambio-grupo/` | HU-3.4 Selección y cambio de grupo | Estudiante / Acudiente | RF1.4, RF2.5 |
| `calendario/` | HU-3.5 Calendario interactivo | Todos los roles | RF2.1, RF3.3 |

Cada carpeta tiene su `.html` (prototipo) y su `.png` (captura a 1280 px). Abrir `index.html` para navegar entre páginas.

## Decisiones de diseño

- Se usan los tokens y componentes `ps-` del design system FIS: tema claro, tipografía Inter, espaciado en múltiplos de 4 px.
- Los estilos compartidos están en `assets/styles.css`, con los valores de `tokens.css` y los componentes usados (Button, Field, Badge, Capacity Meter, Alert, Dialog, Data Table, Filter Bar, Card).
- **Aforo (HU-3.1, HU-3.4):** Con cupo (&lt;90 %), Alerta al 90 % y Lleno (100 %). Siempre texto + ícono, nunca solo color. Al 100 % se bloquea la inscripción.
- **Conflictos (HU-3.2, HU-3.3):** se muestran en Alert/Dialog y bloquean la acción hasta resolverlos.
- **Lenguaje:** se usa «Anular» y «Desactivar», nunca «Eliminar»; la anulación pide motivo obligatorio.
- **Calendario (HU-3.5):** clase = neutral, competencia = info, fecha institucional = borde punteado. Solo el Admin ve «+ Evento global».

## Pendiente

- Los íconos son glifos de texto; en implementación se reemplazan por `icons/sprite.svg`.
- Vista móvil (agenda del calendario) solo indicada en notas.
- Los nombres de carpeta de página deben alinearse con la lista oficial de páginas del README raíz.
