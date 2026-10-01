---
name: patinaje-design-system
description: "Design System de baja fidelidad (wireframes) de la plataforma de gestión para escuela de patinaje de velocidad: define los tokens (color, tipografía, espaciado, breakpoints, radios, elevación, tamaños) y el catálogo de componentes (átomos, moléculas y compuestos de dominio) para que los wireframes de los 6 módulos (M1 a M6), hechos por equipos distintos, sean coherentes. Usar SIEMPRE que se cree, amplíe, revise o documente un token o componente de esta plataforma; cuando un equipo vaya a dibujar un wireframe y necesite saber qué componente, color, espaciado, estado o formato usar (estados de cartera, inscripción, cobro o préstamo; tiempos MM:SS.mmm; moneda COP); y ante cualquier duda de qué componente o token usar, en vez de inventarlo. Aplica aunque el usuario no diga design system. No usar para redactar requisitos, diseñar pantallas o flujos de un módulo, definir permisos ni escribir código de backend."
---

# Design System: plataforma de escuela de patinaje (wireframes)

Cinco grupos dibujan seis módulos (M1 a M6) en paralelo. Sin un estándar común, el mismo estado terminará con colores distintos, los formularios tendrán cada uno su forma y la versión móvil quedará para el final. Esta skill evita eso: es el **contrato único de tokens y componentes** del que dependen todos los wireframes.

Está inspirada en la skill `atlas-design`, de la que hereda tres lecciones: no escribir valores a mano, definir siempre los estados de cada componente y no dejar el responsive para el final.

## Alcance

**Incluye**
- Tokens: color, tipografía, espaciado, breakpoints y grilla, radios, bordes, elevación y tamaños.
- Componentes: átomos, moléculas y compuestos de dominio, con variantes, estados y tokens que usan.
- Convenciones de estado y formato que los componentes muestran (tonos de badge, `MM:SS.mmm`, COP, fechas).

**No incluye**
- Pantallas ni flujos de un módulo (los dibuja cada equipo con estos componentes).
- Reglas de negocio ni permisos por rol. Los componentes no codifican permisos; el equipo decide qué muestra u oculta cada rol en su wireframe.
- Marca, logotipo, ilustración o fotografía. El proyecto no tiene nombre ni identidad definidos.
- Código de la aplicación.

## Regla de oro

> Si vas a escribir un color, tamaño, espaciado, radio o tipografía y **no** es un token de esta skill, detente: casi seguro ya existe. Si vas a dibujar algo que ya está en el catálogo de componentes, **instáncialo, no lo redibujes**.

## Decisiones base (vigentes hasta que se cambien de forma explícita)

1. **Baja fidelidad.** Escala de grises más cuatro colores semánticos (éxito, advertencia, error, información). Nada de color de marca.
2. **Dos capas de tokens.** Capa 1 son las primitivas (`--color-*`). Capa 2 son los tokens de uso (`--text-*`, `--surface-*`, `--border-*`, `--icon-*`). **Los componentes solo referencian la capa 2.** Cuando exista marca, basta con remapear la capa 2.
3. **Acción principal en neutro oscuro** (`--surface-action`); el foco y los enlaces en azul de información.
4. **El estado nunca se comunica solo con color.** Siempre ícono más texto.
5. **Móvil y escritorio son obligatorios.** Todo componente y todo wireframe se entrega en 375 px y 1280 px, y se verifica en 768 px (`--bp-md`). Un wireframe solo en escritorio está incompleto.
6. **Sin borrado físico en el lenguaje de la UI.** Los verbos son *Anular* y *Desactivar*, nunca *Eliminar* (regla de negocio: nada con historial se borra).
7. **Formato colombiano.** Moneda COP sin decimales, fechas `DD/MM/AAAA`, tiempos de competencia `MM:SS.mmm`.
8. **Idioma de la interfaz: español.** Nombres de componentes y tokens en inglés (`Button`, `--text-body`) para que mapeen 1:1 a código y a variables de Figma.

## 1. Tokens

Detalle completo con valores en [`references/tokens.md`](references/tokens.md). Léelo antes de crear o modificar cualquier token.

