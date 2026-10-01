# Guía de uso del Design System (DS)

> Para quién es: los 5 grupos que prototipan los wireframes de los módulos M1 a M6.
> Fuente de verdad del diseño: skill `patinaje-design-system` (`.agents/skills/DesignSystem/`).
> Implementación en código: `design-system/` (spec `docs/specs/design-system.md`).
> Ejemplo visualizable: `docs/example/login.html`.

---

## 1. Contexto: por qué existe el DS

Cinco grupos dibujan seis módulos en paralelo (M1 Usuarios, M2 Patinadores, M3 Grupos,
M4 Competencias, M5 Pagos, M6 Administración). Sin un estándar común pasarían tres cosas:

1. El mismo estado (p. ej. `Vencido`) terminaría con un color distinto en M4, M5 y M6.
2. Cada formulario tendría su propia forma (etiquetas, ayudas, errores distintos).
3. La versión móvil quedaría para el final o no se haría.

El DS evita eso con un **contrato único**: los *tokens* (colores, espaciados, tipografía…)
y el *catálogo de componentes* (botones, campos, tablas…) que **todos los wireframes
deben instanciar, no redibujar**. Regla de oro:

> Si vas a escribir un color, tamaño, espaciado o tipografía que **no** es un token,
> detente: casi seguro ya existe. Si vas a dibujar algo que ya está en el catálogo,
> **instáncialo, no lo redibujes**.

Lo que el DS **no** es: no son las pantallas de tu módulo (esas las dibuja cada equipo),
no define permisos por rol (tu equipo decide qué muestra cada rol) y no tiene marca
(el proyecto aún no tiene nombre: por eso es baja fidelidad, grises + 4 semánticos).

---

## 2. Qué hay en `design-system/` (qué es cada cosa)

```
design-system/
├── tokens.css            ← TODOS los valores visuales. El único archivo con valores literales.
├── ps.css                ← Punto de entrada CSS: @layer + @import de todo. Lo enlazan tus HTML.
├── ps.js                 ← Punto de entrada JS: registra los Custom Elements. Lo importan tus HTML.
├── base/                 ← reset, foco global, alias responsivos, tipografía (.ps-text-*), layout.
├── components/{nombre}/  ← El código real de cada componente: {nombre}.css (+ {nombre}.js si es tipo B) y SPEC.md.
├── js/                   ← Lógica pura compartida: format.js, status-catalog.js, capacity.js, aria-disabled.js.
├── icons/sprite.svg      ← Íconos provisionales (misma familia, mismos nombres).
├── catalog/              ← Vitrina: una página HTML por componente para ver, copiar y validar.
├── scripts/              ← Verificación sin dependencias (check-*.mjs).
└── tests/                ← Pruebas de funciones puras (node --test).
```

Diferencia clave: `components/` es **el código que tu wireframe usa**;
`catalog/` es **la vitrina para verlo y copiar el marcado**. Tu módulo nunca importa
nada de `catalog/`.

---

## 3. Tokens: qué son y cómo se usan

Un token es una variable CSS con nombre por **rol** (`--text-error`), nunca por valor
(nunca `--surface-black`). Hay dos capas:

- **Capa 1 — primitivas** (`--color-*`): la paleta cruda. Solo la consume la capa 2.
  **Nunca la uses en un wireframe.**
- **Capa 2 — uso** (`--text-*`, `--surface-*`, `--border-*`, `--icon-*`,
  `--spacing-*`, `--fontsize-*`, `--radius-*`, `--control-height-*`…):
  **lo único permitido** en componentes y wireframes.

| Familia | Ejemplos | Cuándo usar |
|---|---|---|
| Texto | `--text-headings`, `--text-body`, `--text-muted`, `--text-error` | Todo texto; el más específico al uso |
| Superficie | `--surface-page`, `--surface-primary`, `--surface-action` | Fondos; acción principal = neutro oscuro |
| Borde | `--border-primary`, `--border-strong`, `--border-focus`, `--border-error` | Tarjetas/tablas, inputs, foco, error |
| Ícono | `--icon-primary`, `--icon-muted`, `--icon-success`… | Siempre `currentColor` + token del contexto |
| Espaciado | `--spacing-xs` (8) … `--spacing-lg` (24) | Lo único permitido para separar/rellenar |
| Tipografía | estilos `.ps-text-*` (no variables) | `heading-h1…h5`, `body-md/sm`, `label`, `caption`, `numeric-md/lg` (tabulares) |
| Breakpoints | 640 / 768 / 1280 (literales en `@media`) | Móvil 375 · tablet 768 · escritorio 1280 (obligatorios) |
| Radio/borde/sombra | `--radius-md` (8), `--stroke-sm` (1), `--shadow-raised/overlay` | Las únicas formas y sombras |
| Tamaños | `--control-height-sm/md/lg` (32/40/48) | Móvil usa `lg` (≥ 44 px tocable); escritorio `md` |

