# Button

- **Fila de origen:** components.md · Átomos
- **Tipo:** A
- **RF:** Transversal

## Anatomía
`<button>` o `<a>` con `.ps-button`. Slots: texto + `.ps-button__icon` opcional.

## API
| Elemento | Nombre | Valores | Por defecto | Descripción |
|---|---|---|---|---|
| Clase | `ps-button--primary\|secondary\|ghost\|destructive` | — | `primary` | Variante |
| Clase | `ps-button--sm\|md\|lg` | — | `md` | Tamaño |
| Atributo | `disabled`, `aria-disabled`, `aria-busy`, `loading` | — | — | `loading` traduce a `aria-busy` + `aria-disabled` |

## Estados
| Estado | Cómo se expresa (selector) | Tokens |
|---|---|---|
| default/hover/focus | `:hover`, `:focus-visible` | `--surface-action(-hover)`, `--border-focus` |
| disabled/loading | `[disabled]`, `[aria-disabled]`, `[aria-busy]` | `--surface-disabled`, `--text-disabled` |

## Responsive
375 · 768 · 1280. Altura por `--control-height` (alias); `sm` usa `--control-height-sm`.

## Accesibilidad
Enter/Espacio; con `aria-disabled` no acciona y mantiene foco; foco visible; área ≥44px en móvil (`lg`).

## Reglas de dominio
Verbos en español; nunca *Eliminar* (Anular/Desactivar).

## Casos de catálogo
4 variantes × 3 tamaños × {default, hover forzado, foco, disabled, loading}. Ejemplo: Guardar / Anular pago.