| Familia | Prefijo | Capa | Ejemplos |
|---|---|---|---|
| Color primitivo | `--color-{familia}-{escala}` | 1 | `--color-neutral-900`, `--color-success-100` |
| Texto | `--text-*` | 2 | `--text-headings`, `--text-body`, `--text-muted`, `--text-error` |
| Superficie | `--surface-*` | 2 | `--surface-page`, `--surface-primary`, `--surface-action`, `--surface-warning` |
| Borde (color) | `--border-*` | 2 | `--border-primary`, `--border-strong`, `--border-focus`, `--border-error` |
| Ícono | `--icon-*` | 2 | `--icon-primary`, `--icon-muted`, `--icon-info` |
| Espaciado | `--spacing-*` | 2 | `--spacing-xs` (8), `--spacing-md` (16), `--spacing-lg` (24) |
| Tipografía | `--type-*`, `--fontsize-*`, `--lineheight-*` | 2 | `--fontsize-md`, `--type-font-weight-semibold` |
| Breakpoints y grilla | `--bp-*`, `--layout-*` | 2 | `--bp-md` (768), `--layout-columns-desktop` (12) |
| Radio | `--radius-*` | 2 | `--radius-md` (8), `--radius-full` |
| Grosor de línea | `--stroke-*` | 2 | `--stroke-sm` (1), `--stroke-md` (2) |
| Elevación | `--shadow-*` | 2 | `--shadow-raised`, `--shadow-overlay` |
| Tamaño | `--control-height-*`, `--icon-size-*` | 2 | `--control-height-md` (40) |

Cuatro reglas para tokens:
- Preferir siempre el token más específico al uso (`--text-error` antes que `--color-error-700`).
- Los nombres se escriben como variable CSS. En Figma se usan los mismos con `/` (`--text-body` es `text/body`).
- Se escribe `weight` bien (`--type-font-weight-*`); el typo `weigth` de Atlas no se hereda.
- Un token se nombra por su **rol**, nunca por su valor (`--surface-action`, no `--surface-black`).

## 2. Componentes

Especificación completa en [`references/components.md`](references/components.md). Los estados y formatos que muestran los componentes están en [`references/status-and-formats.md`](references/status-and-formats.md).

| Nivel | Componentes |
|---|---|
| **Átomos** | `Button`, `IconButton`, `Link`, `Icon`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `DateInput`, `CurrencyInput`, `TimeInput`, `Badge`, `StatusBadge`, `Avatar`, `Tooltip`, `Skeleton`, `TimeDisplay`, `CurrencyDisplay` |
| **Moléculas** | `FormField`, `Card`, `Alert`, `Toast`, `Dialog` (`Confirm`, `ConfirmWithReason`, `Form`), `Tabs`, `Pagination`, `Breadcrumb`, `Menu`, `Stepper`, `EmptyState`, `DescriptionList`, `FilterBar`, `CapacityMeter`, `AuditEntry` |
| **Compuestos de dominio** | `AppShell`, `DataTable`, `RankingTable`, `PlayerProfileCard`, `PlayerContextSwitcher`, `Timeline`, `ValidationChecklist`, `RequestTracker`, `GroupCard`, `Calendar`, `KPICard`, `ExportMenu`, `TransactionFields` |

### De tipo de interacción a componentes

Cada RF tiene un *tipo de interacción* en `REQUIREMENTS.md` (§1). Úsalo como punto de partida:

| Tipo del RF | Componentes de partida |
|---|---|
| Formulario | `FormField` + átomos de entrada, `Dialog/Form`, `TransactionFields`, `Alert` para errores |
| Consulta | `DataTable`, `DescriptionList`, `PlayerProfileCard`, `Timeline`, `RankingTable`, `FilterBar` |
| Acción | `Button`, `Dialog/Confirm` o `ConfirmWithReason`, `Select`, `Stepper` |
| Automático | `StatusBadge`, `ValidationChecklist`, `Toast`, `AuditEntry` (la UI solo muestra resultado o estado) |
| Reporte | `FilterBar` con `DateInput` de rango, `ExportMenu`, `EmptyState` |
| Panel | `KPICard`, `Alert` |
| Calendario | `Calendar` |

## 3. Flujo de trabajo

### A. Generar o ampliar el Design System (quien mantiene el DS)

