# Grupo 04

## Integrantes

- Julian Celis

## Herramienta usada

HTML con el **Design System del proyecto** (`design-system/ps.css` y `ps.js`), sin estilos propios de componente. Hay que servirlo por HTTP, porque los módulos ES no funcionan con `file://`:

```bash
# desde la raíz del repositorio
python3 -m http.server 8000
# http://localhost:8000/wireframes/grupo-04/
```

## Enlace al archivo original

No aplica (el prototipo es el código de esta carpeta).

## Páginas

Módulo 5: **Planes, Tarifas y Pagos** (sección 4.5 del documento de requerimientos, RF-M5-01 a RF-M5-18).

| Página | Carpeta | Requisitos | Estado |
| ------ | ------- | ---------- | ------ |
| Planes y tarifas (admin) | `planes/` | RF-M5-01 a 05 | Implementado |
| Oferta de planes | `oferta-planes/` | RF-M5-05 | Implementado |
| Asignar / cambiar plan | `asignar-plan/` | RF-M5-06, 07, 08 | Implementado |
| Cartera | `cartera/` | RF-M5-12, 13 | Implementado |
| Registrar pago (cobro y por sesión) | `registrar-pago/` | RF-M5-09, 10, 14 | Implementado |
| Historial de pagos | `historial-pagos/` | RF-M5-11, 15, 16 | Implementado |
| Comprobante de pago | `comprobante/` | RF-M5-14, 15 | Implementado |
| Pagos del acudiente / Mis pagos (patinador) | `mis-pagos/` | RF-M5-15, 17, 18 | Implementado |

Todas las páginas están implementadas en la aplicación (`code/frontend/src/modules/m5-planes-tarifas-pagos/`). La especificación, los criterios de aceptación y la trazabilidad RF → código → prueba están en [`docs/specs/m5-planes-tarifas-pagos.md`](../../docs/specs/m5-planes-tarifas-pagos.md).

## Capturas

Cada carpeta tiene la captura de escritorio (`<pagina>.png`, 1280 px) y la de móvil (`<pagina>-movil.png`, 375 px), de página completa. También se revisó 768 px; ninguna página tiene desplazamiento horizontal.

| Página | Escritorio (1280 px) | Móvil (375 px) |
| ------ | -------------------- | -------------- |
| Planes y tarifas | [planes.png](planes/planes.png) | [planes-movil.png](planes/planes-movil.png) |
| Oferta de planes | [oferta-planes.png](oferta-planes/oferta-planes.png) | [oferta-planes-movil.png](oferta-planes/oferta-planes-movil.png) |
| Asignar / cambiar plan | [asignar-plan.png](asignar-plan/asignar-plan.png) | [asignar-plan-movil.png](asignar-plan/asignar-plan-movil.png) |
| Cartera | [cartera.png](cartera/cartera.png) | [cartera-movil.png](cartera/cartera-movil.png) |
| Registrar pago | [registrar-pago.png](registrar-pago/registrar-pago.png) | [registrar-pago-movil.png](registrar-pago/registrar-pago-movil.png) |
| Historial de pagos | [historial-pagos.png](historial-pagos/historial-pagos.png) | [historial-pagos-movil.png](historial-pagos/historial-pagos-movil.png) |
| Comprobante | [comprobante.png](comprobante/comprobante.png) | [comprobante-movil.png](comprobante/comprobante-movil.png) |
| Pagos del acudiente | [mis-pagos.png](mis-pagos/mis-pagos.png) | [mis-pagos-movil.png](mis-pagos/mis-pagos-movil.png) |
| Mis pagos (patinador) | [mis-pagos-patinador.png](mis-pagos/mis-pagos-patinador.png) | [mis-pagos-patinador-movil.png](mis-pagos/mis-pagos-patinador-movil.png) |

En `assets/` hay dos archivos compartidos:

- `grupo-04.css`: **solo disposición** (rejillas, `gap`, alineación), con tokens de capa 2. No define color, tipografía, bordes ni sombras.
- `grupo-04.js`: conecta componentes del DS (abre `ps-dialog`, sincroniza `ps-tabs` con sus paneles y con el ancla de la URL, abre y cierra menús de fila, cambia de patinador con `ps-player-switcher` y simula la respuesta de `ps-export-menu`).

## Componentes del Design System usados

