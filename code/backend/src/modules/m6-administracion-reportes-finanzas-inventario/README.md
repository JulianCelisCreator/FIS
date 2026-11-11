# M6 · Administración, Reportes, Finanzas e Inventario

## Estado del Sprint 1

La primera implementación backend cubre `HU-M6-06`, inventario y control de
uniformes. Las tablas, restricciones y vista de stock ya existen en
`code/backend/db/schema.sql`.

## Préstamo de implementos (HU-6.8 / RF-M6-08)

- `GET /m6/prestamos`: préstamos con patinador, responsable, cobro, saldo y
  `estadoActual` (`VENCIDO` = activo con fecha prevista pasada, de `v_prestamo_uniforme`).
  Los vencidos salen primero.
- `GET /m6/prestamos/patinadores`: patinadores activos con sus posibles responsables
  (su propia cuenta y sus acudientes vinculados activos).
- `POST /m6/prestamos`: `{ uniformeId, patinadorId, responsableId, cantidad,
  fechaDevolucionPrevista, estadoEntrega, valorPorUnidad? }`.
- `PATCH /m6/prestamos/:id/recibir`: `{ estado: 'DEVUELTO' | 'PERDIDA_DANO', estadoRecepcion?, observacion? }`.

Reglas:

- Solo se prestan implementos (`tipo = IMPLEMENTO`); las prendas se venden (decisión del grupo por higiene).
- **Cobro (decisión del grupo, 11/11/2026):** tarifa por unidad y día × cantidad × días
  (de hoy a la devolución prevista, mínimo 1). La tarifa sugerida está en
  `uniforme.tarifa_prestamo_dia` y se puede ajustar en cada préstamo (`valorPorUnidad`).
  Se crea un cobro `PENDIENTE` en M5 con concepto `PRESTAMO_IMPLEMENTO` y fecha límite en la
  devolución prevista; se paga desde «Registrar pago». Con valor 0 no se crea cobro.
- Préstamo, cobro, descuento de stock, Kardex `PRESTAMO` y auditoría van en una transacción.
- Devolución: las unidades regresan al stock (Kardex `DEVOLUCION`). Pérdida o daño exige
  observación y no devuelve unidades.
- Requiere la migración `db/migraciones/2026-11-11-m6-prestamo-con-cobro.sql` en bases ya creadas.

## Personal (HU-6.2 / RF-M6-02)

Permiso `M6_PERSONAL_GESTIONAR` (solo Administrador).

- `GET /m6/personal?buscar=&estado=&cargo=&pagina=&tamano=`: listado paginado en el
  servidor; `buscar` filtra por documento o nombre. Responde `{ datos, total, pagina, tamano }`.
- `GET /m6/personal/cuentas-disponibles?buscar=`: cuentas de M1 no desactivadas y sin
  ficha laboral, para vincularlas.
- `GET /m6/personal/:id`, `POST /m6/personal`, `PATCH /m6/personal/:id`.
- `POST /m6/personal/:id/desactivar` (`{ motivo? }`) y `POST /m6/personal/:id/reactivar`.

Reglas:

- Obligatorios: tipo y número de documento, nombres, apellidos, correo, teléfono y cargo.
- Documento (por tipo) y correo únicos; la base lo garantiza y la API responde 409 con el
  campo duplicado.
- M6 **no crea cuentas**: `usuarioId` vincula, de forma opcional, una cuenta que ya existe
  en M1 (no desactivada y sin otra ficha). `null` la desvincula.
- Desactivar no borra nada: pasa a `INACTIVO` con `fecha_retiro`. Todo queda en auditoría.

## Rol Contador (HU-6.3 / RF-M6-03)

