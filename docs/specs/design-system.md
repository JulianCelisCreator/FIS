# Spec SDD: implementación del Design System (tokens.css y componentes sin framework)

| Campo | Valor |
|---|---|
| Estado | Borrador v0.1 |
| Fecha | 30/09/2026 |
| Proyecto | Plataforma de gestión para escuela de patinaje (nombre pendiente) |
| Fuente de verdad del diseño | Skill `patinaje-design-system` (`.agents/skills/patinaje-design-system/`) |
| Esta spec define | **Cómo** se construye en código lo que la skill define. No redefine tokens ni componentes |

## Contenido

1. Propósito y alcance
2. Decisiones de arquitectura
3. Fuente de verdad y flujo de cambios
4. Estructura del repositorio
5. Requisitos del DS
6. Especificación de `tokens.css`
7. Convenciones de implementación
8. Matriz de implementación por componente
9. Ejemplos de referencia
10. Catálogo y verificación
11. Plan por fases
12. Definición de terminado
13. Riesgos
14. Decisiones pendientes
15. Plantilla de mini-spec por componente

---

## 1. Propósito y alcance

Construir, **sin framework ni paso de compilación obligatorio**, el `tokens.css` y la librería de componentes reutilizables que usarán los seis módulos (M1 a M6).

**Incluye:** `tokens.css`; CSS base; CSS y JS de los componentes del catálogo de la skill; funciones de formato (`MM:SS.mmm`, COP, fechas); un catálogo vivo navegable; scripts de verificación sin dependencias.

**No incluye:** pantallas ni flujos de módulo, lógica de negocio, permisos por rol, acceso a datos, modo oscuro, animaciones (salvo el indicador de carga), ni marca.

---

## 2. Decisiones de arquitectura

### ADR-01. HTML semántico + CSS por clases + Custom Elements solo para comportamiento

**Respuesta a «¿se pueden reutilizar componentes sin React?»:** sí. El navegador ya trae lo necesario: variables CSS, `@layer`, `<dialog>`, el atributo `popover`, módulos ES y Custom Elements.

| Opción | A favor | En contra | Veredicto |
|---|---|---|---|
| Solo CSS con clases sobre HTML nativo | Cero JS, funciona en cualquier stack, fácil de inspeccionar | No resuelve comportamiento (diálogos, pestañas, máscaras); el marcado se repite | **Sí**, para lo que no necesita comportamiento |
| Custom Elements con Shadow DOM | Encapsulación total | Los formularios no participan por defecto, el estilo global no entra, dificulta referencias ARIA entre elementos | No |
| Custom Elements en *light DOM* | Reutilizables como `<ps-dialog>`, estándar, sin build, tokens y CSS global aplican, formularios nativos funcionan | Sin `<slot>` nativo (se usa `data-slot`); hay que evitar el parpadeo previo al registro | **Sí**, para lo que necesita comportamiento |
| Framework (React, Vue…) | Ecosistema | Es justo lo que se quiere evitar; ata el DS a un stack | No |

Regla práctica: **si el navegador ya lo hace (botón, input, select, checkbox, `<dialog>`, `<details>`), se usa el elemento nativo con clases.** Se crea un Custom Element solo cuando hace falta comportamiento propio (máscaras, pestañas con teclado, menús, tablas ordenables, regla de aforo).

Como el marcado es HTML puro, **los equipos pueden armar sus wireframes en HTML con los mismos componentes** si lo prefieren.

### ADR-02. *Light DOM*, no Shadow DOM
Los componentes envuelven elementos nativos (`<input>`, `<dialog>`) para conservar envío de formularios, autocompletado y accesibilidad sin trabajo extra. Las variables CSS atraviesan el Shadow DOM, pero ese no es el problema: el problema son los formularios y las referencias ARIA.

### ADR-03. El estado vive en atributos nativos y ARIA, no en clases
`disabled`, `readonly`, `required`, `aria-invalid`, `aria-busy`, `aria-selected`, `aria-current`, `aria-expanded`. El mismo selector CSS sirve de contrato de accesibilidad. Hover y foco se resuelven con `:hover` y `:focus-visible`. **No se usan clases como `.is-error`.**

