# M6 · Administración, Reportes, Finanzas e Inventario

## Estado del Sprint 1

La primera implementación backend cubre `HU-M6-06`, inventario y control de
uniformes. Las tablas, restricciones y vista de stock ya existen en
`code/backend/db/schema.sql`.

## Adelanto del Sprint 2: préstamos de implementos

- `GET /m6/prestamos`
- `GET /m6/prestamos/patinadores`
- `POST /m6/prestamos`
- `PATCH /m6/prestamos/:prestamoId/recibir`

La pantalla del adelanto Sprint 2 usa datos ficticios en memoria del navegador
para poder registrar préstamos, devoluciones y pérdidas sin depender de datos de
la base compartida. Los cambios se reinician al recargar la página.

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
