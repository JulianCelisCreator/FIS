# M5 · Planes, Tarifas y Pagos

Módulo del Grupo 04. Por ahora implementa:

| RF | Capacidad |
| --- | --- |
| RF-M5-06 | Asignación de plan a un patinador |
| RF-M5-07 | Cambio de plan de un patinador |
| RF-M5-08 | Generación automática de cobros mensuales |
| RF-M5-09 | Registro manual de pago de un cobro (total o parcial) |
| RF-M5-10 | Registro manual de pago por sesión (plan de día único) |

Además, cada pago emite su comprobante (RF-M5-14) y devuelve el estado de cartera recalculado (RF-M5-12), que se leen de la base (`comprobante`, `v_estado_cartera`).

## Endpoints

Todos exigen la cabecera `x-usuario-id` (ver [Autenticación temporal](#autenticación-temporal)). Fechas en `AAAA-MM-DD`, montos en COP.

| Método y ruta | Permiso | Quién |
| --- | --- | --- |
| `POST /m5/asignaciones` | `M5_PLAN_ASIGNAR` | Administrador, acudiente (sus patinadores), patinador mayor (a sí mismo) |
| `POST /m5/asignaciones/cambios` | `M5_PLAN_ASIGNAR` | Igual que la asignación |
| `GET /m5/patinadores/:id/plan` | — | Administrador, Contador, acudiente propio, patinador mayor |
| `POST /m5/cobros/generacion` | `M5_COBRO_GENERAR` | Administrador |
| `GET /m5/patinadores/:id/cobros-pendientes` | — | Administrador, Contador, acudiente propio, patinador mayor |
| `POST /m5/pagos/cobro` | `M5_PAGO_REGISTRAR` | Administrador, Contador |
| `POST /m5/pagos/sesion` | `M5_PAGO_REGISTRAR` | Administrador, Contador |
| `POST /m5/pagos/matricula` | `M5_PAGO_REGISTRAR` | Administrador, Contador |

Los permisos de cada rol están en `rol_permiso` (sembrados en `db/schema.sql`). El permiso habilita la acción; el rol define sobre qué patinadores (`validators/acceso-patinador.validator.ts`).

### Cuerpos

```jsonc
// POST /m5/asignaciones
{ "patinadorId": 12, "planId": 2, "fechaInicio": "2026-11-15" }

// POST /m5/asignaciones/cambios
{ "patinadorId": 12, "planId": 3, "motivo": "Pasa a competencia" }   // motivo opcional

// POST /m5/cobros/generacion
{ "periodo": "2026-11" }   // opcional; por defecto el mes actual

// POST /m5/pagos/cobro
{ "cobroId": 40, "monto": 200000, "fechaPago": "2026-11-07",
  "medioPago": "TRANSFERENCIA", "referencia": "TRX-2231" }

// POST /m5/pagos/sesion
{ "patinadorId": 15, "numeroSesiones": 4, "fechaPago": "2026-11-07", "medioPago": "EFECTIVO" }

// POST /m5/pagos/matricula
{ "patinadorId": 12, "valorMatricula": 120000, "valorGastosAdministrativos": 45000,
  "fechaPago": "2026-11-07", "medioPago": "EFECTIVO" }
```

`medioPago`: `EFECTIVO`, `TRANSFERENCIA` o `CONSIGNACION`. La `referencia` es obligatoria salvo en efectivo.

### Respuestas principales

- **Asignación:** `asignacionId`, `plan`, `fechaInicio`, `tarifa` y `primerCobro` (`valor`, `diasCobrados`, `fechaLimite`), o `null` en el plan de día único.
- **Cambio:** `planAnterior`, `planNuevo`, `rigeDesde`, `proximoCobro`, `requiereAjusteGrupo` y `aviso`.
- **Pago de cobro:** `comprobante` (`numero` `CP-000123`), `saldoAnterior`, `saldoRestante`, `pagoParcial`, `cobro.estado` y `estadoCartera`.
- **Pago por sesión:** `numeroSesiones`, `valorSesion`, `monto`, `comprobante` y `estadoCartera`.

Errores: `400` datos inválidos, `401` sin usuario, `403` sin permiso o patinador ajeno, `404` no existe, `409` regla de negocio. El `message` está en español, listo para mostrarlo en la interfaz.

## Reglas implementadas

**Asignación (RF-M5-06)**
- Solo si el patinador no tiene un plan activo ni programado; si lo tiene, se usa el cambio.
- Un menor no se asigna el plan a sí mismo y necesita un acudiente asociado («Asocia un acudiente antes de asignar un plan»).
- El plan debe estar activo y tener una tarifa vigente en la fecha de inicio.
- La fecha de inicio no puede ser anterior al mes actual ni solaparse con el plan anterior.
- **Primer plan:** exige la matrícula y los gastos administrativos pagados (`POST /m5/pagos/matricula`).
- **Plan mensual:** crea la primera mensualidad. Si empieza después del día 1 se prorratea sobre un mes de 30 días, incluyendo el día de inicio. Vence en la fecha de inicio, pero nunca antes del día límite del plan.

**Cambio (RF-M5-07)**
- Rige desde el día 1 del mes siguiente. El plan actual se cierra el último día del mes, y el cobro del mes en curso no cambia.
- Solo un cambio programado a la vez.
- Avisa si cambia la frecuencia semanal, porque hay que ajustar el grupo (M3).

**Generación de mensualidades (RF-M5-08)**
- Un proceso programado corre a diario a las 00:05, hora de Bogotá. Desde `parametro_sistema.dia_generacion_cobros` (1 por defecto) genera la mensualidad de cada asignación mensual que rige el día 1.
- Usa la tarifa vigente ese día, y la fecha límite es el día límite del plan.
- Es idempotente: el índice `cobro_mensualidad_uk` impide duplicar el mes. Por eso puede correr a diario y recuperar meses en los que el servidor estuvo apagado.
- La respuesta informa las asignaciones omitidas por no tener tarifa vigente.

**Pagos (RF-M5-09, RF-M5-10)**
- **Validaciones:** el monto debe ser mayor que 0 y no superar el saldo; se permiten pagos parciales. La fecha de pago no puede ser posterior a hoy.
- **Concurrencia:** el cobro se bloquea durante la transacción, así que dos pagos simultáneos no pueden superar el saldo.
- **Por sesión:** exige un plan de día único que rija en la fecha del pago. Crea un cobro de sesiones × tarifa que queda pagado de una vez.
- **Matrícula:** son dos cobros (matrícula y gastos administrativos) pagados con un solo pago y un solo comprobante.
- **Inmutabilidad:** los pagos no se editan ni se borran. La anulación (RF-M5-11) queda pendiente.

Las asignaciones y los cambios se registran en `auditoria`.

## Autenticación temporal

M1 todavía no implementa el inicio de sesión (M1-02). Mientras tanto, `common/auth/autenticacion-temporal.guard.ts` identifica al usuario por la cabecera `x-usuario-id` y carga sus roles y permisos desde la base. **Es solo para desarrollo:** se niega a funcionar con `NODE_ENV=production`. Cuando M1 entregue la autenticación real, se reemplaza ese guard; los controladores ya reciben el usuario con `@UsuarioActual()` y no cambian.

## Supuestos para confirmar

| Tema | Supuesto | Por qué |
| --- | --- | --- |
| Prorrateo | Mes comercial de 30 días, incluyendo el día de inicio (día 15 → 16/30). | El wireframe dice «15/30 días» para el día 15, que equivale a excluir el día de inicio. |
| Mora | El cobro aparece vencido al día siguiente de la fecha límite (vista `v_estado_cartera`). | El wireframe dice «pagar del 1 al 5; vencido desde el día 10». Si se quieren días de gracia, hay que agregarlos a la vista (RF-M5-12). |
| Matrícula | Se exige antes del primer plan de cualquier tipo, incluido el de día único. | El wireframe la pide «antes de activar el plan» sin excepciones. |
| Cambio desde o hacia día único | También rige desde el mes siguiente. | Así se mantiene una sola regla para todos los cambios. |

## Pruebas

```bash
pnpm test        # reglas puras: cálculo de cobros y acceso por rol
pnpm test:e2e    # flujos completos contra PostgreSQL (necesita DB_HOST)
```

Para las e2e, levanta la base con `docker compose -f db/compose.yaml up -d --wait` y ejecútalas con `DB_HOST=localhost pnpm test:e2e`. Sin `DB_HOST` se omiten, para no romper el CI.
