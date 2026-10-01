# Tokens: especificación

Contrato de valores del Design System de la escuela de patinaje. Los valores son **propuestos** (no hay marca definida) y deben validarse contra los criterios de contraste de la sección 9 cuando se genere el DS.

## Contenido

1. Convenciones
2. Color, capa 1 (primitivas)
3. Color, capa 2 (tokens de uso)
4. Espaciado
5. Tipografía
6. Breakpoints y grilla
7. Radios, grosores y elevación
8. Tamaños de control e íconos
9. Criterios de validación
10. Anti-patrones

---

## 1. Convenciones

- Nombres en `kebab-case`, escritos como variable CSS (`--text-body`). En Figma: `text/body`.
- Prefijo = categoría. Sufijo = escala o rol.
- **Capa 1** se define una sola vez y solo la consume la capa 2.
- **Capa 2** es lo único que puede aparecer en un componente.
- Tokens con nombre por rol, nunca por valor.
- Valores en `px` en la especificación; en código pueden convertirse a `rem`.

---

## 2. Color, capa 1 (primitivas)

### Neutros (`--color-neutral-*`)

| Token | Hex | Notas |
|---|---|---|
| `--color-neutral-0` | `#FFFFFF` | Blanco |
| `--color-neutral-50` | `#F8F9FA` | Fondo de página |
| `--color-neutral-100` | `#F1F3F5` | Superficies sutiles, encabezado de tabla |
| `--color-neutral-200` | `#E5E8EB` | Deshabilitado, *skeleton* |
| `--color-neutral-300` | `#D0D5DB` | Borde por defecto |
| `--color-neutral-400` | `#A8B0BA` | Texto e ícono deshabilitados |
| `--color-neutral-500` | `#7B8491` | Borde de control (≥ 3:1 sobre blanco). **No usar para texto** |
| `--color-neutral-600` | `#5B6470` | Texto secundario |
| `--color-neutral-700` | `#3F4751` | Reservado |
| `--color-neutral-800` | `#272D35` | Texto de cuerpo, hover de acción |
| `--color-neutral-900` | `#14181D` | Encabezados, acción principal |

### Semánticos

Cada familia tiene tres pasos: `100` (fondo), `500` (borde), `700` (texto e ícono).

| Familia | `-100` | `-500` | `-700` | Rol |
|---|---|---|---|---|
| `--color-success-*` | `#DDF3E4` | `#2E9E5B` | `#176B3A` | Confirmación, estado correcto |
| `--color-warning-*` | `#FFF1CC` | `#E0A100` | `#7A5200` | Atención sin bloqueo |
| `--color-error-*` | `#FBE1E0` | `#D64545` | `#9B1C1C` | Error, bloqueo, rechazo |
| `--color-info-*` | `#DCEBFB` | `#2F80ED` | `#1A4FA0` | Información, en curso, foco, enlaces |

---

## 3. Color, capa 2 (tokens de uso)

Son los únicos que se usan en componentes.

### Texto (`--text-*`)

| Token | Primitiva | Cuándo usar |
|---|---|---|
| `--text-headings` | `neutral-900` | Títulos |
| `--text-body` | `neutral-800` | Texto de cuerpo, valores de datos |
| `--text-muted` | `neutral-600` | Etiquetas secundarias, ayudas, metadatos |
| `--text-disabled` | `neutral-400` | Texto de controles deshabilitados (exento de contraste) |
| `--text-on-action` | `neutral-0` | Texto sobre `--surface-action` |
| `--text-link` | `info-700` | Enlaces |
| `--text-success` | `success-700` | Texto de estado correcto |
| `--text-warning` | `warning-700` | Texto de advertencia |
| `--text-error` | `error-700` | Texto de error |
| `--text-info` | `info-700` | Texto informativo |

### Superficie (`--surface-*`)

| Token | Primitiva | Cuándo usar |
|---|---|---|
| `--surface-page` | `neutral-50` | Fondo de pantalla |
| `--surface-primary` | `neutral-0` | Tarjetas, inputs, diálogos |
| `--surface-subtle` | `neutral-100` | Encabezado de tabla, filas alternas, zonas agrupadoras |
| `--surface-action` | `neutral-900` | Botón primario |
| `--surface-action-hover` | `neutral-800` | Hover del botón primario |
| `--surface-selected` | `info-100` | Fila, tarjeta u opción seleccionada |
| `--surface-disabled` | `neutral-200` | Controles deshabilitados |
| `--surface-loading` | `neutral-200` | `Skeleton` |
| `--surface-overlay` | `neutral-900` al 50 % | Fondo tras diálogos |
| `--surface-success` | `success-100` | Fondo de badge o alerta correcta |
| `--surface-warning` | `warning-100` | Ídem, advertencia |
| `--surface-error` | `error-100` | Ídem, error |
| `--surface-info` | `info-100` | Ídem, información |

