# Estados y formatos

Convenciones de dominio que los componentes muestran. Son la razón por la que «Vencido» se ve igual en M4, M5 y M6.

## Contenido

1. Regla de asignación de tono
2. Tono a ícono
3. Catálogo de estados
4. Formatos de valores
5. Vocabulario de acciones y mensajes

---

## 1. Regla de asignación de tono

Todo estado nuevo se asigna con esta regla, en orden:

| Situación | Tono |
|---|---|
| **Bloquea** una acción o fue rechazado / falló | `error` |
| Requiere atención pero **no bloquea** | `warning` |
| Está **en curso** o es informativo | `info` |
| Se **completó** o está en orden | `success` |
| Está **inactivo, anulado, cancelado** o no tiene estado relevante | `neutral` |

Dos consecuencias: **Anulado/Cancelado siempre es `neutral`** (ya no es válido, pero tampoco es un error) y **Rechazado siempre es `error`**.

## 2. Tono a ícono

Una sola familia de íconos de contorno (ver puntos abiertos en `SKILL.md`). Nombres genéricos:

| Tono | Ícono |
|---|---|
| `success` | `check-circle` |
| `warning` | `alert-triangle` |
| `error` | `x-circle` |
| `info` | `info` |
| `neutral` | `minus-circle` |

`StatusBadge` siempre muestra ícono más texto. El texto del estado se escribe tal como aparece en la tabla.

## 3. Catálogo de estados

Fuente: `REQUIREMENTS.md` §5.1. Los marcados *(derivado)* no están en el documento original de requisitos.

| Entidad | Estado | Tono | RF |
|---|---|---|---|
| Cuenta de profesor | Por registrar | `neutral` | M1-03 |
| | Cuenta activa | `success` | M1-03 |
| Perfil de patinador menor | Bloqueado (falta autorización o póliza) | `error` | M1-02 |
| | Habilitado | `success` | M1-02 |
| Grupo | Con cupo | `success` | M3-02 |
| | Alerta al 90 % | `warning` | M3-02 |
| | Lleno | `error` | M3-02 |
| Competencia | Programada | `info` | M4-01 |
| | Cancelada *(derivado)* | `neutral` | M4-12 |
| Inscripción | En validación | `info` | M4-06 |
| | Aprobada | `success` | M4-11 |
| | Rechazada | `error` | M4-11 |
| | Anulada | `neutral` | M4-12 |
| Causal de rechazo | Póliza · Cartera · Autorización · Sanción | `error` | M4-11 |
| Participante en resultados | Con puesto | *(sin badge: se muestra la posición)* | M4-14 |
| | No finalizó | `neutral` | M4-14 |
| Plan | Activo | `success` | M5-01, M5-03 |
| | Inactivo | `neutral` | M5-03 |
| Cobro | Pendiente | `warning` | M5-08 |
| | Pagado | `success` | M5-09, M5-10 |
| | Anulado | `neutral` | M5-11 |
| Pago | Registrado | `success` | M5-09 |
| | Anulado | `neutral` | M5-11 |
| Comprobante | Vigente | `success` | M5-14 |
| | Anulado | `neutral` | M5-14 |
| Cartera | Al día | `success` | M5-12 |
| | Pendiente | `warning` | M5-12 |
| | Vencido | `error` | M5-12 |
| Personal | Activo | `success` | M6-02 |
| | Inactivo | `neutral` | M6-02 |
| Uniforme | Stock normal | `success` | M6-06 |
| | Alerta por cantidad mínima | `warning` | M6-06 |
| Préstamo de uniforme | Activo | `info` | M6-08 |
| | Devuelto | `success` | M6-08 |
| | Vencido | `error` | M6-08 |
| | Pérdida o daño *(derivado)* | `error` | M6-08 |

**Precedencia de Cartera:** `Vencido` prevalece sobre `Pendiente` (M5-12). Si un patinador tiene cobros en ambos estados, se muestra un solo badge: `Vencido`.

**Umbral de aforo:** `CapacityMeter` y `GroupCard` pasan a `warning` al alcanzar el 90 % del cupo y a `error` al llegar al 100 % (M3-02).

## 4. Formatos de valores

| Valor | Formato | Ejemplo | Componente | RF |
|---|---|---|---|---|
| Tiempo de competencia | `MM:SS.mmm`, milisegundos siempre presentes, cifras tabulares | `01:23.450` | `TimeInput`, `TimeDisplay` | M4-13 |
| Moneda | COP, sin decimales, punto como separador de miles, prefijo `$` | `$ 85.000` | `CurrencyInput`, `CurrencyDisplay` | M5-04 |
| Fecha | `DD/MM/AAAA` | `21/09/2026` | `DateInput` | transversal |
| Distancia de prueba | Metros, mayor que 0 | `500 m` | `TextInput` numérico con sufijo | M4-02 |
| Cupo | `ocupados/total` más porcentaje opcional | `18/20` | `CapacityMeter` | M3-02 |
| Posición | Número ordinal simple | `1.º`, `2.º` | `RankingTable` | M4-14 |

Restricciones de fecha que `DateInput` debe poder expresar con `min` y `max`:
- Fecha de pago: **no posterior a hoy** (M5-09, M5-10).
- Cierre de inscripciones: **anterior a la fecha de la competencia** (M4-04).

Tiempos de generación que el estado `loading` de `ExportMenu` debe contemplar: hasta 10 s para resultados (M4-19) y hasta 5 s para un comprobante PDF (M5-15). Formatos de exportación financiera: PDF y XLSX (M6-05); resultados: PDF, XLSX o CSV (M4-19).

## 5. Vocabulario de acciones y mensajes

- **Verbos de acción:** *Guardar*, *Cancelar*, *Crear*, *Editar*, *Asignar*, *Cambiar*, *Aprobar*, *Anular*, *Desactivar*, *Descargar*, *Exportar*, *Filtrar*. **Nunca *Eliminar*** (regla de negocio: sin borrado físico).
- **Acciones con motivo obligatorio:** anular un pago (M5-11), cancelar o modificar una competencia (M4-12), corregir un resultado (M4-18) y registrar pérdida o daño de un uniforme (M6-08). Siempre con `Dialog/ConfirmWithReason`.
- **Auditoría visible:** cambios de tarifas (M5-04), correcciones de resultados (M4-18) y anulaciones (M5-11) muestran un `AuditEntry` con usuario, fecha y motivo.
- **Campos obligatorios:** se marcan con `*` **y** el texto «obligatorio» disponible para lectores de pantalla. Los mensajes de error dicen qué corregir («Ingresa una fecha no posterior a hoy»), no solo que hay un error.
- **Mayúsculas:** estilo oración («Al día», «En validación»).