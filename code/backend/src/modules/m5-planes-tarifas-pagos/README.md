# M5 · Planes, Tarifas y Pagos

Módulo del Grupo 04. Por ahora implementa:

| RF | Capacidad |
| --- | --- |
| RF-M5-01 | Creación de plan de servicio |
| RF-M5-02 | Edición de plan de servicio |
| RF-M5-03 | Desactivación de plan de servicio |
| RF-M5-04 | Registro de tarifa de un plan |
| RF-M5-05 | Consulta de planes y tarifas vigentes |
| RF-M5-06 | Asignación de plan a un patinador |
| RF-M5-07 | Cambio de plan de un patinador |
| RF-M5-08 | Generación automática de cobros mensuales |
| RF-M5-09 | Registro manual de pago de un cobro (total o parcial) |
| RF-M5-10 | Registro manual de pago por sesión (plan de día único) |

Además, cada pago emite su comprobante (RF-M5-14) y devuelve el estado de cartera recalculado (RF-M5-12), que se leen de la base (`comprobante`, `v_estado_cartera`).

## Endpoints

Todos exigen una sesión iniciada (ver [Autenticación](#autenticación)). Fechas en `AAAA-MM-DD`, montos en COP.

| Método y ruta | Permiso | Quién |
| --- | --- | --- |
| `GET /m5/planes/oferta` | `M5_PLAN_CONSULTAR` | Administrador, Contador, Acudiente, Patinador |
| `GET /m5/planes?tipo=&estado=&buscar=` | `M5_PLAN_GESTIONAR` | Administrador |
| `GET /m5/planes/:id` | `M5_PLAN_GESTIONAR` | Administrador |
| `POST /m5/planes` | `M5_PLAN_GESTIONAR` | Administrador |
| `PATCH /m5/planes/:id` | `M5_PLAN_GESTIONAR` | Administrador |
| `POST /m5/planes/:id/desactivar` | `M5_PLAN_GESTIONAR` | Administrador |
| `POST /m5/planes/:id/tarifas` | `M5_PLAN_GESTIONAR` | Administrador |
| `GET /m5/patinadores?buscar=&patinadorId=` | `M5_PLAN_CONSULTAR` | Administrador y Contador (todos), Acudiente (los suyos), Patinador mayor (a sí mismo) |
| `POST /m5/asignaciones` | `M5_PLAN_ASIGNAR` | Administrador, acudiente (sus patinadores), patinador mayor (a sí mismo) |
| `POST /m5/asignaciones/cambios` | `M5_PLAN_ASIGNAR` | Igual que la asignación |
| `GET /m5/patinadores/:id/plan` | — | Administrador, Contador, acudiente propio, patinador mayor |
| `POST /m5/cobros/generacion` | `M5_COBRO_GENERAR` | Administrador |
| `GET /m5/patinadores/:id/cobros-pendientes` | — | Administrador, Contador, acudiente propio, patinador mayor |
| `POST /m5/pagos/cobro` | `M5_PAGO_REGISTRAR` | Administrador, Contador |
| `POST /m5/pagos/sesion` | `M5_PAGO_REGISTRAR` | Administrador, Contador |
| `POST /m5/pagos/matricula` | `M5_PAGO_REGISTRAR` | Administrador, Contador |

Además, `GET /sesion` (usuario actual con roles y permisos) y `GET /sesion/usuarios` (usuarios de prueba, solo en desarrollo) sirven a la aplicación mientras M1 no tenga inicio de sesión.

Los permisos de cada rol están en `rol_permiso` (sembrados en `db/schema.sql`). El permiso habilita la acción; el rol define sobre qué patinadores (`validators/acceso-patinador.validator.ts`).

### Cuerpos

```jsonc
// POST /m5/planes   (diaLimitePago: 5, 10, 15 o 20; no aplica a DIA_UNICO)
{ "nombre": "Formación 3 días", "tipo": "TRES_DIAS", "diaLimitePago": 5,
  "descripcion": "3 días por semana" }   // descripcion opcional

// PATCH /m5/planes/:id   (cualquiera de los tres campos; descripcion "" la borra)
{ "nombre": "Formación tres días", "diaLimitePago": 10, "descripcion": "…" }

// POST /m5/planes/:id/desactivar
{ "motivo": "Se reemplaza por el plan 2027" }   // opcional

// POST /m5/planes/:id/tarifas
{ "valor": 195000, "vigenteDesde": "2026-12-01" }

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

- **Plan (Administrador):** devuelve:
  - los datos del plan;
  - `tarifaVigente` y `tarifaProgramada` (`{ valor, vigenteDesde }` o `null`);
  - `patinadores` con el plan hoy y `asignable` (activo y con tarifa);
  - `ultimaModificacion` (`{ por, en }`).

  El detalle y las escrituras agregan `tarifas`, el historial de la más nueva a la más antigua, con `estado` (`PROGRAMADA`, `VIGENTE` o `HISTORICA`) y `vigenteHasta`.
- **Oferta:** `fecha` y `planes`, solo los activos con tarifa vigente, cada uno con su `tarifa`. No incluye datos internos como el número de patinadores.
- **Patinador (buscador):** documento, edad, `esMenor`, `acudientes`, `planActual`, `tieneCambioProgramado`, `matriculaPagada` y `estadoCartera`.
- **Asignación:** `asignacionId`, `plan`, `fechaInicio`, `tarifa`, `primerCobro` (`valor`, `diasCobrados`, `fechaLimite`, `vencidoDesde`) y `siguienteCobro`; ambos son `null` en el plan de día único.
- **Cambio:** `planAnterior`, `planNuevo`, `rigeDesde`, `proximoCobro` (con `vencidoDesde`), `requiereAjusteGrupo` y `aviso`.
- **Pago de cobro:** `comprobante` (`numero` `CP-000123`), `saldoAnterior`, `saldoRestante`, `pagoParcial`, `cobro.estado` y `estadoCartera`.
- **Pago por sesión:** `numeroSesiones`, `valorSesion`, `monto`, `comprobante` y `estadoCartera`.

Errores: `400` datos inválidos, `401` sin usuario, `403` sin permiso o patinador ajeno, `404` no existe, `409` regla de negocio. El `message` está en español, listo para mostrarlo en la interfaz.

## Reglas implementadas

### Planes (RF-M5-01, 02, 03)

- El tipo fija la periodicidad, los días por semana y el gimnasio. El día único se cobra por sesión, sin día límite; los demás son mensuales y exigen día límite.
- El nombre es único sin distinguir mayúsculas.
- Un plan nuevo queda activo, pero no se puede asignar hasta tener tarifa vigente (`asignable: false`).
- Al editar solo cambian el nombre, el día límite y la descripción. El tipo y la periodicidad no cambian (se crea otro plan) y el precio va por tarifa.
- No existe eliminar: un plan solo se desactiva. Sus patinadores lo conservan y sus cobros y pagos no cambian, pero sale de la oferta y no se puede asignar a nadie más.

### Tarifas (RF-M5-04)

- Cada tarifa rige desde una fecha (hoy o futura) hasta el día anterior a la siguiente. No hay tarifas retroactivas: los cobros ya generados conservan la tarifa con que se emitieron.
- No se registran dos tarifas desde la misma fecha, ni tarifas en planes inactivos.
- Crear, editar y desactivar planes, y registrar tarifas, quedan en `auditoria`. La tarifa se audita junto con la que reemplaza.

### Consulta (RF-M5-05)

- El Administrador ve todos los planes, también los inactivos, con filtros por tipo, estado y nombre.
- Contador, Acudiente y Patinador ven la oferta: solo planes activos con tarifa vigente.

### Asignación (RF-M5-06)

- Solo si el patinador no tiene un plan activo ni programado; si lo tiene, se usa el cambio.
- Un menor no se asigna el plan a sí mismo y necesita un acudiente asociado («Asocia un acudiente antes de asignar un plan»).
- El plan debe estar activo y tener una tarifa vigente en la fecha de inicio.
- La fecha de inicio no puede ser anterior al mes actual ni solaparse con el plan anterior.
- **Primer plan:** exige la matrícula y los gastos administrativos pagados (`POST /m5/pagos/matricula`).
- **Plan mensual:** crea la primera mensualidad. Si empieza después del día 1 se prorratea sobre un mes comercial de 30 días, como en el wireframe: el día 15 paga 15/30 (30 − día, mínimo un día). Vence en la fecha de inicio, pero nunca antes del día límite del plan.

### Cambio (RF-M5-07)

- Rige desde el día 1 del mes siguiente. El plan actual se cierra el último día del mes, y el cobro del mes en curso no cambia.
- Solo un cambio programado a la vez.
- Avisa si cambia la frecuencia semanal, porque hay que ajustar el grupo (M3).

### Generación de mensualidades (RF-M5-08)

- Un proceso programado corre a diario a las 00:05, hora de Bogotá. Desde `parametro_sistema.dia_generacion_cobros` (1 por defecto) genera la mensualidad de cada asignación mensual que rige el día 1.
- Usa la tarifa vigente ese día, y la fecha límite es el día límite del plan.
- Es idempotente: el índice `cobro_mensualidad_uk` impide duplicar el mes. Por eso puede correr a diario y recuperar meses en los que el servidor estuvo apagado.
- La respuesta informa las asignaciones omitidas por no tener tarifa vigente.

### Mora (RF-M5-12)

- Un cobro se paga hasta su fecha límite y pasa a «Vencido» después de `parametro_sistema.dias_gracia_mora` días (4 por defecto): con límite el día 5, queda vencido desde el día 10, como dicen los wireframes.
- La vista `v_saldo_cobro` expone `vencido_desde`, y la usan `v_estado_cartera`, los cobros pendientes y las respuestas de asignación y cambio.

### Pagos (RF-M5-09, RF-M5-10)

- **Validaciones:** el monto debe ser mayor que 0 y no superar el saldo; se permiten pagos parciales. La fecha de pago no puede ser posterior a hoy.
- **Concurrencia:** el cobro se bloquea durante la transacción, así que dos pagos simultáneos no pueden superar el saldo.
- **Por sesión:** exige un plan de día único que rija en la fecha del pago. Crea un cobro de sesiones × tarifa que queda pagado de una vez.
- **Matrícula:** son dos cobros (matrícula y gastos administrativos) pagados con un solo pago y un solo comprobante.
- **Inmutabilidad:** los pagos no se editan ni se borran. La anulación (RF-M5-11) queda pendiente.

Las asignaciones y los cambios se registran en `auditoria`.

## Autenticación

Los controladores usan `AutenticacionGuard` (`common/auth/`), que lee la cookie de sesión que crea M1 al ingresar (`POST /m1/acceso/ingreso`, RF-M1-02). El usuario llega con `@UsuarioActual()` y lleva solo el rol con el que ingresó y sus permisos. Los usuarios de `db/datos-demo.sql` ingresan con la contraseña `Velora2026`.

## Supuestos para confirmar

| Tema | Supuesto | Por qué |
| --- | --- | --- |
| Matrícula | Se exige antes del primer plan de cualquier tipo, incluido el de día único. | El wireframe la pide «antes de activar el plan» sin excepciones. |
| Cambio desde o hacia día único | También rige desde el mes siguiente. | Así se mantiene una sola regla para todos los cambios. |
| Día límite | Se acepta 5, 10, 15 o 20, al crear y al editar. | El diálogo de edición del wireframe solo ofrece 5, 10 y 15; se asume un descuido. |
| Reactivar planes | No se implementa. | No está en el RF ni en el wireframe; para volver a ofrecerlo se crea un plan nuevo. |

## Pruebas

```bash
pnpm test        # reglas puras: cálculo de cobros y acceso por rol
pnpm test:e2e    # flujos completos contra PostgreSQL (necesita DB_HOST)
```

Para las e2e, levanta la base con `docker compose -f db/compose.yaml up -d --wait` y ejecútalas con `DB_HOST=localhost pnpm test:e2e`. Sin `DB_HOST` se omiten, para no romper el CI.