### ADR-04. Orden de cascada con `@layer`
`@layer ps.reset, ps.tokens, ps.base, ps.components, ps.utilities;`
Se declara al inicio de cada archivo de entrada. Los estilos de la app sin capa siempre ganan sobre los del DS, así que un módulo puede ajustar algo puntual sin `!important`.

### ADR-05. Los breakpoints son literales en `@media` y `@container`
Las variables CSS **no** se pueden usar dentro de una condición `@media`. Por eso `--bp-*` existe en `tokens.css` como referencia y para JS, pero las consultas usan los valores literales 640, 768, 1024 y 1280. Son los únicos valores en `px` permitidos fuera de `tokens.css`.

### ADR-06. Sin paso de compilación obligatorio
Módulos ES nativos (`<script type="module">`) y CSS con `@import` en desarrollo. Un script opcional concatena a un solo `ps.css` y `ps.js` para producción. **El catálogo y los archivos de módulo no funcionan abriendo el HTML con `file://`**: hay que servirlos por HTTP local (por ejemplo `python3 -m http.server`).

### ADR-07. Valor canónico distinto del valor de presentación
Los componentes de entrada formatean lo que se ve, pero **el valor que viaja al formulario es canónico**:

| Componente | Se muestra | Valor canónico (`name=`) |
|---|---|---|
| `ps-currency-input` | `$ 85.000` | entero en COP: `85000` |
| `ps-time-input` | `01:23.450` | entero en milisegundos: `83450` |
| `ps-date-input` | `21/09/2026` | ISO: `2026-09-21` |

Cada uno mantiene un `<input>` visible y un `<input type="hidden" name="…">` con el valor canónico.

---

## 3. Fuente de verdad y flujo de cambios

- **El diseño manda.** `tokens.md`, `components.md` y `status-and-formats.md` de la skill son la fuente de verdad. Si el código necesita algo que la skill no dice, **se cambia primero la skill** y después el código.
- Todo componente implementado debe poder trazarse a una fila de `components.md` y a sus RF.
- Versionado semántico en `docs/CHANGELOG.md`. Cada entrada cita el RF o la decisión que la motivó.

---

## 4. Estructura del repositorio

```
design-system/
├── tokens.css                     ← archivo único de tokens (sección 6)
├── ps.css                         ← entrada CSS: @layer + @import de todo
├── ps.js                          ← entrada JS: importa y registra todo
├── base/
│   ├── reset.css
│   ├── base.css                   ← html, body, alias responsivos, foco global
│   ├── typography.css             ← clases .ps-text-* (estilos de texto)
│   └── layout.css                 ← .ps-container, .ps-grid
├── components/
│   └── {nombre}/
│       ├── {nombre}.css
│       └── {nombre}.js            ← solo si el componente es tipo B
├── js/
│   ├── format.js                  ← formatTime, formatCOP, formatDate, parse*
│   ├── status-catalog.js          ← entidad + estado → etiqueta, tono, ícono
│   └── aria-disabled.js           ← bloqueo delegado de [aria-disabled="true"]
├── icons/
│   └── sprite.svg                 ← íconos mínimos (sección 7.8)
├── catalog/
│   ├── index.html
│   └── {nombre}.html              ← una página por componente
├── scripts/
│   ├── check-raw-values.mjs
│   ├── check-tokens-sync.mjs
│   └── check-contrast.mjs
├── tests/
│   └── *.test.mjs                 ← pruebas de funciones puras (runner nativo de Node)
└── CHANGELOG.md
```

Prefijo **`ps`** (por *patinaje school*) en clases, elementos y eventos personalizados. Los tokens **no** llevan prefijo, tal como los define la skill.

---

