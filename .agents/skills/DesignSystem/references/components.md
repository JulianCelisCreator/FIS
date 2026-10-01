# Componentes: especificación

Catálogo de componentes de baja fidelidad. Cada pieza se traza a los RF de `REQUIREMENTS.md`. Las reglas para agregar uno nuevo están en `SKILL.md` (sección 4, definición de terminado).

## Contenido

1. Leyenda y reglas generales
2. Átomos
3. Moléculas
4. Compuestos de dominio
5. Lo que el catálogo no cubre todavía

---

## 1. Leyenda y reglas generales

**Estados** (abreviaturas usadas en las tablas): `D` default · `H` hover · `F` focus · `S` selected · `X` disabled · `R` readonly · `L` loading · `E` error · `OK` success.

**Reglas generales**
- Todo componente usa solo tokens de capa 2 (`tokens.md`). Aquí se citan solo los tokens clave.
- Foco: anillo `--stroke-md` en `--border-focus`, separado 2 px, en **todo** elemento interactivo.
- Deshabilitado: `--surface-disabled` + `--text-disabled` / `--icon-disabled`, sin hover.
- Todo control de entrada soporta `R` (solo lectura): sin borde de control, valor en `--text-body`, sin indicador de edición. Se usa en las vistas de consulta y en roles que no editan.
- Móvil (375): controles en `--control-height-lg`. Escritorio (1280): `--control-height-md`.
- Los componentes compuestos no definen tokens propios; se construyen con los de sus partes.

---

## 2. Átomos

| Componente | Variantes / props | Estados | Tokens clave | RF |
|---|---|---|---|---|
| `Button` | `primary`, `secondary`, `ghost`, `destructive`; tamaño `sm/md/lg`; ícono izquierdo o derecho | D H F X L | primary: `--surface-action`, `--text-on-action`, hover `--surface-action-hover`. secondary: `--surface-primary` + `--border-strong`. ghost: sin fondo, hover `--surface-subtle`. destructive: `--border-error` + `--text-error`, hover `--surface-error`. Radio `--radius-md` | Transversal |
| `IconButton` | `secondary`, `ghost`; `sm/md/lg`. Requiere etiqueta accesible y `Tooltip` | D H F X L | Igual que `Button` | Transversal |
| `Link` | En línea, independiente; con ícono opcional | D H F X | `--text-link` | Transversal |
| `Icon` | `sm/md/lg`; se colorea solo con `--icon-*` | D X | `--icon-size-*`, `--icon-*` | Transversal |
| `TextInput` | `text`, `email`, `password`, `search`, `number`, `tel`; prefijo/sufijo (por ejemplo «m» en distancias) | D H F X R E OK | `--surface-primary`, `--border-strong`, `--border-focus`, `--border-error`, `--text-body`, `--text-muted` (placeholder) | M1-01, M2-01, M4-02 |
| `Textarea` | Con contador de caracteres opcional; alto mínimo 3 líneas | D H F X R E | Igual que `TextInput` | M2-14, motivos |
| `Select` | `single`, `searchable`, `multiple`; opciones deshabilitables (por ejemplo, grupo lleno) | D H F S X R E | Igual que `TextInput`; lista con `--shadow-overlay` | M2-08, M3-05, M5-06 |
| `Checkbox` | `unchecked`, `checked`, `indeterminate` | D H F S X R E | `--border-strong`, `--surface-action` al marcar, `--radius-sm` | M2-13, M6-03 |
| `RadioGroup` | Vertical, horizontal | D H F S X R E | Igual que `Checkbox`, forma circular | M3-05 |
| `Switch` | `on/off` con etiqueta visible | D H F S X R | `--surface-action` (on), `--border-strong` (off) | M2-23, M5-03 |
| `DateInput` | `single`, `range`; props `min` y `max`; formato `DD/MM/AAAA`; selector desplegable | D H F X R E | Igual que `TextInput` | M5-09, M5-10, M4-04, M5-13 |
| `CurrencyInput` | Prefijo `$`, separador de miles, sin decimales | D H F X R E | Igual que `TextInput`, estilo `numeric-md` | M5-04, M5-09, M5-10, M6-07 |
| `TimeInput` | Segmentos `MM` : `SS` . `mmm`; valida formato | D H F X R E | Igual que `TextInput`, estilo `numeric-md` | M4-13, M4-18 |
| `Badge` | Tono `success/warning/error/info/neutral`; tamaño `sm/md`; ícono + texto | D | Mapa de tonos de `tokens.md` §3; `--radius-full` | Transversal |
| `StatusBadge` | Recibe **entidad + estado** y resuelve texto, tono e ícono desde `status-and-formats.md`. **No acepta un tono libre** | D | Como `Badge` | M1-02, M3-02, M4-11, M5-12, M6-06, M6-08 y demás |
| `Avatar` | Iniciales o *placeholder* de imagen; `sm/md/lg` (32/40/48) | D | `--surface-subtle`, `--text-muted`, `--radius-full` | M2-02, M4-14 |
| `Tooltip` | Texto corto; en móvil se abre con toque | D | `--surface-action`, `--text-on-action`, `--radius-sm` | Transversal |
| `Skeleton` | Línea, bloque, círculo | L | `--surface-loading` | Transversal |
| `TimeDisplay` | Solo lectura; `md/lg`; `delta` opcional (por ejemplo `−0.320 s`, con ícono y tono `success` si mejora, `error` si empeora); marca `Récord` opcional | D | Estilos `numeric-md/lg`, tabulares | M4-14, M4-16 |
| `CurrencyDisplay` | Solo lectura; `md/lg`; alineado a la derecha en tablas | D | Estilos `numeric-md/lg` | M5-05, M5-13, M5-16, M6-04 |

