# Plan de componentes · Módulo 6

Plan aprobado antes de generar las vistas. Fuente: `RF-M6-01` a `RF-M6-08` en la especificación corregida.

| Pantalla | Requisito / necesidad | Componentes previstos | Roles y límite de visibilidad |
|---|---|---|---|
| Panel administrativo | M6-01 · Métricas consolidadas | `AppShell`, `KPICard`, `Alert`, `StatusBadge` | Administrador ve operación general; Contador ve únicamente indicadores financieros. |
| Personal y permisos | M6-02/03 · Alta, consulta, actualización, desactivación y rol Contador | `AppShell`, `FilterBar`, `DataTable`, `StatusBadge`, `Dialog/Form`, `Dialog/Confirm`, `Checkbox`, `Alert` | Solo Administrador gestiona personal y permisos; cuenta de usuario/rol se vincula con M1. |
| Reportes | M6-04/05 · Un tipo de reporte con rango de fechas y exportación financiera | `AppShell`, `Select`, `DateInput`, `FilterBar`, `DataTable`, `CurrencyDisplay`, `EmptyState`, `ExportMenu` | Administrador: mensualidades, ventas, cartera e inventario. Contador: solo las tres vistas financieras. |
| Inventario | M6-06 · Referencias de uniformes y proveedores | `AppShell`, `FilterBar`, `DataTable`, `StatusBadge`, `Alert`, `Dialog/Form`, `CurrencyInput`, `Select` | Administrador crea, actualiza y desactiva referencias/proveedores. |
| Ventas | M6-07 · Venta, validación de stock y transferencia de ingreso a M5 | `AppShell`, `FormField`, `Select`, `CurrencyInput`, `TransactionFields`, `DataTable`, `Dialog/Confirm`, `Alert` | Solo Administrador confirma; la parte financiera se delega a M5. |
| Préstamos | M6-08 · Entrega, devolución, vencimiento y pérdida/daño | `AppShell`, `FilterBar`, `DataTable`, `StatusBadge`, `DateInput`, `Dialog/Form`, `Dialog/ConfirmWithReason`, `AuditEntry`, `Alert` | Solo Administrador registra movimientos; los préstamos activos no se borran. |

## Convenciones

- No se crea ningún componente ni token nuevo. Se usan los existentes en `.agents/skills/DesignSystem/references/` y `design-system/catalog/`.
- Todos los estados usan `StatusBadge` con entidad y estado del catálogo. El color no se escoge en las páginas.
- Los componentes de entrada llevan etiquetas visibles; moneda COP sin decimales y fecha `DD/MM/AAAA`.
- `DataTable` usa `data-label` para transformarse en lista de tarjetas en móvil.
- `ExportMenu` solo presenta PDF y XLSX, conforme a M6-05.
- Las acciones de guardado y el envío entre M6/M5 se explicitan como demostración, no como integración funcional.