## 5. Requisitos del DS

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| DSR-01 | Sin dependencias de ejecución ni paso de compilación obligatorio | El catálogo funciona servido con un servidor estático y sin `node_modules` |
| DSR-02 | Un solo punto de entrada CSS y uno JS; `tokens.css` utilizable por sí solo | Una página que enlaza solo `tokens.css` resuelve todas las variables |
| DSR-03 | Los componentes usan solo tokens de capa 2 | `check-raw-values.mjs` termina con 0 infracciones (reglas en 7.9) |
| DSR-04 | Los componentes tipo A funcionan sin JS | Con JS deshabilitado, el catálogo muestra bien todos los tipo A |
| DSR-05 | El estado se expresa con atributos nativos o ARIA (ADR-03) | Ningún archivo `.css` de componente contiene selectores `.is-*` ni `.has-error` |
| DSR-06 | Responsive en 375, 768 y 1280 | Cada página del catálogo se revisa en los tres anchos sin desbordamiento horizontal de la página |
| DSR-07 | Accesibilidad: teclado completo, foco visible, roles ARIA correctos, contraste, áreas tocables | Checklist de la sección 12 marcada por componente; `check-contrast.mjs` sin fallos |
| DSR-08 | Formatos colombianos en **un solo lugar** | Solo `js/format.js` formatea tiempos, moneda y fechas; pasa los casos de la sección 7.7 |
| DSR-09 | Catálogo vivo con todos los estados | Cada página de `catalog/` muestra cada variante y cada estado de la fila correspondiente de `components.md` |
| DSR-10 | Trazabilidad | Cada página del catálogo lista los RF de origen |
| DSR-11 | Compatibilidad | Navegadores actuales (Chrome, Edge, Firefox y Safari, últimas 2 versiones). **Supuesto a confirmar** (sección 14) |
| DSR-12 | Fidelidad de tokens | `check-tokens-sync.mjs` confirma que todo token de `tokens.md` existe en `tokens.css` con el mismo nombre y valor, y viceversa |

---

## 6. Especificación de `tokens.css`

Archivo único, en este orden de secciones y con comentarios de encabezado:

```css
@layer ps.reset, ps.tokens, ps.base, ps.components, ps.utilities;

@layer ps.tokens {
  :root {
    /* 1. Color · capa 1 (primitivas)        --color-* */
    /* 2. Color · capa 2 (texto, superficie, borde, ícono) */
    /* 3. Espaciado                          --spacing-* */
    /* 4. Tipografía                         --type-*, --fontsize-*, --lineheight-* */
    /* 5. Breakpoints (solo referencia)      --bp-* */
    /* 6. Layout                             --layout-* */
    /* 7. Radios, grosores y elevación       --radius-*, --stroke-*, --shadow-* */
    /* 8. Tamaños                            --control-height-*, --icon-size-* */
  }
}
```

**Reglas**
1. Nombres y valores **idénticos** a `tokens.md`. La capa 2 se define con `var(--color-…)`, nunca con el hex repetido.
2. `--surface-overlay` se expresa como `color-mix(in srgb, var(--color-neutral-900) 50%, transparent)`.
3. `--shadow-raised` y `--shadow-overlay` con los valores de `tokens.md` §7, pero con los colores derivados de `--color-neutral-900`.
4. Los estilos de texto (`heading-h1`…, `numeric-lg`) **no** son variables: son clases `.ps-text-*` en `base/typography.css`. Las cifras (`numeric-*`) llevan `font-variant-numeric: tabular-nums`. Los títulos `h1`, `h2` y `h3` usan el tamaño móvil por debajo de 768 px.
5. **Alias responsivos** (en `base/base.css`, no en `tokens.css`): `--control-height` (`lg` por debajo de 768, `md` desde 768), y `--layout-columns`, `--layout-margin`, `--layout-gutter` (según los rangos de `tokens.md` §6). Son alias derivados, no tokens nuevos; se documentan en `tokens.md` (tarea T0-2).
6. Los `@font-face` van aparte (`base/fonts.css`). Ver decisión pendiente sobre tipografía.

---

## 7. Convenciones de implementación

### 7.1 Nombres
- Clases: BEM con prefijo. `.ps-button`, `.ps-button__icon`, `.ps-button--primary`, `.ps-button--lg`.
- Elementos: `ps-{nombre-en-kebab}`: `<ps-dialog>`, `<ps-capacity-meter>`.
- Variantes y tamaños: modificadores de clase en tipo A, atributos `variant` y `size` en tipo B.

### 7.2 Atributos
- Los booleanos usan la forma nativa (`disabled`, `readonly`, `required`).
- Atributos propios: `variant`, `size`, `loading` (el componente traduce `loading` a `aria-busy="true"`).
- `tone` solo existe en componentes donde la skill permite un tono libre (`Badge`, `Alert`, `Toast`, `KPICard`). **`StatusBadge` no tiene `tone`**: lo resuelve el catálogo de estados.
- Los atributos se reflejan en propiedades y viceversa cuando aplica.

