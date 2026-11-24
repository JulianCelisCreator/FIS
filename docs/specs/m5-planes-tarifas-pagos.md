# Spec: M5 · Planes, Tarifas y Pagos

| Campo | Valor |
|---|---|
| Estado | v1.0 · implementado |
| Fecha | 23/11/2026 |
| Módulo | M5 · Planes, Tarifas y Pagos |
| Grupo | 04 (Julian Celis) |
| Fuente RF | `docs/REQUIREMENTS.md` §4.5 (RF-M5-01 a RF-M5-18) |
| Wireframes | `wireframes/grupo-04/` (capturas 375 y 1280 px en cada carpeta). Son anteriores a la reunión con el cliente: donde dicen «vencido desde el día 10», rige §3 |
| Cliente | Reunión del 19/11/2026 con Jaime Fernando Pérez (cuestionario de planes y pagos). Preguntas abiertas en [`m5-preguntas-pendientes-cliente.md`](m5-preguntas-pendientes-cliente.md) |
| Código | Backend `code/backend/src/modules/m5-planes-tarifas-pagos/` · Frontend `code/frontend/src/modules/m5-planes-tarifas-pagos/` |
| Datos | `code/backend/db/schema.sql` (tablas `plan`, `tarifa`, `asignacion_plan`, `cobro`, `pago`, `pago_cobro`, `comprobante`, `auditoria`; vistas `v_tarifa_vigente`, `v_saldo_cobro`, `v_estado_cartera`) |

## 1. Alcance

M5 administra la oferta de planes de la escuela, su precio en el tiempo, la asignación de un plan a cada patinador, los cobros mensuales y por sesión, el registro y la anulación de pagos con su comprobante, y el estado de cartera que consumen otros módulos.

**Incluye:** los 18 RF de §4.5, el control de acceso por rol de todas sus vistas y la exportación del historial.

**No incluye:** pagos en línea (la escuela registra el pago en la sede), facturación electrónica (el comprobante es un soporte interno), ventas y préstamos de uniformes (M6) ni la inscripción a competencias (M4, que solo lee la cartera).

## 2. Roles y permisos

Los permisos están sembrados en `rol_permiso` (`db/schema.sql`) y se comprueban en cada endpoint con `@RequierePermiso`. El permiso habilita la acción; el validador `acceso-patinador.validator.ts` decide sobre qué patinadores.

| Permiso | Administrador | Contador | Acudiente | Patinador |
|---|---|---|---|---|
| `M5_PLAN_GESTIONAR` (crear, editar, desactivar planes y tarifas) | ✓ | | | |
| `M5_PLAN_CONSULTAR` (planes vigentes) | ✓ | ✓ | ✓ | ✓ |
| `M5_PLAN_ASIGNAR` (asignar y cambiar plan) | ✓ | | sus patinadores | solo mayor de edad, a sí mismo |
| `M5_COBRO_GENERAR` (lanzar o recuperar mensualidades) | ✓ | | | |
| `M5_PAGO_REGISTRAR` | ✓ | ✓ | | |
| `M5_PAGO_ANULAR` | ✓ | | | |
| `M5_CARTERA_CONSULTAR` | ✓ | ✓ | | |
| `M5_PAGO_HISTORIAL` (incluye exportar) | ✓ | ✓ | | |
| `M5_COMPROBANTE_DESCARGAR` | ✓ | ✓ | de sus patinadores | solo mayor, los suyos |
| Estado de cuenta («Mis pagos») | ✓ | ✓ | sus patinadores | solo mayor, el suyo |

Profesor, Fisioterapeuta y Visitante no tienen permisos de M5. El patinador menor de edad no ve sus pagos ni gestiona su plan: lo hace su acudiente.

## 3. Reglas transversales