---

## 3. Moléculas

| Componente | Variantes / props | Estados | Tokens clave | RF |
|---|---|---|---|---|
| `FormField` | Etiqueta, marca de obligatorio (`*`), ayuda, mensaje de error, contador. Disposición vertical (móvil y escritorio) u horizontal (solo escritorio) | Hereda del control | `--text-body` (etiqueta, estilo `label`), `--text-muted` (ayuda), `--text-error` | M2-01, M5-01, transversal |
| `Card` | `default`, `outlined`, `selectable`, `raised`; *slots* encabezado, cuerpo, pie | D H F S X L | `--surface-primary`, `--border-primary`, `--shadow-raised`, `--radius-md`, `--spacing-md` | Transversal |
| `Alert` | Tono `success/warning/error/info`; título opcional; acción opcional; descartable; en línea o banner de página | D | Mapa de tonos | M3-02 (aforo 90 %), M6-06 (stock mínimo), M6-08 (préstamos vencidos), M4-12 |
| `Toast` | Tono `success/warning/error/info/neutral`; autodescartable; acción opcional. Escritorio arriba a la derecha; móvil arriba, ancho completo | D | Mapa de tonos, `--shadow-overlay` | M3-04, M4-12 (notificaciones) |
| `Dialog` | `Confirm`, `ConfirmWithReason`, `Form`; tamaño `sm/md/lg`. Móvil: pantalla completa o *bottom sheet* | D L E | `--surface-primary`, `--radius-lg`, `--shadow-overlay`, `--surface-overlay` | — |
| `Dialog/Confirm` | Título, mensaje, `Cancelar` + acción (`primary` o `destructive`) | D L | Como `Dialog` | M6-03, M5-03 |
| `Dialog/ConfirmWithReason` | Incluye `Textarea` **obligatorio**; el botón de confirmar queda `X` hasta que el motivo tenga contenido; acción `destructive` por defecto; muestra que quedará un `AuditEntry` | D L E | Como `Dialog` + `Textarea` | M5-11, M4-12, M4-18, M6-08 |
| `Dialog/Form` | Contiene `FormField`s; pie con `Cancelar` + `Guardar` | D L E | Como `Dialog` | Transversal |
| `Tabs` | Horizontal; con conteo opcional. Móvil: desplazamiento horizontal | D H F S X | `--border-primary`, `--border-action` (activa), `--text-headings` (activa), `--text-muted` | M2-02 (ficha) |
| `Pagination` | Completa (escritorio); compacta «1 / 12» (móvil); selector de tamaño de página | D H F S X | Como `Button ghost` | M5-16, M4-14 |
| `Breadcrumb` | Escritorio: ruta completa. Móvil: «← Volver» al nivel anterior | D H F | `--text-link`, `--text-muted` | Transversal |
| `Menu` | Ítems con ícono, separador, ítem destructivo, ítem deshabilitado | D H F S X | `--surface-primary`, `--shadow-overlay`, `--radius-md` | Transversal |
| `Stepper` | Horizontal (escritorio), vertical (móvil); paso `completed/current/upcoming/error` | D | `--icon-success`, `--icon-info`, `--icon-error`, `--border-primary` | M1-02, M1-03, M4-06 a M4-11 |
| `EmptyState` | Tipos: `sin-datos`, `sin-resultados` (filtros), `reporte-vacío`, `error-de-carga`; ícono, título, descripción, acción opcional | D | `--text-headings`, `--text-muted`, `--icon-muted` | M6-04 (reporte vacío), tablas y listas |
| `DescriptionList` | Pares etiqueta–valor; 2 columnas en escritorio, 1 en móvil | D R | `--text-muted` (etiqueta), `--text-body` (valor) | M2-02, M2-06, M2-18, M2-20, M2-21 |
| `FilterBar` | Buscador, `Select`, `DateInput` de rango, chips de filtros activos, «Limpiar filtros». Móvil: un botón «Filtros» abre `Dialog/Form` | D L | `--surface-subtle`, `--spacing-md` | M5-13, M5-16, M4-14, M4-15, M6-04 |
| `CapacityMeter` | Barra + «ocupados/total». El tono cambia solo: `success` por debajo del 90 %, `warning` desde el 90 %, `error` al 100 % | success · warning · error | Mapa de tonos | M3-02 |
| `AuditEntry` | Usuario, fecha y hora, motivo. En línea o en lista | D R | `--text-muted`, estilo `caption` | M5-04, M4-18, M5-11 |

---

## 4. Compuestos de dominio