1. Identifica qué hace falta y **de qué RF sale**. Toda pieza nueva debe trazarse a uno o más RF, o a un patrón recurrente de `REQUIREMENTS.md` §5.2.
2. **Token nuevo:** confirma que ningún token de [`references/tokens.md`](references/tokens.md) lo cubre. Créalo en la capa que corresponda, con nombre por rol, y actualiza la tabla de ese archivo.
3. **Componente nuevo:** confirma que no es una variante de uno existente. Especifícalo en [`references/components.md`](references/components.md) y cumple la definición de terminado (sección 4).
4. **Estados o formatos nuevos:** se agregan primero a [`references/status-and-formats.md`](references/status-and-formats.md). Un estado sin tono asignado no se dibuja.
5. Indica en tu respuesta qué archivos de la skill cambiaron y por qué.

### B. Usar el Design System en un wireframe (equipos de módulo)

1. Toma los RF del módulo y su tipo de interacción; elige componentes con la tabla de la sección 2.
2. Usa solo componentes del catálogo y solo tokens. No recolorees ni cambies espaciados por componente.
3. Muestra los estados con `StatusBadge` según el catálogo de `status-and-formats.md`. Nunca inventes un color para un estado.
4. Entrega cada pantalla en móvil (375) y escritorio (1280). Si el RF no dice nada sobre móvil, dibújalo igual.
5. Usa contenido realista del dominio (nombres, categorías, valores en COP), no *lorem ipsum*.
6. Si falta un componente, sigue la sección 5.

## 4. Definición de terminado de un componente

Un componente no está terminado hasta cumplir todo esto:

1. **Anatomía**: partes y *slots* descritos.
2. **Variantes y tamaños** enumerados.
3. **Estados aplicables** definidos, tomados de esta lista: `default`, `hover`, `focus`, `selected`, `disabled`, `readonly`, `loading`, `error`, `success`. Si uno no aplica, se dice por qué. `readonly` es obligatorio en todo control de entrada, porque hay roles que solo consultan.
4. **Solo tokens de capa 2**, sin valores sueltos.
5. **Responsive**: comportamiento descrito en 375 y 1280 (por ejemplo, `DataTable` pasa a lista de tarjetas en móvil).
6. **Accesibilidad mínima**: contraste de texto ≥ 4.5:1 y de bordes de control ≥ 3:1; foco visible con `--border-focus`; área tocable ≥ 44 px en móvil (usar `--control-height-lg`); estado nunca solo por color; toda entrada con etiqueta visible.
7. **Copy en español** y formatos según `status-and-formats.md`.
8. **Trazabilidad**: RF de origen listados.
9. **Ejemplo realista** del dominio (por ejemplo, «Sofía Ramírez · Categoría Infantil B»).

## 5. Qué hacer si falta un token o un componente

1. Confirma que no existe con otro nombre (revisa las tablas de `references/`).
2. Si de verdad falta, **no lo inventes en tu wireframe**: repórtalo a quien mantiene el DS indicando el RF, el problema y un boceto, para que se agregue como pieza oficial.
3. Si es urgente, usa el token o componente más cercano y deja una nota visible en el frame: «Temporal, pendiente de componente oficial».

## 6. Puntos abiertos que afectan el DS

Vienen de `REQUIREMENTS.md` §7. Hasta que se resuelvan, el DS asume lo indicado:

| Punto abierto | Suposición vigente |
|---|---|
| Nombre del proyecto y marca sin definir | DS sin marca; tipografía y paleta son propuestas |
| Campos obligatorios de la ficha de patinador sin definir (M2-01) | `FormField` soporta obligatorio, pero qué campos lo son lo decide M2 |
| Notificaciones automáticas sin RF propio (M3-04, M4-12) | Se cubren con `Toast` y `Alert`; no hay componente de bandeja de notificaciones |
| Sanciones y carga de póliza sin RF propio (M4-07, M4-10) | `ValidationChecklist` los muestra como resultado; no hay componentes de gestión |
| Roles Administrador, Contador y Fisioterapeuta sin alta definida (M1-01) | `AppShell` recibe la navegación por rol como *slot*; no define qué ve cada rol |
| Herramienta de diseño no indicada | Tokens escritos como variables CSS, equivalentes 1:1 a variables de Figma |
| Librería de íconos no definida | Se propone usar una sola familia de contorno (por ejemplo, Lucide); confirmar |