1. **Sin borrado físico.** Los planes se desactivan, los precios se reemplazan por una tarifa nueva y los pagos se anulan. Nada se elimina. **No hay devoluciones ni cancelaciones a pedido** (cliente, 19/11): las excepciones las decide el gerente fuera del sistema; la anulación corrige errores de registro.
2. **Auditoría.** Tarifas, asignaciones, cambios de plan y anulaciones quedan en `auditoria` con usuario, fecha, valor anterior y nuevo y, cuando aplica, motivo.
3. **Mora.** Las mensualidades se pagan del día 1 al 5 de cada mes (cliente, 19/11). Si conservan saldo pasan a «Vencido» desde `fecha_limite + dias_gracia_mora + 1`, con `dias_gracia_mora = 0`: vencido desde el día 6.
   - **Plan mensual:** el primer mes atrasado se sigue entrenando; desde el segundo se cobra un **recargo por mora** (`recargo_mora_mensual_pct`, provisional 10 % de la mensualidad, una vez por mensualidad, vence el día 5) y, al empezar el tercer mes con la deuda, **se cancela el plan** (termina el último día del mes anterior; la deuda sigue).
   - **Plan diario:** un día de gracia: la clase de ayer se puede pagar hoy con un recargo (`recargo_sesion_pct`, provisional 10 % por sesión). Después ya no se acepta.
4. **Estado de cartera.** «Vencido» si algún cobro con saldo pasó su fecha de mora; si no, «Pendiente» si queda algún saldo; si no, «Al día». Vencido prevalece. Lo calcula la base (`v_estado_cartera`); nadie lo edita.
5. **Prorrateo del primer mes.** Desde el día 1 se cobra el mes completo; si no, `(30 − día) / 30` de la tarifa, mínimo un día, redondeado al peso.
6. **Clase de valoración.** Antes de inscribirse se puede tomar una clase de valoración (`valor_clase_valoracion`, $ 10.000). Se paga una vez y, si la persona se inscribe, se abona a la matrícula (provisional).
7. **Formatos.** Moneda `$ 1.620.000` (COP, sin decimales), fechas `DD/MM/AAAA`, zona horaria `America/Bogota`.

## 4. Requisitos y criterios de aceptación

La columna «Verif.» viene de `REQUIREMENTS.md`: **T** se verifica con prueba automatizada y **D** con demostración. Todos los RF tienen además pruebas automatizadas.

### Planes y tarifas

**RF-M5-01 · Crear plan (Adm, T).**
- El plan tiene nombre único, tipo (`DIA_UNICO`, `TRES_DIAS`, `SEIS_DIAS`, `SEIS_DIAS_GIMNASIO`), descripción opcional y, si es mensual, día límite 5.
- La periodicidad y el gimnasio se derivan del tipo: día único es por sesión; los demás, mensuales.
- Nace activo pero no asignable hasta que tenga una tarifa vigente.

**RF-M5-02 · Editar plan (Adm, T).**
- Se editan nombre, día límite y descripción. Tipo, periodicidad y precio no se editan.
- Se muestra quién hizo la última modificación y cuándo.

**RF-M5-03 · Desactivar plan (Adm, T).**
- El plan pasa a Inactivo con fecha y motivo opcional, sale de la oferta y no admite tarifas nuevas.
- Los patinadores que lo tienen lo conservan. No existe la eliminación.

**RF-M5-04 · Registrar tarifa (Adm, T).**
- Valor mayor que 0 y vigencia desde hoy o una fecha futura. No se aceptan tarifas retroactivas ni dos con la misma fecha.
- La tarifa futura queda «programada» sin cambiar la vigente. El historial muestra programadas, vigente e históricas.
- Cada tarifa queda en la auditoría con la anterior.

**RF-M5-05 · Consultar planes vigentes (Adm, Con, Acu, Pat, D).**
- La oferta solo muestra planes activos con tarifa vigente y sin datos internos (número de patinadores, auditoría).
- El Administrador lista todos y filtra por tipo, estado y nombre.
- «Planes de la escuela» es de solo lectura para Contador, Acudiente y Patinador. El acceso a «Asignar o cambiar plan» solo aparece a quien tiene patinadores a su cargo: no al Contador ni al patinador menor.

### Asignación, cobros, pagos y cartera

**RF-M5-06 · Asignar plan (Adm, Acu, Pat, T).**
- Exige matrícula y gastos administrativos pagados y un plan activo con tarifa.
- La fecha de inicio es del mes en curso o posterior y el patinador no puede tener otro plan vigente.
- El menor necesita acudiente asociado y no se asigna su propio plan. El acudiente solo gestiona a sus patinadores.
- Si el plan es mensual, crea la primera mensualidad prorrateada.