### 7.3 Eventos
- Eventos personalizados con prefijo `ps-`, `bubbles: true`, `composed: true`, datos en `detail`. Ejemplos: `ps-confirm`, `ps-cancel`, `ps-sort`, `ps-page-change`, `ps-filter-change`, `ps-player-change`, `ps-export`.
- Los componentes basados en elementos nativos **conservan** los eventos nativos (`input`, `change`, `close`).

### 7.4 *Slots*
Como no hay Shadow DOM, los *slots* son hijos con `data-slot="{nombre}"` (por ejemplo `data-slot="header"`, `data-slot="actions"`). Cada componente documenta sus *slots* en su mini-spec.

### 7.5 Carga y bloqueo
- Cargando = `aria-busy="true"` **más** `aria-disabled="true"`. El bloqueo de clic y de Enter/Espacio lo hace un único oyente delegado (`js/aria-disabled.js`) sobre `[aria-disabled="true"]`. Así el elemento conserva el foco.
- El único movimiento permitido en v1 es la rotación del indicador de carga. Se desactiva con `prefers-reduced-motion: reduce`.

### 7.6 Responsive
- Las vistas se adaptan por **ancho del contenedor** (`container-type: inline-size`) cuando el componente puede vivir en columnas de distinto ancho (`DataTable`, `GroupCard`, `KPICard`), y por viewport cuando el cambio es de la estructura general (`AppShell`).
- `DataTable` en modo tarjeta: cada `<td>` lleva `data-label="…"` y el CSS lo muestra con `attr()`. Sin `data-label` en todas las celdas, el componente no pasa la revisión.
- `Dialog`: *bottom sheet* para `Confirm` y `ConfirmWithReason`; pantalla completa para `Form` (decisión tomada entre las dos que permite la skill).
- Ninguna página debe tener desplazamiento horizontal a nivel de documento.

### 7.7 Formatos (`js/format.js`)

Funciones puras, exportadas y probadas:

| Función | Entrada | Salida |
|---|---|---|
| `formatTime(ms)` | `83450` | `"01:23.450"` |
| `parseTime(text)` | `"01:23.450"` | `83450`; `null` si el formato es inválido |
| `formatCOP(n)` | `85000` | `"$ 85.000"` |
| `parseCOP(text)` | `"$ 85.000"` | `85000` |
| `formatDate(iso)` | `"2026-09-21"` | `"21/09/2026"` |
| `parseDate(text)` | `"21/09/2026"` | `"2026-09-21"`; `null` si es inválida |
| `formatPosition(n)` | `1` | `"1.º"` |

Reglas y bordes:
- Milisegundos siempre presentes, tres dígitos. Los minutos tienen al menos dos dígitos.
- COP sin decimales; el separador de miles es el punto; prefijo `$`.
- Se puede apoyar en `Intl` con el idioma `es-CO`, pero **las fechas deben forzar `day` y `month` a `2-digit`**: sin eso el resultado puede perder los ceros (`30/9/2026`). Las pruebas fijan el resultado esperado para no depender del motor.
- `parseDate` rechaza fechas inexistentes (`31/02/2026`).

### 7.8 Íconos
`<ps-icon name="check-circle" size="md">` dibuja un `<svg><use href="…/sprite.svg#check-circle"/></svg>`. Se colorea con `currentColor`; el color lo da el token `--icon-*` del contexto.

Íconos mínimos derivados del catálogo: `check-circle`, `alert-triangle`, `x-circle`, `info`, `minus-circle` (tonos); `chevron-up/down/left/right`, `arrow-up/down`, `arrow-left`; `search`, `filter`, `calendar`, `clock`, `download`, `x`, `menu`, `more-vertical`, `plus`, `user`.
La librería concreta está pendiente (sección 14). **Mientras tanto se usan glifos provisionales** con los mismos nombres, de modo que cambiar la librería solo reemplaza `sprite.svg`.