Por qué dos capas: cuando exista marca, basta remapear la capa 2 y todo el sistema
cambia sin tocar componentes.

---

## 4. Componentes: niveles, tipos y cómo elegirlos

Tres niveles (detalle en `references/components.md` de la skill):

- **Átomos**: `Button`, `Link`, `Icon`, `TextInput`, `Select`, `Badge`, `StatusBadge`,
  `Avatar`, `TimeDisplay`, `CurrencyDisplay`… Piezas mínimas.
- **Moléculas**: `FormField`, `Card`, `Alert`, `Toast`, `Dialog` (Confirm /
  ConfirmWithReason / Form), `Tabs`, `Pagination`, `FilterBar`, `CapacityMeter`,
  `AuditEntry`… Combinan átomos con un comportamiento.
- **Compuestos de dominio**: `AppShell`, `DataTable`, `PlayerProfileCard`,
  `ValidationChecklist`, `GroupCard`, `Calendar`, `KPICard`, `ExportMenu`…
  Resuelven necesidades del club; no definen tokens nuevos.

Tres **tipos de implementación** (spec §8):

- **Tipo A** = solo CSS sobre HTML nativo. Funciona **sin JS**.
  Ej.: `<button class="ps-button ps-button--primary">Guardar</button>`.
- **Tipo B** = CSS + Custom Element (light DOM, sin Shadow). Para comportamiento
  (máscaras, diálogos, pestañas con teclado…). Ej.: `<ps-status-badge entity="cartera" status="vencido">`.
- **Tipo C** = patrón de marcado documentado (composición, sin código propio).
  Ej.: `TransactionFields` = cuatro `ps-field` en orden fijo.

Cómo elegir (tabla de la skill §2, por **tipo de interacción** del RF en
`REQUIREMENTS.md` §1):

| Tipo del RF | Componentes de partida |
|---|---|
| Formulario | `FormField` + átomos de entrada, `Dialog/Form`, `TransactionFields`, `Alert` |
| Consulta | `DataTable`, `DescriptionList`, `PlayerProfileCard`, `Timeline`, `RankingTable`, `FilterBar` |
| Acción | `Button`, `Dialog/Confirm` o `ConfirmWithReason`, `Select`, `Stepper` |
| Automático | `StatusBadge`, `ValidationChecklist`, `Toast`, `AuditEntry` |
| Reporte | `FilterBar` + `DateInput` de rango, `ExportMenu`, `EmptyState` |
| Panel | `KPICard`, `Alert` |
| Calendario | `Calendar` |

Tres reglas innegociables:

1. **Estado nunca solo con color**: siempre ícono + texto (`StatusBadge` lo hace solo;
   `StatusBadge` **no acepta tono libre**: recibe `entity + status` y resuelve el tono).
2. **Sin borrado físico en el lenguaje**: *Anular* / *Desactivar*, nunca *Eliminar*.
3. **Formatos colombianos**: COP `$ 85.000` (sin decimales), fechas `DD/MM/AAAA`,
   tiempos `MM:SS.mmm`, todo desde `js/format.js`.

---

## 5. El ejemplo: `docs/example/login.html` (RF M1-01)

El RF M1-01 (*Registro y autenticación de usuarios por rol*, actores Patinador,
Acudiente, Profesor, Visitante; tipo **Formulario**) se resuelve así:

