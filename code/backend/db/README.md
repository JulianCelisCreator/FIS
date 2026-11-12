# Base de datos

DDL de la base de datos de la plataforma (PostgreSQL 17), común a todos los módulos. Cubre los 77 RF de [`docs/REQUIREMENTS.md`](../../../docs/REQUIREMENTS.md); los campos salen de los wireframes de cada grupo.

| Archivo | Contenido |
| --- | --- |
| `schema.sql` | Todo el DDL: tablas, restricciones, índices, vistas, comentarios y catálogos semilla. |
| `compose.yaml` | Contenedor de PostgreSQL que carga `schema.sql` al crearse. |
| `datos-demo.sql` | Datos de demostración de M5 con los nombres de los wireframes (opcional, se cargan a mano). |

## Levantar la base

Requisito: Docker. Desde `code/backend`:

```bash
docker compose -f db/compose.yaml up -d --wait
```

| Parámetro | Valor por defecto | Variable para cambiarlo |
| --- | --- | --- |
| Host y puerto | `localhost:5432` | `DB_PORT` |
| Base de datos | `patinaje` | `DB_NAME` |
| Usuario | `patinaje` | `DB_USER` |
| Contraseña | `patinaje_dev` | `DB_PASSWORD` |

Las credenciales son solo para desarrollo local. Para cambiarlas, defínelas en `code/backend/.env` (copia de `.env.example`; git la ignora) y levanta el contenedor con `docker compose --env-file .env -f db/compose.yaml up -d`: así la API y el contenedor usan los mismos valores.

```bash
psql -h localhost -U patinaje -d patinaje   # conectarse
\dt+                                        # tablas con su comentario [Mx]
docker compose -f db/compose.yaml down      # detener (conserva los datos)
docker compose -f db/compose.yaml down -v   # borrar los datos y recrear desde cero
```

Para cargar los datos de demostración sobre una base recién creada:

```bash
docker exec -i patinaje-db psql -U patinaje -d patinaje < db/datos-demo.sql
```

Los usuarios de demostración ingresan en `/app/` con su correo y la contraseña `Velora2026`. Si cargaste los datos antes de que existiera el inicio de sesión (contraseña `demo`), actualízalos sin recrear la base copiando el hash de `clave_demo` de `datos-demo.sql`:

```sql
UPDATE usuario SET contrasena_hash = '<hash de clave_demo>' WHERE contrasena_hash = 'demo';
```

PostgreSQL ejecuta `schema.sql` **solo cuando el volumen está vacío**. Si el archivo cambia, hay que recrear la base con `down -v` y volver a levantarla.

## Convenciones

- Nombres en español, `snake_case`, sin tildes ni `ñ`, tablas en singular. Llave primaria `id` y foráneas `<tabla>_id`.
- Estados en `TEXT` con `CHECK` y valores en mayúsculas (`PENDIENTE`, `AL_DIA`). La interfaz los muestra con el texto del catálogo de estados.
- Moneda en COP con `NUMERIC(14,2)`. Tiempos de competencia en milisegundos (`tiempo_ms`); la interfaz los formatea como `MM:SS.mmm`.
- **Sin borrado físico.** Se usan estados (`DESACTIVADA`, `ANULADO`), `activo` o fechas de cierre (`hasta`, `fecha_fin`). Las historias (nivel, categoría, grupo, plan) guardan una fila por periodo; la fila con fin `NULL` es la actual.
- Todo lo derivado es una **vista** y no una columna: así no se desincroniza.
- Cada tabla tiene un `COMMENT` que empieza por su módulo (`[M5]`) y cita los RF que cubre.
- `actualizado_en` se actualiza solo, con un trigger.

## Tablas por módulo