| Necesidad | Componente |
| --------- | ---------- |
| Marco, navegación por rol y usuario | `AppShell` (`ps-app-shell`, *slots* `brand`, `user`, `nav`, `context`, `content`), `Avatar`, `Badge` neutral para el rol |
| Ruta de la página | `Breadcrumb` |
| Listados (planes, cartera, pagos) | `DataTable` con `data-label` (pasa a tarjetas en móvil), `FilterBar` con chips, `Pagination` |
| Acciones por fila | `IconButton` + `Menu` (planes); `Button` `sm` (historial, porque «Anular» debe verse) |
| Estados | `StatusBadge`: plan, cobro, pago, comprobante y cartera |
| Formularios | `FormField` + `TextInput`, `Select`, `RadioGroup`, `CurrencyInput`, `DateInput`; `TransactionFields` en registrar pago |
| Crear, editar, desactivar plan, registrar tarifa | `Dialog/Form` y `Dialog/Confirm` |
| Anular pago | `Dialog/ConfirmWithReason` (motivo obligatorio y aviso de auditoría) |
| Auditoría visible | `AuditEntry` (tarifas, anulaciones, comprobante) |
| Indicadores de cartera y de mis pagos | `KPICard` en `KPIGrid` |
| Avisos | `Alert` (info, warning, success) |
| Pasos de asignar plan | `Stepper` |
| Patinador a cargo del acudiente | `PlayerContextSwitcher` (reemplaza las pestañas anteriores) |
| Exportar historial y comprobante | `ExportMenu` (PDF y XLSX; solo PDF en el comprobante) |
| Sin datos | `EmptyState` |

## Decisiones de diseño

- **Una sola pantalla de planes para el Administrador**: se crean, editan, desactivan y se les registra tarifa en diálogos, sin salir de la lista. No existe la acción de eliminar, porque un plan con patinadores o pagos solo se puede desactivar (RF-M5-03).
- **El precio no se edita en el plan**: tiene su propio diálogo, «Registrar tarifa», con fecha de vigencia e historial, porque así separa el RF-M5-02 del RF-M5-04.
- **Asignar y cambiar plan comparten pantalla** (dos pestañas). La vista de cambio muestra desde cuándo aplica el nuevo plan y avisa con un `Alert` si hay que ajustar el grupo del patinador (sección 4.3).
- **Registrar pago muestra el saldo restante antes de confirmar**, para que el pago parcial sea visible. Al terminar lleva al comprobante.
- **Los pagos no se editan ni se borran**: en el historial, los anulados siguen en la lista con su estado Anulado y su `AuditEntry`, y no suman al total. El botón «Anular» solo aparece para el Administrador.
- **Estados solo con `StatusBadge`** (ícono más texto), nunca con un color elegido por el equipo.
- **El Acudiente y el Patinador tienen una vista propia, de solo lectura**, con el estado y el saldo arriba. El acudiente cambia de patinador con el selector «Viendo a» de la barra superior.
- **Responsive**: el DS resuelve el móvil. Por debajo de 1024 px la navegación pasa a un menú desplegable, las tablas se vuelven tarjetas y los filtros se abren en un panel. Revisado en 375, 768 y 1280 px.
- La tarjeta «Notas del wireframe» y las líneas `RF-M5-xx` son anotaciones para la revisión; no forman parte de la interfaz.

## Brechas del Design System encontradas

| Brecha | Dónde | Solución temporal |
| ------ | ----- | ----------------- |
| No existe el estado «Vencido» para la entidad **Cobro** (solo Pendiente, Pagado y Anulado) | Cartera (diálogo de cobros), Mis pagos | `StatusBadge` cobro/pendiente más el texto «Vencido», con nota «Temporal, pendiente de componente oficial» |
| No hay estados para la **Tarifa** (vigente o programada) | Historial de tarifas | Se escribe como texto en la columna «Hasta» |
| El ítem de navegación del `AppShell` no tiene estilo para la página actual (estado S) | Todas | La página actual se muestra como texto con `aria-current="page"`, sin enlace |
| `Menu` no se posiciona solo | Planes (acciones por fila) | Posición absoluta en `grupo-04.css` (solo layout) |
| `DateInput` no aplica `min` ni `max` | Registrar pago, tarifa | La restricción se explica en el texto de ayuda |
| Íconos dentro de `Button primary` no cambian a `--icon-on-action` | Encabezados | No se usan íconos en botones primarios |