| Necesidad del RF | Componente usado | Por qué ese |
|---|---|---|
| Marco de la app para Visitante (sin datos de patinadores) | `AppShell` variante pública (solo barra superior con la marca; la hamburguesa se oculta sola al no haber navegación) | Es el compuesto que da barra + contenido; la nav por rol llega como *slot* |
| Alternar Ingresar / Registrarse | `Tabs` (con teclado) | Dos modos del mismo formulario sin cambiar de página |
| Campos correo, contraseña, rol | `FormField` + `TextInput` / `Select` (etiqueta visible, `*` + «obligatorio» para lector, ayuda solo donde aporta) | Tipo Formulario: siempre `FormField`; `readonly` soportado para roles de consulta |
| Entrar / Crear cuenta | `Button primary lg` a ancho completo | Acción principal en neutro oscuro; `lg` en móvil (área ≥ 44) |
| Recuperar contraseña | `Link` centrado bajo el botón | Acción secundaria sin peso visual |
| Nota de autorización/póliza del menor | Texto de ayuda del campo rol (no un `Alert`) | Es información contextual del campo, no un estado de página |
| Roles del `Select` | Patinador, Acudiente, Profesor, Visitante | Son los actores de M1-01; Administrador/Contador/Fisio **no** tienen alta en M1-01 (punto abierto §7.1) y no se inventan |

Lo que se quitó a propósito: `Breadcrumb` (ruido en un login), `Alert` de error
permanente (una pantalla de ingreso no amanece en error; el estado `error` vive en
el catálogo y aparece solo tras un intento fallido), `Alert` informativo (bajó a
ayuda del campo) y toasts demo. Una pantalla, una tarea.

**Cómo debe verse** (verifícalo en 375, 768 y 1280):

- Columna estrecha centrada (solo esta página define ese centrado; no es del DS),
  encabezado centrado con título `heading-h1` + una línea de contexto.
- *Escritorio (1280)*: la columna respira con `ps-container`; pestañas horizontales,
  campos en columna con `gap --spacing-md`, botón a ancho completo + enlace centrado.
- *Móvil (375)*: la misma columna a ancho completo con el margen de página,
  controles en `--control-height-lg`, pestañas con desplazamiento horizontal,
  **sin scroll horizontal de página**.
- *Contenido realista*: «Sofía Ramírez», `sofia@example.com`, roles en español.
  Nada de *lorem ipsum*.

**Cómo visualizarlo** (desde la raíz del repo; no funciona con `file://`):

```bash
python3 -m http.server 8000
# http://localhost:8000/docs/example/login.html
```

---

## 6. Cómo usar el DS en tu wireframe (paso a paso)

1. Toma **un RF** de tu módulo y su tipo de interacción (`REQUIREMENTS.md` §1).
2. Elige componentes con la tabla de la sección 4. Si dudas entre dos, revisa
   `catalog/` y elige el existente: **instanciar, no redibujar**.
3. Enlaza el DS por ruta relativa (desde `wireframes/grupo-XX/<pagina>/`):
   ```html
   <link rel="stylesheet" href="../../../design-system/ps.css">
   <script type="module" src="../../../design-system/ps.js"></script>
   ```
4. Muestra los estados con `StatusBadge` según `status-and-formats.md`
   (p. ej. cartera `Al día/Pendiente/Vencido`; inscripción `En validación/Aprobada/Rechazada/Anulada`).
5. Entrega **móvil (375) y escritorio (1280)**; verifica en 768. Un wireframe solo
   en escritorio está incompleto.
6. Nomenclatura del repo (`README.MD`): `wireframes/grupo-XX/<pagina>/` con los
   nombres de página acordados (`inicio/`, `login/`…), minúsculas sin tildes ni
   espacios, capturas `login.png` + `login-movil.png` para el PR, `README.md` con
   herramienta y decisiones.

Si falta un token o componente: confirma que no exista con otro nombre; **no lo
inventes en tu wireframe**: repórtalo (RF + problema + boceto) para agregarlo como
pieza oficial; si es urgente usa el más cercano con nota «Temporal, pendiente de
componente oficial».

---

## 7. Verificación mínima de tu wireframe

- [ ] Solo tokens de capa 2 y solo componentes del catálogo.
- [ ] Estados con ícono + texto; `Anulado/Cancelado` en `neutral`, `Rechazado` en `error`.
- [ ] Verbos *Anular/Desactivar* (nunca *Eliminar*); copy en español, estilo oración («Al día»).
- [ ] Toda entrada con etiqueta visible; errores que dicen qué corregir.
- [ ] 375 / 768 / 1280 sin scroll horizontal; tocables ≥ 44 px en móvil.
- [ ] Contenido realista del dominio; RF de origen citados.