| Módulo | Tablas | Vistas |
| --- | --- | --- |
| Transversal | `parametro_sistema`, `auditoria`, `notificacion` | |
| M1 · Usuarios y Acceso | `rol`, `permiso`, `rol_permiso`, `usuario`, `usuario_rol`, `token_usuario`, `sesion`, `acudiente_patinador`¹, `autorizacion_acudiente`, `poliza` | `v_perfil_patinador` |
| M2 · Gestión deportiva | `nivel`, `categoria`, `patinador`, `patinador_nivel`, `patinador_categoria`, `evaluacion_nivel`, `habilidad`, `patinador_habilidad`, `observacion_desempeno`, `propuesta_cambio_categoria` | |
| M3 · Grupos y horarios | `sede`, `grupo`, `grupo_profesor`, `horario`, `patinador_grupo`, `evento_calendario` | `v_ocupacion_grupo` |
| M4 · Competencias | `competencia`, `prueba`, `prueba_categoria`, `preseleccion`, `sancion`, `inscripcion`, `inscripcion_validacion`, `resultado`, `correccion_resultado` | `v_record_personal` |
| M5 · Planes y pagos | `plan`, `tarifa`, `asignacion_plan`, `cobro`, `pago`, `pago_cobro`, `comprobante` | `v_tarifa_vigente`, `v_saldo_cobro`, `v_estado_cartera` |
| M6 · Administración | `personal`, `proveedor`, `uniforme`, `venta_uniforme`, `venta_detalle`, `prestamo_uniforme`, `movimiento_inventario` | `v_stock_uniforme`, `v_prestamo_uniforme` |

¹ M1-11 y M2-04 describen la misma relación; hay una sola tabla.

### Relaciones entre módulos

- `usuario` (M1) es la cuenta de todos los actores. `patinador` (M2) es la ficha deportiva y puede tener cuenta propia (`usuario_id`). El acudiente es un `usuario` con rol `ACUDIENTE` vinculado en `acudiente_patinador`.
- M4 valida las inscripciones con vistas de otros módulos: póliza y autorización con `v_perfil_patinador` (M1) y cartera con `v_estado_cartera` (M5). El resultado de cada validación queda en `inscripcion_validacion`.
- M6 registra el detalle de la venta de uniformes; el dinero entra a M5 como un `cobro` con concepto `VENTA_UNIFORME`, que se paga y genera comprobante igual que cualquier otro.
- `personal` (M6) guarda los datos laborales; las credenciales y los roles siguen en `usuario` y `usuario_rol` (M1).

## Reglas que garantiza la base

Las cumple la base aunque el backend se equivoque:

- Correo de usuario único sin distinguir mayúsculas; documento único por tipo.
- Un solo nivel, categoría, grupo y plan activo por patinador.
- No se genera dos veces la mensualidad del mismo mes para la misma asignación, así que el proceso del día 1 se puede reintentar.
- Un pago no puede tener fecha posterior a su registro. Exige referencia si no es en efectivo. Para anularlo exige usuario, fecha y motivo.
- El plan de día único se cobra por sesión; los demás son mensuales con día límite de pago.
- Las inscripciones cierran antes de la competencia, y una prueba no se repite en la misma competencia.
- Los tiempos son positivos, o la prueba se marca «No finalizó».
- El stock de uniformes nunca queda negativo.

Lo que depende de varias filas o del rol (aforo lleno, que un menor no se asigne un plan solo, que el Contador no anule pagos) lo valida el backend. Los permisos por rol están en `rol_permiso`.

## Supuestos para confirmar con cada grupo

| Grupo | Supuesto |
| --- | --- |
| M1 | La autenticación usa refresh tokens guardados en `sesion`. La revisión de la póliza por el Fisioterapeuta queda opcional en `poliza.estado_revision` porque no tiene RF. |
| M2 | Valores de `evaluacion_nivel.resultado` (`APROBADO`, `EN_PROCESO`, `NO_APROBADO`). Las categorías tienen género, porque M4-03 las usa. |
| M3 | Un patinador está en un solo grupo a la vez. `evento_calendario` cubre lo que no son horarios ni competencias. |
| M4 | Lista de modalidades de `prueba`. Los puntos del ranking se guardan en `resultado.puntos` con una regla que define el grupo. `sancion` no tiene RF propio. |
| M5 | Medios de pago: efectivo, transferencia y consignación. La matrícula y los gastos administrativos son cobros. |
| M6 | La venta de uniformes se cobra a través de M5. Valores de `cargo` en `personal`. |

Para cambiar el esquema, abran un PR que modifique `schema.sql` y avisen al grupo dueño de la tabla (el prefijo `[Mx]` de su comentario). Cuando el backend adopte un ORM, este archivo será la línea base de la primera migración.