**RF-M5-07 · Cambiar plan (Adm, Acu, Pat, T).**
- El cambio rige desde el día 1 del mes siguiente. Solo puede haber un cambio programado.
- Avisa si hay que ajustar el grupo del patinador. Muestra el plan actual, el programado y el historial.

**RF-M5-08 · Generar mensualidades (Sis, T).**
- Una tarea diaria (00:05, hora de Bogotá) genera la mensualidad del mes para cada asignación mensual vigente, una sola vez por periodo.
- El Administrador puede lanzarla o recuperar un mes pasado, nunca uno futuro.
- Antes de generar el mes en curso aplica la mora del plan mensual (§3): crea los recargos y cancela los planes con tres meses de deuda, que ya no reciben la mensualidad. Ambas cosas quedan en el registro y las cancelaciones, en la auditoría.

**RF-M5-09 · Pagar un cobro (Adm, Con, T).**
- El pago es total o parcial. El monto es mayor que 0 y no supera el saldo.
- La fecha no puede ser futura. Transferencia y consignación exigen referencia.
- Muestra el saldo restante. El cobro queda bloqueado durante la transacción, así que dos pagos simultáneos no superan el saldo.

**RF-M5-10 · Pago por sesión (Adm, Con, T).**
- Exige un plan de día único vigente en la fecha de la clase.
- Se paga el día de la clase o por adelantado. La clase del día anterior se paga con recargo (día de gracia); una más antigua se rechaza.
- Crea un cobro de sesiones × tarifa vigente (más el recargo, si aplica), pagado de una vez.

**Clase de valoración (Adm, Con; reunión del 19/11).**
- Se registra una sola vez, antes de la matrícula, por el valor del parámetro.
- La matrícula descuenta la valoración pagada. Una valoración ya abonada no se anula.

**RF-M5-11 · Anular pago (Adm, T).**
- Solo el Administrador. El motivo es obligatorio (5 a 500 caracteres) y la anulación no se puede deshacer.
- El pago y su comprobante pasan a «Anulado» y se conservan. El monto vuelve al saldo de cada cobro, que regresa a «Pendiente» si le queda saldo.
- Los cobros que nacen con su pago (sesiones, su recargo y la valoración) se anulan con él para no crear deuda.
- La cartera se recalcula y la anulación queda en la auditoría con usuario, motivo y valores.
- Un pago ya anulado no se anula otra vez (409). Los pagos de ventas y préstamos de M6 no se anulan desde M5 (409).

**RF-M5-12 · Estado de cartera (Sis, T).**
- Se calcula según las reglas 3 y 4 de §3, siempre actualizado: los pagos anulados no suman.
- Una revisión diaria (00:10) deja en el registro los conteos por estado.
- **Contrato con M4-08:** M4 lee `v_estado_cartera.estado` y bloquea la inscripción a competencias si es `VENCIDO`.

**RF-M5-13 · Consultar cartera (Adm, Con, D).**
- Resumen de la escuela: cartera pendiente, cobros con saldo, conteo por estado y saldo vencido.
- Una fila por patinador activo con acudiente, plan, estado, saldo, cobros vencidos y vencimiento más antiguo, ordenada Vencido → Pendiente → Al día.
- Filtros combinables: estado, plan, patinador (nombre o documento), acudiente y rango de vencimiento.
- «Ver cobros» muestra el detalle del patinador con acceso a registrar el pago.

**RF-M5-14 · Generar comprobante (Sis, T).**
- Cada pago crea un comprobante con consecutivo único `CP-000001` y una copia de sus datos del momento (`comprobante.datos`).
- El PDF se genera en menos de 5 s.

**RF-M5-15 · Descargar comprobante (Adm, Con, Acu, Pat, D).**
- PDF con número, fecha, patinador, documento, acudiente, plan, periodo o sesiones, medio y referencia, y por cobro su valor, los pagos anteriores, este pago y el saldo restante.
- Si el pago está anulado, lo indica con el motivo. Lleva la nota «No es factura electrónica».
- Se descarga desde el historial, desde «Mis pagos» y al registrar el pago.

