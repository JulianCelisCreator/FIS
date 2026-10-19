# Grupo 06 · Módulo 6

Wireframes del **Módulo de Administración, Reportes, Finanzas e Inventario**, basados en la sección 4.6 de los requerimientos corregidos y en `RF-M6-01` a `RF-M6-08`.

## Herramienta y ejecución

HTML con el Design System del repositorio (`design-system/ps.css` y `ps.js`). Desde la raíz:

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000/wireframes/grupo-06/`. Los módulos ES requieren servir los archivos por HTTP; no abrir con `file://`.

## Páginas

| Página | Archivo | Rol principal | Requisitos | Estado |
|---|---|---|---|---|
| Panel administrativo | `panel/panel.html` | Administrador, Contador | RF-M6-01 | Borrador navegable |
| Personal y permisos | `personal/personal.html` | Administrador | RF-M6-02, RF-M6-03 | Borrador navegable |
| Reportes | `reportes/reportes.html` | Administrador, Contador | RF-M6-04, RF-M6-05 | Borrador navegable |
| Inventario y proveedores | `inventario/inventario.html` | Administrador | RF-M6-06 | Borrador navegable |
| Venta de uniformes | `ventas/ventas.html` | Administrador | RF-M6-07 | Borrador navegable |
| Préstamos y devoluciones | `prestamos/prestamos.html` | Administrador | RF-M6-08 | Borrador navegable |

La relación requisito-pantalla y los criterios representados están en [TRAZABILIDAD.md](TRAZABILIDAD.md). El plan aprobado de componentes está en [PLAN-COMPONENTES.md](PLAN-COMPONENTES.md).

## Decisiones

- Las páginas se agrupan por tarea y rol; RF-M6-02/03 comparten el flujo de gestión de personal y asignación del rol Contador.
- El Contador ve solo indicadores y reportes financieros. No tiene acceso a inventario, administración de personal ni anulación de pagos.
- M6 registra el contexto de venta y el movimiento de inventario; el registro financiero, comprobante e historial se delegan a M5. No se simula una segunda contabilidad dentro de M6.
- Un reporte se consulta por un tipo a la vez. El reporte de movimientos de inventario queda restringido al Administrador; el Contador ve solo reportes financieros.
- El prototipo contiene datos ficticios realistas y estados del catálogo oficial. Las acciones de guardado, asignación, devolución y exportación son demostrativas; no persisten ni llaman a servicios de M5.
- `assets/grupo-06.css` solo define disposición con tokens de capa 2. No introduce colores, tipografía, bordes, radios ni sombras.
- Los breakpoints literales en `@media` siguen ADR-05: CSS no permite usarlos como variables.

## Revisión pendiente

Antes de convertir el prototipo en especificación de implementación, revisar las decisiones abiertas de [TRAZABILIDAD.md](TRAZABILIDAD.md), especialmente la integración financiera de las ventas de uniformes y la dependencia circular del panel con el inventario.

Las capturas visuales finales deben tomarse en 375, 768 y 1280 px durante la revisión del grupo. La interfaz es un wireframe, no una aplicación conectada a datos reales.