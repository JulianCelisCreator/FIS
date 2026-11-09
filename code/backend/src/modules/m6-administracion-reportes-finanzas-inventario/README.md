# M6 · Administración, Reportes, Finanzas e Inventario

## Estado del Sprint 1

La primera implementación backend cubre `HU-M6-06`, inventario y control de
uniformes. Las tablas, restricciones y vista de stock ya existen en
`code/backend/db/schema.sql`.

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