### Borde (`--border-*`)

| Token | Primitiva | Cuándo usar |
|---|---|---|
| `--border-primary` | `neutral-300` | Tarjetas, divisores, tablas |
| `--border-strong` | `neutral-500` | Bordes de inputs, selects, checkboxes |
| `--border-action` | `neutral-900` | Borde del botón primario |
| `--border-focus` | `info-500` | Anillo de foco de cualquier elemento |
| `--border-success` | `success-500` | Borde de componente en éxito |
| `--border-warning` | `warning-500` | Ídem, advertencia |
| `--border-error` | `error-500` | Ídem, error |
| `--border-info` | `info-500` | Ídem, información |

### Ícono (`--icon-*`)

| Token | Primitiva | Cuándo usar |
|---|---|---|
| `--icon-primary` | `neutral-800` | Íconos de interfaz |
| `--icon-muted` | `neutral-600` | Íconos secundarios |
| `--icon-disabled` | `neutral-400` | Deshabilitados |
| `--icon-on-action` | `neutral-0` | Sobre `--surface-action` |
| `--icon-success` | `success-700` | Estado correcto |
| `--icon-warning` | `warning-700` | Advertencia |
| `--icon-error` | `error-700` | Error |
| `--icon-info` | `info-700` | Información |

### Mapa de tonos

Los cuatro tonos semánticos más `neutral` son los únicos que usan `Badge`, `Alert`, `Toast` y `StatusBadge`.

| Tono | Texto | Superficie | Borde | Ícono |
|---|---|---|---|---|
| `success` | `--text-success` | `--surface-success` | `--border-success` | `--icon-success` |
| `warning` | `--text-warning` | `--surface-warning` | `--border-warning` | `--icon-warning` |
| `error` | `--text-error` | `--surface-error` | `--border-error` | `--icon-error` |
| `info` | `--text-info` | `--surface-info` | `--border-info` | `--icon-info` |
| `neutral` | `--text-muted` | `--surface-subtle` | `--border-primary` | `--icon-muted` |

---

## 4. Espaciado

Escala de base 4 px. Se usan los alias; no hay una escala cruda aparte.

| Token | Valor | Uso típico |
|---|---:|---|
| `--spacing-2xs` | 4 | Entre ícono y texto, separaciones mínimas |
| `--spacing-xs` | 8 | Relleno interno compacto, entre chips |
| `--spacing-sm` | 12 | Relleno interno de controles |
| `--spacing-md` | 16 | Entre campos de un formulario, relleno de tarjeta |
| `--spacing-lg` | 24 | Entre grupos de campos, márgenes de tarjeta |
| `--spacing-xl` | 32 | Entre secciones |
| `--spacing-2xl` | 48 | Separación entre bloques mayores |
| `--spacing-3xl` | 64 | Holgura de página |

---

## 5. Tipografía

**Familia:** `--type-font-family-base` = `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` *(propuesta; ver puntos abiertos en `SKILL.md`)*.

**Pesos:** `--type-font-weight-regular` 400 · `--type-font-weight-medium` 500 · `--type-font-weight-semibold` 600 · `--type-font-weight-bold` 700.

**Escala:**

| Token base | `--fontsize-*` | `--lineheight-*` |
|---|---:|---:|
| `xs` | 12 | 16 |
| `sm` | 14 | 20 |
| `md` | 16 | 24 |
| `lg` | 20 | 28 |
| `xl` | 24 | 32 |
| `2xl` | 32 | 40 |
| `3xl` | 40 | 48 |

**Estilos de texto** (combinan tamaño, interlineado y peso; son los que se aplican):