### 7.9 Reglas de `check-raw-values.mjs`
Sobre `components/**/*.css` y `base/**/*.css` (no sobre `tokens.css`) falla si encuentra:
- Colores literales (`#…`, `rgb(`, `hsl(`, nombres de color salvo `transparent` y `currentColor`).
- Longitudes en `px`, `rem` o `em`, salvo: `0`; los cuatro breakpoints dentro de `@media` y `@container`; `outline-offset: 2px`.
- `font-size`, `line-height` o `font-weight` que no vengan de `var(--fontsize-*)`, `var(--lineheight-*)` o `var(--type-font-weight-*)`.
- Sombras que no sean `var(--shadow-*)`.
- `z-index` literal (ver decisión pendiente sobre capas de apilamiento).

---

## 8. Matriz de implementación por componente

**Tipo A** = CSS sobre HTML nativo. **Tipo B** = CSS + Custom Element. **Tipo C** = patrón de marcado documentado en el catálogo (composición de otros componentes, sin código propio).

### Fase 1: Átomos básicos

| Componente | Tipo | Implementación |
|---|---|---|
| `Button`, `IconButton` | A | `<button>` o `<a>` con `.ps-button` |
| `Link` | A | `<a class="ps-link">` |
| `Icon` | B | `<ps-icon>` |
| `Badge` | A | `.ps-badge` + `.ps-badge--{tono}` |
| `StatusBadge` | B | `<ps-status-badge entity="cartera" status="vencido">` |
| `Avatar` | B | `<ps-avatar name="Sofía Ramírez">` calcula iniciales |
| `Skeleton` | A | `.ps-skeleton` |
| `TimeDisplay`, `CurrencyDisplay` | B | `<ps-time-display value="83450">`, `<ps-currency-display value="85000">` |

### Fase 2: Formularios

| Componente | Tipo | Implementación |
|---|---|---|
| `TextInput`, `Textarea`, `Checkbox`, `RadioGroup` | A | Elementos nativos con `.ps-input`, `.ps-checkbox`… |
| `Switch` | A | `<input type="checkbox" role="switch">` con `.ps-switch` |
| `Select` `single` | A | `<select>` nativo con `.ps-select` |
| `Select` `searchable`/`multiple` | B | `<ps-combobox>` (se puede diferir; ver riesgos) |
| `FormField` | B | `<ps-field>` conecta `label`/`for`, `aria-describedby`, `aria-invalid`, marca de obligatorio |
| `CurrencyInput`, `TimeInput`, `DateInput` | B | `<ps-currency-input>`, `<ps-time-input>`, `<ps-date-input>` (ADR-07) |
| `TransactionFields` | C | Cuatro `ps-field` en orden fijo |

### Fase 3: Retroalimentación y superposiciones

| Componente | Tipo | Implementación |
|---|---|---|
| `Alert` | A | `.ps-alert` + tono; el botón de descartar lo maneja un comportamiento mínimo |
| `Toast` | B | `<ps-toast-region>` + función `PS.toast({...})`; usa `popover` |
| `Dialog` (`Confirm`, `ConfirmWithReason`, `Form`) | B | `<ps-dialog variant="confirm|reason|form">` sobre `<dialog>` nativo |
| `Menu` | B | `<ps-menu>` con `popover` y navegación con flechas |
| `Tooltip` | B | `<ps-tooltip>` |
| `EmptyState` | A | `.ps-empty-state` |

### Fase 4: Navegación y estructura

| Componente | Tipo | Implementación |
|---|---|---|
| `Card`, `DescriptionList`, `Breadcrumb`, `Stepper`, `Timeline` | A | Clases sobre `<dl>`, `<nav>`, `<ol>` |
| `Tabs` | B | `<ps-tabs>` con roles y teclado |
| `Pagination` | B | `<ps-pagination page="3" pages="12">` emite `ps-page-change` |
| `AppShell` | B | `<ps-app-shell>` controla el *drawer* en móvil; navegación por *slot* |

### Fase 5: Datos y dominio