- `POST /m6/personal/:id/rol-contador`: asigna el rol a la cuenta vinculada. Exige personal
  `ACTIVO` con cuenta de M1 no desactivada (se acepta `POR_REGISTRAR`, cambio #3).
- `POST /m6/personal/:id/rol-contador/retirar`: retira solo ese rol.
- Desactivar a una persona le retira el rol Contador (personal inactivo sin permisos financieros).
- Permisos del rol (semilla de `schema.sql`): `M6_REPORTE_FINANCIERO`, `M5_PAGO_REGISTRAR`,
  `M5_CARTERA_CONSULTAR`, `M5_PAGO_HISTORIAL`, `M5_PLAN_CONSULTAR`, `M5_COMPROBANTE_DESCARGAR`.
  Sin `M5_PAGO_ANULAR`, `M6_INVENTARIO_GESTIONAR` ni `M6_PERSONAL_GESTIONAR`.
- Cada ruta del M6 declara su permiso y el servidor lo valida en cada petición (403). Lo
  comprueban `permisos-m6.spec.ts` y `reglas-contador.spec.ts`.

## Sprint 2: venta de uniformes (HU-6.7 / RF-M6-07)

- `GET /m6/ventas?buscar=`: ventas registradas con sus líneas y comprobante.
- `GET /m6/ventas/compradores`: patinadores activos con sus acudientes vinculados.
- `GET /m6/ventas/:ventaId`: detalle y comprobante de una venta.
- `POST /m6/ventas`: registra la venta. Cuerpo:
  `{ patinadorId, compradorTipo: 'PATINADOR' | 'ACUDIENTE', acudienteId?, medioPago, referenciaPago?, items: [{ uniformeId, cantidad }] }`.

Reglas:

- El valor unitario es el `precio_venta` vigente de la referencia; el cliente no lo envía.
- Solo se venden referencias activas, con precio y de tipo prenda (no `IMPLEMENTO`).
- Si la cantidad pedida (sumando líneas repetidas) supera las existencias, la venta
  se rechaza con el detalle de lo pedido y lo disponible.
- Todo ocurre en **una sola transacción**: bloqueo de las referencias (`FOR UPDATE`),
  cobro y pago `VENTA_UNIFORME` en M5, comprobante `CP-xxxxxx`, venta y detalle,
  descuento del stock, movimiento `VENTA` en el Kardex y auditoría. Si algo falla,
  no queda nada registrado.
- La venta confirmada es inmutable: no hay `PATCH` ni `DELETE` y la base rechaza
  `UPDATE`/`DELETE` sobre `venta_uniforme` y `venta_detalle` con un trigger. Las
  correcciones se registran como ajuste autorizado de stock (`PATCH /m6/uniformes/:id/stock`)
  o, cuando se implemente, como devolución.
- **Devolución (decisión del grupo, 11/11/2026: solo Administrador, total o parcial):**
  `POST /m6/ventas/:id/devoluciones` con `{ motivo, medioReembolso, items: [{ uniformeId, cantidad }] }`.
  No se puede devolver más de lo pendiente por línea. La venta no cambia: la devolución
  queda en `devolucion_venta` (inmutable), las unidades regresan al stock (Kardex `DEVOLUCION`)
  y, si **una sola** devolución cubre toda la venta, se anulan el pago, el comprobante y el
  cobro en M5. Si es parcial, el reembolso queda en `devolucion_venta.valor_devuelto` y los
  reportes (HU-6.4) deben restarlo de los ingresos. La venta muestra `estado`
  (`CONFIRMADA`, `DEVUELTA_PARCIAL`, `DEVUELTA`), `valorDevuelto`, lo devuelto por línea y sus
  devoluciones. Requiere la migración `db/migraciones/2026-11-11-m6-devolucion-de-venta.sql`.
- La escritura en tablas de M5 está aislada en `RegistroFinancieroVentaRepository`:
  cuando M5 publique su servicio de pagos, solo se reemplaza esa clase.

## Endpoint

- `GET /m6/uniformes`
- `GET /m6/uniformes/:uniformeId`
- `POST /m6/uniformes`
- `PATCH /m6/uniformes/:uniformeId/stock`
- `POST /m6/uniformes/:uniformeId/desactivar`
- `PATCH /m6/uniformes/:uniformeId`
- `POST /m6/uniformes/:uniformeId/reactivar`
- `GET /m6/proveedores`
- `POST /m6/proveedores`
- `PATCH /m6/proveedores/:proveedorId/estado`

Todas las solicitudes usan temporalmente la cabecera `x-usuario-id` y el permiso
`M6_INVENTARIO_GESTIONAR`.

## Reglas implementadas

- No hay borrado físico.
- La cantidad disponible nunca puede quedar negativa.
- Crear una referencia genera stock inicial y movimiento de entrada.
- Ajustar stock genera movimiento `AJUSTE`.
- Desactivar conserva el registro, su stock y su historial de movimientos sin
  agregar una baja de inventario con cantidad cero.
- Las referencias y combinaciones duplicadas son rechazadas.
- Las operaciones sensibles se registran en la tabla `auditoria`.