Se construyen con los átomos y moléculas anteriores. No introducen tokens nuevos.

| Componente | Variantes / props | Estados | Comportamiento móvil (375) | RF |
|---|---|---|---|---|
| `AppShell` | Barra superior (marca *placeholder*, `PlayerContextSwitcher`, menú de usuario); navegación lateral; área de contenido con `Breadcrumb`, título y acciones de página. Variante **pública** (Visitante): solo barra superior. La navegación por rol llega como *slot* | Ítem de nav: D H F S | Navegación lateral pasa a menú tipo *drawer* o barra inferior | M1-01, M3-06 (calendario público) |
| `DataTable` | Columnas ordenables; alineación (cifras a la derecha); selección opcional; acciones por fila (`IconButton` + `Menu`); `FilterBar` y `Pagination` integrados | D H S L (filas `Skeleton`) E · vacío con `EmptyState` | Pasa a **lista de tarjetas** con 2 o 3 campos clave y `StatusBadge`; sin desplazamiento horizontal | M2-02, M4-14, M5-13, M5-16, M6-04 |
| `RankingTable` | `DataTable` con posición, patinador (`Avatar` + nombre), `TimeDisplay`, categoría. La fila propia se resalta con `--surface-selected`. «No finalizó» va sin posición y en tono `neutral` | D H S L | Tarjeta por fila con posición grande | M4-14, M4-15 |
| `PlayerProfileCard` | `compact` (listas: `Avatar`, nombre, categoría, nivel, `StatusBadge`) y `full` (ficha con `DescriptionList` y `Tabs`); editable solo para quien tenga permiso (usa `FormField`) | D H (compact) L R | `full` apila secciones; `Tabs` con desplazamiento | M2-02, M2-06, M2-18, M2-20, M2-21 |
| `PlayerContextSwitcher` | Selector de patinador a cargo (`Avatar` + nombre + categoría); indica «Viendo a: …». **Solo se muestra si hay más de uno** | D H F S | `Select` a ancho completo en la barra superior | M5-17, M2-04 |
| `Timeline` | Vertical, más reciente arriba; ítem con fecha, título, detalle e ícono. Variantes: `niveles-categorías`, `marcas` (con `TimeDisplay` y `delta`), `participación` | D L · vacío con `EmptyState` | Igual; fecha sobre el título | M2-10, M2-15, M2-22, M4-16, M4-17 |
| `ValidationChecklist` | Cuatro filas fijas: Póliza, Cartera, Autorización, Sanción. Cada una: `Aprobó` (`success`), `Falló` (`error`, con causal), `En validación` (`info`), `No aplica` (`neutral`, por ejemplo póliza y autorización para mayores de edad). Solo lectura | D R L | Lista vertical | M4-07, M4-08, M4-09, M4-10, M4-11 |
| `RequestTracker` | `Stepper` (Solicitada → En validación → Resultado) + `ValidationChecklist` + `StatusBadge` de la inscripción + causal si se rechazó | D L | `Stepper` vertical | M4-06, M4-11, M1-02 |
| `GroupCard` | Nombre, sede, días y horario, profesor(es), nivel, `CapacityMeter`, `StatusBadge` del grupo. Variantes: `listado`, `seleccionable`, `compacta`. Un grupo **Lleno** no es seleccionable | D H F S X | Una columna; horario en una línea | M3-02, M3-03, M3-05 |
| `Calendar` | Vistas mes, semana, día. Evento: título, hora, sede. **Clase** en `neutral` y **competencia** en `info`, diferenciadas además por ícono y etiqueta. Variante pública. La segmentación por rol la define cada equipo | D hoy S L · día sin eventos | Se convierte en **agenda** (lista por día) | M3-06, M4-04 |
| `KPICard` | Etiqueta, valor (`numeric-lg`), variación opcional, tono opcional para alertas, ícono. Agrupadas en `KPIGrid` (mínimo 6 indicadores) | D L E (no disponible) | Rejilla de 2 columnas | M6-01 |
| `ExportMenu` | `Button secondary` + `Menu` con los formatos que el RF permita: PDF, XLSX, CSV. Durante la generación muestra «Generando…» | D H F X L E (con reintento) | Botón a ancho completo | M4-19, M5-15, M6-05 |
| `TransactionFields` | Base del formulario transaccional, siempre en este orden: monto (`CurrencyInput`), fecha (`DateInput` con `max` = hoy), medio (`Select`), referencia (`TextInput`). Cada módulo puede agregar campos, pero no cambia el orden ni los formatos de estos cuatro | D E OK R | Campos apilados a ancho completo | M5-09, M5-10, M6-07, M6-08 |

---

## 5. Lo que el catálogo no cubre todavía

Quedan fuera por falta de requisito propio (ver `REQUIREMENTS.md` §7). No se dibujan hasta que exista RF:

- Bandeja o historial de notificaciones.
- Gestión de sanciones disciplinarias.
- Carga y validación de la póliza médica por el fisioterapeuta.
- Información general pública para el Visitante (más allá de `AppShell` público y `Calendar` público).
- Gestión de habilitación de observaciones del profesor (M2-23).