| Estilo | Tamaño | Peso | Uso |
|---|---|---|---|
| `heading-h1` | `3xl` (móvil: `2xl`) | bold | Título de pantalla |
| `heading-h2` | `2xl` (móvil: `xl`) | semibold | Sección principal |
| `heading-h3` | `xl` (móvil: `lg`) | semibold | Subsección |
| `heading-h4` | `lg` | semibold | Título de tarjeta o diálogo |
| `heading-h5` | `md` | semibold | Título pequeño |
| `body-md` | `md` | regular | Cuerpo por defecto |
| `body-sm` | `sm` | regular | Celdas de tabla, ayudas, texto denso |
| `label` | `sm` | medium | Etiquetas de campo, botones, pestañas |
| `caption` | `xs` | regular | Metadatos, contadores |
| `numeric-md` | `md` | medium | Cifras en tablas, valores COP |
| `numeric-lg` | `xl` | semibold | KPI, tiempos destacados |

Los estilos `numeric-*` **siempre** llevan cifras tabulares (`font-variant-numeric: tabular-nums`) para que tiempos, montos y cupos se alineen en columnas.

---

## 6. Breakpoints y grilla

| Token | Valor | Nota |
|---|---:|---|
| `--bp-sm` | 640 | Móvil grande |
| `--bp-md` | 768 | **Quiebre mínimo obligatorio a validar** |
| `--bp-lg` | 1024 | Escritorio |
| `--bp-xl` | 1280 | Escritorio amplio |

**Frames de referencia:** móvil 375 · tablet 768 · escritorio 1280.

| Rango | Columnas | Margen | Gutter |
|---|---:|---:|---:|
| Menor a `--bp-md` | 4 | 16 | 16 |
| `--bp-md` a menor a `--bp-lg` | 8 | 24 | 16 |
| `--bp-lg` en adelante | 12 | 32 | 24 |

Tokens: `--layout-columns-{mobile|tablet|desktop}`, `--layout-margin-{mobile|tablet|desktop}`, `--layout-gutter-{mobile|tablet|desktop}`, `--layout-max-width` = 1280.

---

## 7. Radios, grosores y elevación

| Token | Valor | Uso |
|---|---:|---|
| `--radius-none` | 0 | Tablas, divisores |
| `--radius-sm` | 4 | Checkbox, tooltip |
| `--radius-md` | 8 | Botones, inputs, tarjetas |
| `--radius-lg` | 16 | Diálogos, *bottom sheets* |
| `--radius-full` | 9999 | Badges, avatares, chips |
| `--stroke-sm` | 1 | Bordes por defecto |
| `--stroke-md` | 2 | Anillo de foco, borde seleccionado |
| `--shadow-raised` | `0 1px 2px rgba(20,24,29,.08)` | Tarjetas elevables |
| `--shadow-overlay` | `0 8px 24px rgba(20,24,29,.16)` | Diálogos, menús, toasts |

El anillo de foco es `--stroke-md` en `--border-focus`, con separación de 2 px respecto al elemento.

---

## 8. Tamaños de control e íconos

| Token | Valor | Uso |
|---|---:|---|
| `--control-height-sm` | 32 | Acciones en celdas de tabla, filtros compactos |
| `--control-height-md` | 40 | Escritorio por defecto |
| `--control-height-lg` | 48 | **Móvil por defecto** (área tocable ≥ 44) |
| `--icon-size-sm` | 16 | Íconos dentro de badges |
| `--icon-size-md` | 20 | Íconos en botones e inputs |
| `--icon-size-lg` | 24 | Íconos de navegación y estados vacíos |

---

## 9. Criterios de validación

Al generar el DS, comprobar y registrar:

- Texto normal (`--text-*` sobre su superficie habitual): contraste ≥ **4.5:1**.
- Bordes de control (`--border-strong` sobre `--surface-primary`) e íconos informativos: ≥ **3:1**.
- `--text-disabled` y `--icon-disabled` quedan exentos, pero el estado deshabilitado se distingue también por forma (sin hover, cursor, etiqueta).
- Cada tono semántico: `-700` sobre `-100` debe cumplir 4.5:1.
- Los bordes `-500` de los tonos son decorativos: el significado lo llevan texto e ícono, nunca el borde solo.

---

## 10. Anti-patrones

- Usar `--color-*` directamente en un componente.
- Usar `--color-neutral-500` como color de texto.
- Crear un tono nuevo (morado, naranja…) para distinguir una categoría o un tipo de evento. Se distingue con ícono, etiqueta o forma.
- Valores de espaciado fuera de la escala (10, 20, 28…).
- Un tamaño de fuente que no sea un estilo de texto definido.
- Una sombra distinta de `--shadow-raised` y `--shadow-overlay`.