| Componente | Tipo | Implementación |
|---|---|---|
| `CapacityMeter` | B | Contiene la regla del 90 % y 100 % (ejemplo 9.2) |
| `AuditEntry` | A | `.ps-audit-entry` |
| `FilterBar` | B | `<ps-filter-bar>` chips, limpiar, versión móvil con `ps-dialog` |
| `DataTable`, `RankingTable` | B | `<ps-data-table>`: orden, selección, modo tarjeta, estados `loading`/`empty`/`error` |
| `PlayerProfileCard`, `KPICard`, `RequestTracker` | A/C | Clases y patrones de marcado |
| `PlayerContextSwitcher` | B | `<ps-player-switcher>` emite `ps-player-change`; se oculta con un solo patinador |
| `ValidationChecklist` | B | `<ps-validation-checklist>` con las cuatro filas fijas |
| `GroupCard` | B | `<ps-group-card>` usa `CapacityMeter`; «Lleno» lo deja con `aria-disabled` |
| `ExportMenu` | B | `<ps-export-menu formats="pdf,xlsx">` emite `ps-export`; estados `loading`/`error` |

### Fase 6: Calendario

| Componente | Tipo | Implementación |
|---|---|---|
| `Calendar` | B | `<ps-calendar view="month|week|day">`; en móvil se convierte en agenda |

---

## 9. Ejemplos de referencia

Sirven como patrón: todo componente nuevo se escribe igual.

### 9.1 `Button` (tipo A)

```html
<button class="ps-button ps-button--primary ps-button--md" type="submit">Guardar</button>
<button class="ps-button ps-button--destructive" aria-busy="true" aria-disabled="true">Anular pago</button>
```

| Aspecto | Especificación |
|---|---|
| Clases | `.ps-button`; variante `--primary\|--secondary\|--ghost\|--destructive`; tamaño `--sm\|--md\|--lg` |
| Estados | `:hover`, `:focus-visible`, `[disabled]`, `[aria-disabled="true"]`, `[aria-busy="true"]` |
| Tokens | Los de la fila `Button` de `components.md` |
| Altura | Usa `--control-height` (alias responsivo); `--sm` usa `--control-height-sm` |
| Carga | Conserva el ancho y la etiqueta; antepone el indicador |
| Teclado | Activable con Enter y Espacio; con `aria-disabled` no hace nada y mantiene el foco |
| Prueba de catálogo | Las 4 variantes × 3 tamaños × {default, hover forzado, foco, disabled, loading} |

### 9.2 `CapacityMeter` (tipo B, lleva una regla de negocio)

```html
<ps-capacity-meter value="18" max="20" label="Cupo"></ps-capacity-meter>
```

| Atributo | Descripción |
|---|---|
| `value` | Matriculados (entero ≥ 0) |
| `max` | Cupo (entero > 0) |
| `label` | Etiqueta visible |
| `show-percent` | Booleano; agrega « · 90 %» |

**Regla (RF M3-02):** se usa aritmética entera, sin decimales flotantes.
- `value × 100 < max × 90` → tono `success`, estado «Con cupo».
- `value × 100 ≥ max × 90` y `value < max` → tono `warning`, estado «Alerta al 90 %».
- `value ≥ max` → tono `error`, estado «Lleno».
- `max` ausente o ≤ 0, o `value` no numérico → no calcula; muestra «—» y `aria-invalid="true"`.

