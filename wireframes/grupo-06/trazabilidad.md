# Trazabilidad y decisiones pendientes · Módulo 6

## Matriz RF → representación

| RF | Representación | Criterio que debe comprobarse en la revisión |
|---|---|---|
| RF-M6-01 | Panel administrativo | Se muestran seis métricas mínimas. En modo Contador solo quedan métricas financieras. |
| RF-M6-02 | Personal y permisos | Campos laborales requeridos, control de documento/correo duplicados y consulta de activos/inactivos. Desactivar conserva historial. |
| RF-M6-03 | Personal y permisos | Rol Contador habilita pagos manuales, comprobantes e informes financieros; bloquea anulación de pagos e inventario. |
| RF-M6-04 | Reportes | Un tipo seleccionado por vez, fechas inicio/fin, subtotales/totales, detalle y estado vacío con totales cero. Inventario solo para Administrador. |
| RF-M6-05 | Reportes | Exportación PDF/XLSX del reporte financiero mostrado; archivo conserva filtros, fecha/hora, registros y totales. |
| RF-M6-06 | Inventario | Referencia/talla/tipo, costo, precio, cantidad disponible/mínima y proveedor identificado por razón social, NIT/documento y contacto. |
| RF-M6-07 | Ventas | Comprador, referencia/talla, cantidad, valores y medio; no permite vender más unidades que las disponibles. Ingreso se deriva a M5. |
| RF-M6-08 | Préstamos | Responsable, uniforme/talla, fechas y condición; bloquear stock no disponible, permitir devolución, marcar vencido y registrar pérdida/daño justificadamente. |

## Integraciones

- **M1:** M6-02 registra información laboral y referencia la cuenta/rol administrados en RF-M1-05/06. No replica creación de credenciales ni el mecanismo de autorización.
- **M5:** M6-03 habilita los permisos descritos para RF-M5-09/10/15/16, sin permitir RF-M5-11. RF-M6-07 delega el asiento/recibo/historial financiero a M5; M6 mantiene el detalle comercial y el ajuste del inventario.
- **M2:** M6-07/M6-08 consumen patinador y relaciones patinador-acudiente de RF-M2-01/04. Para préstamo a menor, el acudiente es responsable asociado.
- **M6-01 ↔ M6-06:** el texto actual hace depender el panel de inventario y a su vez el registro de inventario del panel. Para implementación, construir el catálogo de inventario antes que el panel; el panel consulta sus existencias y no es prerrequisito para crear referencias.

## Decisiones que requieren confirmación del equipo

1. **Asiento de venta en M5:** M6-07 exige asociar el ingreso y recibo al historial M5, pero RF-M5-09 describe un pago aplicado a un cobro existente y no define un concepto de venta de uniforme. Se requiere confirmar si se extiende M5 para aceptar venta como concepto o si se crea un RF/interfaz de integración específico. El wireframe muestra la transferencia, no inventa persistencia.
2. **Pago confirmado antes de descontar stock:** RF-M6-07 no especifica qué pasa si el registro financiero en M5 falla después de reservar/descontar unidades. Definir confirmación atómica o compensación antes del backend.
3. **Reporte de inventario y exportación:** M6-04 incluye movimientos de inventario; M6-05 habla solo de reportes financieros y el Contador solo puede ver información financiera. Confirmar si Admin exporta también inventario y si Contador queda excluido de esa opción.
4. **Devolución con prenda dañada/perdida:** RF-M6-08 exige registrar estado de recepción o pérdida/daño, pero no especifica si una prenda dañada que se devuelve vuelve al stock disponible. El wireframe no la suma automáticamente y deja el ajuste para el Administrador.
5. **Proveedor y referencias existentes:** RF-M6-06 pide relacionar proveedor y referencia, pero no define proveedor compartido entre varias tallas/referencias ni su desactivación con historial.
6. **Medios de pago/venta:** se muestran efectivo, transferencia y consignación según M5; los métodos definitivos deben ser los aceptados por M5 y no duplicarse en M6.

## Cobertura de roles

| Rol | Acceso representado |
|---|---|
| Administrador | Todas las vistas y acciones del M6. |
| Contador | Panel financiero, reportes financieros y capacidades de M5 autorizadas por M6-03. Sin personal, inventario, ventas administrativas ni préstamos. |
| Profesor, Patinador, Acudiente, Fisioterapeuta, Visitante | Sin páginas administrativas M6. El acudiente aparece únicamente como comprador/responsable de transacciones iniciadas por el Administrador. |

## Límites de esta entrega

Son wireframes navegables con contenido ficticio. Formularios, filtros, cambios de rol, acciones de inventario y exportación simulan el flujo; no guardan datos ni sustituyen pruebas de integración. Para el desarrollo real se requieren servicios, permisos de backend y las decisiones abiertas anteriores.