**RF-M5-16 · Historial de pagos (Adm, Con, D).**
- Incluye los anulados, que se ven con su motivo pero no suman al total.
- Filtros por texto (patinador, documento, acudiente o número de comprobante), fechas, medio y estado. Muestra hasta 500 pagos, del más reciente al más antiguo.
- Exporta lo filtrado a PDF y a XLSX; el XLSX lleva fechas y montos como valores reales y la fila «Total sin anulados».
- El botón «Anular» solo lo ve el Administrador.

**RF-M5-17 · Pagos de los patinadores a cargo (Acu, D).**
- El selector «Viendo a» aparece solo si hay más de un patinador.
- Muestra estado de cartera, saldo, plan, cobros pendientes, «¿Cómo pagar?» y pagos realizados (últimos 6 meses, año o todo) con su comprobante. Es de solo lectura.

**RF-M5-18 · Pagos propios (Pat, D).**
- La misma vista para el patinador mayor de edad, con «Cambiar mi plan».
- El menor ve un aviso: sus pagos los consulta su acudiente.

**Control de acceso por rol (transversal).**
- El menú muestra solo las pantallas del rol. Una dirección escrita a mano muestra «Sin acceso».
- La API responde 401 sin sesión y 403 sin permiso, y el validador impide ver o gestionar patinadores ajenos.

## 5. Matriz de trazabilidad RF → código → prueba

Rutas relativas a `code/backend/` (B) y `code/frontend/src/` (F). Las pruebas e2e están en `code/backend/test/` y corren contra PostgreSQL con `DB_HOST=localhost pnpm test:e2e`; las unitarias, con `pnpm test`.

| RF | Backend (B) | Frontend (F) | Pruebas |
|---|---|---|---|
| M5-01 | `planes.controller` `POST /m5/planes` · `planes.service.crear` | `planes-tarifas.tsx`, `dialogos-plan.tsx` | e2e `m5-planes-tarifas` › RF-M5-01 (3) |
| M5-02 | `PATCH /m5/planes/:id` · `planes.service.editar` | `dialogos-plan.tsx` | e2e `m5-planes-tarifas` › RF-M5-02 (2) |
| M5-03 | `POST /m5/planes/:id/desactivar` | `dialogos-plan.tsx` | e2e `m5-planes-tarifas` › RF-M5-03 (4) |
| M5-04 | `POST /m5/planes/:id/tarifas` · `utils/historial-tarifas` | `dialogos-plan.tsx` (DialogoTarifa) | e2e › RF-M5-04 (4) · unit `historial-tarifas.spec` (3) |
| M5-05 | `GET /m5/planes/oferta`, `GET /m5/planes` | `oferta-planes.tsx`, `planes-tarifas.tsx` | e2e › RF-M5-05 (3) · D |
| M5-06 | `asignaciones.controller` `POST /m5/asignaciones` · `validators/acceso-patinador` · `utils/calculo-cobros` | `asignar-cambiar-plan.tsx` | e2e `m5-asignacion-cobros-pagos` › RF-M5-06 (10) · unit `acceso-patinador.validator.spec`, `calculo-cobros.spec` |
| M5-07 | `POST /m5/asignaciones/cambios`, `GET /m5/patinadores/:id/plan` | `asignar-cambiar-plan.tsx` | e2e › RF-M5-07 (4) |
| M5-08 | `cobros.service` (`@Cron` 00:05, mora antes de generar) · `cobros.repository.generarRecargosMora`, `cancelarPorMora` · `POST /m5/cobros/generacion` | — (proceso del sistema) | e2e › RF-M5-08 (2), `m5-reglas-cliente` › plan mensual (4) · unit `calculo-cobros.spec` (8) |
| M5-09 | `pagos.controller` `POST /m5/pagos/cobro` · `pagos.service.registrarPagoCobro` | `registrar-pago.tsx`, `campos-transaccion.tsx` | e2e › RF-M5-09 (5) |
| M5-10 | `POST /m5/pagos/sesion` (`fechaClase`, día de gracia) | `registrar-pago.tsx` (PagoSesion) | e2e › RF-M5-10 (2), `m5-reglas-cliente` › plan diario (5) |
| Valoración | `POST /m5/pagos/valoracion`, `GET /m5/pagos/parametros` · abono en `registrarMatricula` | `registrar-pago.tsx` (PagoValoracion, PagoMatricula) | e2e `m5-reglas-cliente` › clase de valoración (6) |
| M5-11 | `PATCH /m5/pagos/:pagoId/anular` · `pagos.service.anularPago` · `dto/anular-pago.dto` | `historial-pagos.tsx` (DialogoAnular) | e2e `m5-anulacion` (11) |
| M5-12 | vistas `v_saldo_cobro`, `v_estado_cartera` · `cobros.service` (`@Cron` 00:10) · parámetros `dias_gracia_mora`, `recargo_*` | insignias de cartera en todas las vistas | e2e › mora, `m5-anulacion` (cartera recalculada), `m5-reglas-cliente` · unit `cobros.service.spec` |
| M5-13 | `consultas.controller` `GET /m5/cartera` · `cartera.service`, `cartera.repository` | `cartera.tsx` | e2e `m5-consultas` › RF-M5-13 (3) · D |
| M5-14 | `pagos.repository.emitirComprobante` (`comprobante.datos`) · `utils/documentos/comprobante-pdf` | resultado de `registrar-pago.tsx` | e2e › registra matrícula con un solo comprobante · unit `documentos.spec` (PDF < 5 s) |
| M5-15 | `GET /m5/pagos/:pagoId/comprobante.pdf` | enlaces en `historial-pagos.tsx`, `mis-pagos.tsx`, `registrar-pago.tsx` | e2e `m5-consultas` › RF-M5-15 (3) · D |
| M5-16 | `GET /m5/pagos`, `GET /m5/pagos/exportar` · `utils/documentos/historial` | `historial-pagos.tsx` | e2e `m5-consultas` › RF-M5-16 (4) · unit `documentos.spec` (3) · D |
| M5-17 | `GET /m5/patinadores/:id/estado-cuenta` · `consultas-pagos.service.estadoCuenta` | `mis-pagos.tsx` (selector «Viendo a») | e2e › RF-M5-17/18 (2) · D |
| M5-18 | igual que M5-17 | `mis-pagos.tsx` | e2e › RF-M5-17/18 (2) · D |
| Acceso | `AutenticacionGuard`, `PermisosGuard`, `enums/permiso-m5` · `validators/acceso-patinador` | `app/aplicacion.tsx` (menú por permiso y rol) | e2e `m5-consultas` › control de acceso por rol (3), `m5-anulacion` › acceso · unit `acceso-patinador.validator.spec` (7) |