Salida: barra con `role="meter"` (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`), texto `18/20` y el estado como **texto con ícono**, no solo color. La etiqueta del estado sale de `status-catalog.js` (entidad `grupo`).

| Caso | Resultado esperado |
|---|---|
| 0/20 | `success` |
| 17/20 (85 %) | `success` |
| 18/20 (90 %) | `warning` |
| 19/20 | `warning` |
| 20/20 | `error` |
| 21/20 | `error`, barra llena |
| 5/0 | «—», inválido |

### 9.3 `Dialog/ConfirmWithReason` (tipo B)

```html
<ps-dialog id="anular-pago" variant="reason" heading="Anular pago"
           confirm-label="Anular pago" reason-label="Motivo de la anulación">
  <p data-slot="body">Se anulará el pago de $ 85.000 del 21/09/2026.</p>
</ps-dialog>
```

| Aspecto | Especificación |
|---|---|
| API | Atributos `variant` (`confirm\|reason\|form`), `heading`, `confirm-label`, `cancel-label` (por defecto «Cancelar»), `reason-label`, `loading`. Métodos `show()` y `close()` |
| Eventos | `ps-confirm` con `detail: { reason }` (solo en `reason`); `ps-cancel`; `close` nativo |
| Motivo | `Textarea` obligatorio. Se recorta (*trim*). Con motivo vacío, el botón de confirmar permanece con `aria-disabled="true"` |
| Acción por defecto | `destructive` en `reason` |
| Aviso de auditoría | Texto fijo: «Quedará registrado con tu usuario, la fecha y este motivo» (RF M5-11, M4-18) |
| Carga | Con `loading`: confirmar con `aria-busy`, y **no** se puede cerrar con Esc ni con el fondo |
| Error | *Slot* `data-slot="error"` para un `Alert` de tono error |
| Foco | Al abrir va al campo de motivo; al cerrar vuelve al elemento que lo abrió |
| Cierre | Esc emite `ps-cancel`, salvo en `loading` |
| Móvil | *Bottom sheet* (ADR, sección 7.6) |
| Accesibilidad | `<dialog>` con `showModal()`, `aria-labelledby` apunta al encabezado |
| Pruebas de catálogo | Abrir con teclado, motivo vacío, motivo con solo espacios, motivo válido, cargando, error, Esc, 375 px |

---

## 10. Catálogo y verificación

**Catálogo (`catalog/`)**: una página por componente con, en este orden: descripción breve y RF de origen; todas las variantes y tamaños; todos los estados aplicables (los estados `hover` y `focus` se muestran forzados con una clase solo de catálogo, `.ps-demo-hover` y `.ps-demo-focus`, que **no** se usan en componentes); ejemplo realista del dominio («Sofía Ramírez · Categoría Infantil B», `$ 85.000`, `01:23.450`); el marcado copiable; el contrato (atributos, eventos, *slots*).

**Verificación automática (sin dependencias):**
- `check-raw-values.mjs`, `check-tokens-sync.mjs`, `check-contrast.mjs`. Este último calcula los contrastes de los pares texto/superficie de `tokens.md` §9 y falla por debajo de 4.5:1 (texto) o 3:1 (bordes de control e íconos informativos).
- `tests/*.test.mjs` con el runner nativo de Node (`node --test`) para funciones puras: `format.js`, `status-catalog.js` y las reglas de `CapacityMeter`.
- Pruebas obligatorias de `status-catalog.js`: todo estado «Anulado» o «Cancelado» resuelve a `neutral`; todo «Rechazado» a `error`; `Vencido` prevalece sobre `Pendiente` en cartera; ningún estado de `status-and-formats.md` §3 falta.

**Verificación manual (checklist por componente):** teclado, lector de pantalla para los tipo B, y los tres anchos (375, 768, 1280).

**Pruebas de comportamiento automatizadas en navegador:** opcionales; ver decisión pendiente.

---

## 11. Plan por fases

Cada fase termina cuando sus componentes cumplen la definición de terminado (sección 12) y `check-*` pasan.

| Fase | Tareas | Salida de la fase |
|---|---|---|
| **F0 Fundación** | T0-1 Crear estructura (sección 4) · T0-2 Escribir `tokens.css` y documentar los alias responsivos en `tokens.md` · T0-3 `reset`, `base`, `typography`, `layout` · T0-4 Esqueleto del catálogo con navegación y conmutador de ancho · T0-5 Los tres scripts `check-*` · T0-6 `format.js` y `status-catalog.js` con pruebas · T0-7 `sprite.svg` provisional | Catálogo de tokens (color, espaciado, tipografía) visible; `check-tokens-sync` y `check-contrast` en verde |
| **F1 Átomos básicos** | Componentes de la sección 8, fase 1 | Páginas de catálogo de esos componentes |
| **F2 Formularios** | Fase 2 de la sección 8, incluyendo las tres máscaras | Un formulario de ejemplo en el catálogo con `TransactionFields` |
| **F3 Retroalimentación** | Fase 3 | `ConfirmWithReason` completo según 9.3 |
| **F4 Navegación y estructura** | Fase 4 | Una página de ejemplo con `AppShell` en 375 y 1280 |
| **F5 Datos y dominio** | Fase 5 | `DataTable` con los cuatro estados; `CapacityMeter` con los siete casos de 9.2 |
| **F6 Calendario** | Fase 6 | `Calendar` en las tres vistas y agenda móvil |

**Orden de trabajo dentro de una fase:** mini-spec del componente (sección 15) → CSS → JS (si es tipo B) → página de catálogo → checks → revisión en los tres anchos.

---

## 12. Definición de terminado (por componente)

Incluye la definición de la skill (`SKILL.md` §4) y añade lo específico del código:

- [ ] Cumple la fila de `components.md`: variantes, tamaños y estados.
- [ ] Sin valores crudos (`check-raw-values` en verde).
- [ ] Estado por atributos nativos o ARIA, sin clases de estado.
- [ ] Tipo A funciona sin JS.
- [ ] Teclado completo y foco visible.
- [ ] Área tocable ≥ 44 px en móvil.
- [ ] Estado nunca solo por color (ícono + texto).
- [ ] Probado en 375, 768 y 1280; sin desplazamiento horizontal de página.
- [ ] Página de catálogo con todos los estados, ejemplo realista y RF de origen.
- [ ] Mini-spec completada y `CHANGELOG.md` actualizado.

---

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| Parpadeo antes de que se registre un Custom Element | CSS `ps-*:not(:defined)` que reserva espacio y oculta contenido sin estilo; cargar `ps.js` como módulo temprano |
| `DateInput` depende del idioma del navegador si se usa `<input type="date">` | Campo de texto con máscara `DD/MM/AAAA` y validación propia; selector desplegable como mejora opcional |
| `Select` con búsqueda o múltiple es costoso de hacer accesible | Diferir `ps-combobox` si compromete la fase 2; mientras tanto, `<select>` nativo y `FilterBar` con chips |
| `Calendar` es el componente más complejo | Va en la última fase; no bloquea a los demás módulos |
| El código se separa de la skill | `check-tokens-sync`; regla de cambiar primero la skill (sección 3) |
| Los módulos hacen ajustes de estilo por su cuenta | Las sobrescrituras sin capa ganan por diseño (ADR-04); se revisan en las revisiones de PR, y cualquier ajuste repetido se eleva al DS |
| Abrir el catálogo con `file://` falla | Documentarlo en el encabezado del catálogo e indicar el comando de servidor local |

---

## 14. Decisiones pendientes

| # | Decisión | Propuesta por defecto |
|---|---|---|
| 1 | Navegadores a soportar | Últimas 2 versiones de Chrome, Edge, Firefox y Safari |
| 2 | Librería de íconos | Una sola familia de contorno (por ejemplo Lucide); mientras tanto, glifos provisionales |
| 3 | Tipografía: alojar Inter (woff2) o usar solo la pila del sistema | Alojar Inter localmente; si no, la pila del sistema ya definida en `tokens.md` |
| 4 | Capas de apilamiento (`z-index`): la skill no define tokens | Los elementos en capa superior (`<dialog>`, `popover`) no los necesitan. Para `AppShell` (barra y *drawer* fijos) agregar `--z-*` a la skill antes de implementar F4 |
| 5 | Pruebas de comportamiento en navegador | Sin herramientas en v1 (checklist manual). Añadir Playwright solo como dependencia de desarrollo si el equipo lo aprueba |
| 6 | Cómo consumen el DS los módulos | Enlazando `design-system/ps.css` y `ps.js` por ruta relativa. Publicar como paquete queda fuera de v1 |
| 7 | Stack de la aplicación (servidor, rutas, plantillas) | Indiferente para el DS. Si hay plantillas de servidor, se pueden envolver los patrones tipo C como parciales |
| 8 | Nombre del proyecto y prefijo | `ps` provisional; cambiarlo implica renombrar clases y elementos |

---

## 15. Plantilla de mini-spec por componente

Se copia a `design-system/components/{nombre}/SPEC.md` y se completa **antes** de codificar.

```markdown
# {Componente}

- **Fila de origen:** components.md · {nivel}
- **Tipo:** A | B | C
- **RF:** M?-??, …

## Anatomía
Partes y *slots* (`data-slot`).

## API
| Elemento | Nombre | Valores | Por defecto | Descripción |
|---|---|---|---|---|
| Clase / atributo / evento / método | | | | |

## Estados
| Estado | Cómo se expresa (selector) | Tokens |
|---|---|---|

## Responsive
375 · 768 · 1280.

## Accesibilidad
Rol, teclado, foco, etiquetas, anuncios.

## Reglas de dominio
Formatos, umbrales, precedencias (con RF).

## Casos de catálogo
Lista de ejemplos y estados que debe mostrar la página.

## Fuera de alcance
```