**Totales (23/11/2026):** 91 pruebas e2e de M5 en 5 archivos y 26 pruebas unitarias de M5 en 5 archivos, todas en verde. Revisión responsive de todas las pantallas a 375, 768 y 1280 px, sin desplazamiento horizontal.

## 6. Supuestos

| Tema | Supuesto | Por qué |
|---|---|---|
| Matrícula | Se exige antes del primer plan de cualquier tipo, incluido día único. | El wireframe la pide «antes de activar el plan» sin excepciones. |
| Cambio desde o hacia día único | También rige desde el mes siguiente. | Una sola regla para todos los cambios. |
| Valores de recargos y valoración | 10 % mensual, 10 % por sesión, valoración de $ 10.000 abonada a la matrícula. | El cliente los dejó «a consideración del grupo»; son parámetros editables (ver preguntas pendientes). |
| Momento de la cancelación por mora | El día 1 del tercer mes con la deuda. | «Si no paga al tercer mes, se cancela»; pendiente de confirmar. |
| Reactivar planes | No se implementa. | No está en el RF ni en el wireframe; se crea un plan nuevo. |
| Anulación de pago por sesión | Anula también su cobro de sesiones. | Ese cobro nace con el pago; dejarlo pendiente crearía una deuda que nadie generó. |
| Anulación de pagos de M6 | No se hace desde M5. | Las ventas y los préstamos tienen sus propias devoluciones en M6. |
| «Última revisión» de la cartera | No se muestra; el estado se calcula al consultar. | La revisión diaria solo deja registro; el estado nunca está desactualizado. |

## 7. Pendientes fuera del código

- Respuestas pendientes del cliente: [`m5-preguntas-pendientes-cliente.md`](m5-preguntas-pendientes-cliente.md) (penalidades, valoración, cancelación, retiro del patinador).
- Revisión de los wireframes con el docente y ajuste de sus observaciones.
- Release de `develop` a `main` cuando el equipo lo acuerde.
- Preparación y ensayo de la presentación.
