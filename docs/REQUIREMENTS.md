# Requerimientos funcionales: trazabilidad

> Resumen navegable de los **77 RF** de la *Lista de Requerimientos Final* v1.0.
> Sirve como puente entre requisitos, design system, código y pruebas.
> Contexto general del proyecto: [`CONTEXT.md`](./CONTEXT.md)

---

## 1. Cómo leer este documento

**ID:** `RF-M{módulo}-{nn}`. En las tablas se abrevia a `M4-06` (equivale a `RF-M4-06`).

**Actores:** `Adm` Administrador · `Prof` Profesor · `Pat` Patinador · `Acu` Acudiente · `Con` Contador · `Fis` Fisioterapeuta · `Vis` Visitante · `Sis` Sistema (automático)

**Tipo de interacción** *(columna derivada para el design system; no existe en el documento original)*:

| Tipo | Significado | Componente de UI esperado |
|---|---|---|
| Formulario | Captura o edición de datos | Form, inputs, validación, feedback |
| Consulta | Lectura de datos (solo lectura) | Tabla, ficha, lista, filtros |
| Acción | Operación sobre datos existentes (asignar, cambiar, aprobar, anular) | Botón, diálogo de confirmación, selector |
| Automático | Lo ejecuta el sistema; la UI solo muestra el resultado o estado | Badge de estado, notificación, log |
| Reporte | Generación o exportación de documentos | Filtros de fecha, botón de descarga |
| Panel | Indicadores consolidados | Tarjetas KPI, dashboard |
| Calendario | Vista temporal de eventos | Calendario interactivo |

**Verificación:** `T` Prueba · `D` Demostración · `I` Inspección.
**Dependencias:** `Depende de` son los requisitos que este necesita. `Requerido por` es el índice inverso, calculado a partir de las dependencias declaradas, y sirve para medir el impacto de un cambio.

---

## 2. Resumen

| Módulo | Nombre | RF | Alta | Media | Baja |
|---|---|---:|---:|---:|---:|
| M1 | Usuarios y Acceso | 3 | 2 | 1 | 0 |
| M2 | Gestión deportiva de patinadores | 23 | 14 | 6 | 3 |
| M3 | Grupos, horarios y programación | 6 | 5 | 1 | 0 |
| M4 | Competencias y Resultados | 19 | 10 | 8 | 1 |
| M5 | Planes, Tarifas y Pagos | 18 | 11 | 7 | 0 |
| M6 | Administración, Reportes, Finanzas e Inventario | 8 | 8 | 0 | 0 |
| | **Total** | **77** | **50** | **23** | **4** |

*En M5, «Media» corresponde a «Should» de MoSCoW; «Alta» a «Must».*

---

## 3. Matriz de trazabilidad por módulo

### M1 · Usuarios y Acceso

| ID | Nombre | Actores | Prior. | Tipo | Ver. | Depende de | Requerido por |
|---|---|---|---|---|---|---|---|
| M1-01 | Registro y autenticación de usuarios por rol | Pat, Acu, Prof, Vis | Alta | Formulario | T | — | M1-02, M1-03, M3-03, M4-01, M5-01, M5-02, M5-04, M5-05, M5-06, M5-07, M5-09, M5-10, M5-11, M5-13, M5-16, M5-17, M5-18 |
| M1-02 | Autorización del acudiente para menores de edad | Acu, Adm | Alta | Acción | T | M1-01 | M4-07 |
| M1-03 | Activación de cuenta de profesor en primer inicio de sesión | Prof | Media | Automático | T | M1-01 | — |

### M2 · Gestión deportiva de patinadores

| ID | Nombre | Actores | Prior. | Tipo | Ver. | Depende de | Requerido por |
|---|---|---|---|---|---|---|---|
| M2-01 | Registro de información de patinadores | Adm | Alta | Formulario | T | — | M2-02, M2-03, M2-04, M2-06, M2-08, M5-06 |
| M2-02 | Consulta de información de patinadores | Adm | Alta | Consulta | D | M2-01 | — |
| M2-03 | Actualización de información de patinadores | Adm | Alta | Formulario | T | M2-01 | — |
| M2-04 | Asociación de patinadores con acudientes | Adm | Alta | Acción | T | M2-01 | M4-06, M4-09, M5-06, M5-07, M5-17 |
| M2-05 | Registro y gestión de niveles de patinaje | Adm | Alta | Formulario | T | — | M2-06, M2-08, M2-17, M3-02, M4-15 |
| M2-06 | Consulta de nivel de conocimiento del patinador | Adm | Alta | Consulta | D | M2-01, M2-05 | M2-20 |
| M2-07 | Registro y gestión de categorías del club | Adm | Alta | Formulario | T | — | M2-08, M2-09, M2-12, M2-17, M2-19, M4-03, M4-15 |
| M2-08 | Asignación de patinadores a categorías | Adm | Alta | Acción | T | M2-01, M2-05, M2-07 | M2-09, M2-10, M2-18, M2-21 |
| M2-09 | Cambio de categoría por avance de nivel | Adm | Alta | Acción | T | M2-07, M2-08 | M2-10, M2-16 |
| M2-10 | Conservación del historial de niveles y categorías | Adm | Alta | Consulta | D | M2-08, M2-09 | M2-15, M2-22 |
| M2-11 | Consulta de información para entrenamiento | Prof | Alta | Consulta | D | — | — |
| M2-12 | Evaluación de nivel de conocimiento en patinaje | Prof | Alta | Formulario | T | M2-07 | M2-13, M2-16 |
| M2-13 | Registro de habilidades adquiridas y pendientes | Prof | Alta | Formulario | T | M2-12 | M2-16 |
| M2-14 | Registro de observaciones de desempeño | Prof | Media | Formulario | T | — | M2-23 |
| M2-15 | Consulta de historial de niveles de un patinador | Prof | Media | Consulta | D | M2-10 | — |
| M2-16 | Propuesta o realización de cambio de categoría por el profesor | Prof | Alta | Acción | T | M2-09, M2-12, M2-13 | — |
| M2-17 | Consulta de categorías y niveles definidos por el club | Prof | Media | Consulta | D | M2-05, M2-07 | — |
| M2-18 | Consulta de categoría actual del patinador | Acu | Media | Consulta | D | M2-08 | — |
| M2-19 | Consulta de categorías disponibles en el club | Acu | Baja | Consulta | D | M2-07 | — |
| M2-20 | Consulta de nivel actual de conocimiento | Pat | Media | Consulta | D | M2-06 | — |
| M2-21 | Consulta de categoría actual | Pat | Media | Consulta | D | M2-08 | — |
| M2-22 | Consulta del historial de categorías y niveles | Pat | Baja | Consulta | D | M2-10 | — |
| M2-23 | Consulta de observaciones de profesores | Pat | Baja | Consulta | D | M2-14 | — |

### M3 · Grupos, horarios y programación

| ID | Nombre | Actores | Prior. | Tipo | Ver. | Depende de | Requerido por |
|---|---|---|---|---|---|---|---|
| M3-01 | Gestión de sedes del club | Adm | Alta | Formulario | T | — | M3-02 |
| M3-02 | Creación y configuración de grupos con aforo | Adm | Alta | Formulario | T | M3-01, M2-05 | M3-03, M3-04, M3-05 |
| M3-03 | Asignación de profesores a grupos | Adm | Alta | Acción | T | M1-01, M3-02 | M3-04 |
| M3-04 | Gestión y programación de horarios | Adm | Alta | Formulario | T | M3-02, M3-03 | M3-05, M3-06 |
| M3-05 | Selección y cambio de grupo por el patinador | Pat, Acu | Alta | Acción | T | M3-02, M3-04 | — |
| M3-06 | Calendario general e integrado de la escuela | Adm, Prof, Pat, Acu | Media | Calendario | I/D | M3-04 | M4-04 |

### M4 · Competencias y Resultados

| ID | Nombre | Actores | Prior. | Tipo | Ver. | Depende de | Requerido por |
|---|---|---|---|---|---|---|---|
| M4-01 | Creación y configuración de una competencia | Adm, Prof | Alta | Formulario | T | M1-01 | M4-02, M4-12 |
| M4-02 | Configuración de modalidades y pruebas por distancia | Adm, Prof | Alta | Formulario | T | M4-01 | M4-03, M4-04 |
| M4-03 | Asociación de pruebas a categorías de edad y género | Adm, Prof | Alta | Formulario | I | M4-02, M2-07 | M4-04 |
| M4-04 | Publicación de la competencia y apertura de inscripciones | Adm, Prof, Pat, Acu | Media | Acción | D | M4-02, M4-03, M3-06 | M4-05, M4-06, M4-12 |
| M4-05 | Preselección de patinadores elegibles por el profesor | Prof | Media | Acción | T | M4-04 | M4-06 |
| M4-06 | Solicitud de inscripción a una prueba | Pat, Acu, Adm | Alta | Acción | T | M4-04, M4-05, M2-04 | M4-07, M4-08, M4-09, M4-10 |
| M4-07 | Validación automática de póliza médica vigente | Sis, Fis, Adm | Alta | Automático | T | M4-06, M1-02 | M4-11 |
| M4-08 | Validación automática del estado de cartera | Sis, Adm, Con | Alta | Automático | T | M4-06, M5-12 | M4-11 |
| M4-09 | Autorización digital del acudiente para menores | Acu, Adm | Alta | Acción | T | M4-06, M2-04 | M4-11 |
| M4-10 | Bloqueo de inscripción por sanción disciplinaria activa | Sis, Adm, Prof | Media | Automático | T | M4-06 | M4-11 |
| M4-11 | Ratificación o rechazo de la inscripción con causal | Sis, Adm, Acu, Pat | Alta | Automático | T | M4-07, M4-08, M4-09, M4-10 | M4-13 |
| M4-12 | Modificación y cancelación de competencias con notificación | Adm | Media | Formulario | T | M4-01, M4-04 | — |
| M4-13 | Registro de tiempos cronometrados en milisegundos | Prof, Adm | Alta | Formulario | T | M4-11 | M4-14, M4-16, M4-18 |
| M4-14 | Generación de tablas de resultados por prueba | Sis, Adm, Prof, Pat, Acu | Alta | Consulta | D | M4-13 | M4-15, M4-16, M4-17, M4-18, M4-19 |
| M4-15 | Ranking acumulado por categoría y nivel | Pat, Acu, Prof, Adm | Media | Consulta | D | M4-14, M2-05, M2-07 | M4-18, M4-19 |
| M4-16 | Seguimiento de récords personales y evolución de marcas | Pat, Acu, Prof | Media | Consulta | T | M4-13, M4-14 | — |
| M4-17 | Historial de participación en competencias | Pat, Acu, Prof, Adm | Media | Consulta | D | M4-14 | — |
| M4-18 | Corrección de resultados con registro de auditoría | Adm | Media | Formulario | T | M4-13, M4-14, M4-15 | — |
| M4-19 | Exportación y publicación de resultados | Adm, Prof | Baja | Reporte | D | M4-14, M4-15 | — |

### M5 · Planes, Tarifas y Pagos

| ID | Nombre | Actores | Prior. | Tipo | Ver. | Depende de | Requerido por |
|---|---|---|---|---|---|---|---|
| M5-01 | Creación de plan de servicio | Adm | Alta | Formulario | T | M1-01 | M5-02, M5-03, M5-04, M5-05, M5-06 |
| M5-02 | Edición de plan de servicio | Adm | Media | Formulario | T | M1-01, M5-01 | — |
| M5-03 | Desactivación de plan de servicio | Adm | Media | Acción | T | M5-01, M5-06, M5-07 | — |
| M5-04 | Registro de tarifa de un plan | Adm | Alta | Formulario | T | M1-01, M5-01 | M5-05, M5-06, M5-08, M5-10 |
| M5-05 | Consulta de planes y tarifas vigentes | Adm, Con, Acu, Pat | Media | Consulta | D | M1-01, M5-01, M5-04 | — |
| M5-06 | Asignación de plan a un patinador | Adm, Acu, Pat | Alta | Acción | T | M1-01, M2-01, M2-04, M5-01, M5-04, M5-08 | M5-03, M5-07, M5-08, M5-10, M5-17, M5-18 |
| M5-07 | Cambio de plan de un patinador | Adm, Acu, Pat | Media | Acción | T | M1-01, M2-04, M5-06, M5-08 | M5-03 |
| M5-08 | Generación automática de cobros mensuales | Sis | Alta | Automático | T | M5-04, M5-06 | M5-06, M5-07, M5-09, M5-12 |
| M5-09 | Registro manual de pago de un cobro | Adm, Con | Alta | Formulario | T | M1-01, M6-03, M5-08, M5-12, M5-14 | M5-11, M5-12, M5-14, M5-16 |
| M5-10 | Registro manual de pago por sesión (plan de día único) | Adm, Con | Alta | Formulario | T | M1-01, M6-03, M5-04, M5-06, M5-14 | M5-11, M5-12, M5-14, M5-16 |
| M5-11 | Anulación de pago registrado | Adm | Media | Acción | T | M1-01, M5-09, M5-10, M5-12, M5-14 | M5-12, M5-16 |
| M5-12 | Cálculo automático del estado de cartera | Sis | Alta | Automático | T | M5-08, M5-09, M5-10, M5-11 | M4-08, M5-09, M5-11, M5-13, M5-17, M5-18 |
| M5-13 | Consulta del estado de cartera de los patinadores | Adm, Con | Alta | Consulta | D | M1-01, M6-03, M5-12 | — |
| M5-14 | Generación de comprobante de pago | Sis | Alta | Automático | T | M5-09, M5-10 | M5-09, M5-10, M5-11, M5-15 |
| M5-15 | Descarga de comprobante de pago | Adm, Con, Acu, Pat | Media | Reporte | D | M5-14, M5-16, M5-17, M5-18 | — |
| M5-16 | Consulta del historial de pagos (Adm/Con) | Adm, Con | Alta | Consulta | D | M1-01, M6-03, M5-09, M5-10, M5-11 | M5-15 |
| M5-17 | Consulta de pagos de los patinadores a cargo | Acu | Alta | Consulta | D | M1-01, M2-04, M5-06, M5-12 | M5-15 |
| M5-18 | Consulta de pagos propios | Pat | Media | Consulta | D | M1-01, M5-06, M5-12 | M5-15 |

### M6 · Administración, Reportes, Finanzas e Inventario

| ID | Nombre | Actores | Prior. | Tipo | Ver. | Depende de | Requerido por |
|---|---|---|---|---|---|---|---|
| M6-01 | Visualización del panel general administrativo | Adm | Alta | Panel | T | M6-02, M6-04, M6-06 | M6-06 |
| M6-02 | Registro y administración de personal | Adm | Alta | Formulario | T | gestión de usuarios (sin RF) | M6-01, M6-03 |
| M6-03 | Asignación de permisos al rol Contador | Adm | Alta | Acción | T | M6-02 | M5-09, M5-10, M5-13, M5-16 |
| M6-04 | Generación de reportes financieros filtrados | Adm, Con | Alta | Reporte | T | M6-07, pagos y facturación (sin RF) | M6-01, M6-05 |
| M6-05 | Exportación de reportes financieros | Adm, Con | Alta | Reporte | T | M6-04 | — |
| M6-06 | Registro y control de uniformes | Adm | Alta | Formulario | T | M6-01 | M6-01, M6-07, M6-08 |
| M6-07 | Registro de venta de uniformes | Adm | Alta | Formulario | T | M6-06, pagos (sin RF) | M6-04 |
| M6-08 | Registro de préstamo y entrega de uniformes | Adm | Alta | Formulario | T | M6-06 | — |

---

## 4. Actores × módulos

| Actor | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|
| Administrador | M1-02 | M2-01 a 10 | M3-01 a 04, 06 | M4-01 a 04, 06 a 15, 17 a 19 | M5-01 a 07, 09 a 11, 13, 15, 16 | M6-01 a 08 |
| Profesor | M1-01, 03 | M2-11 a 17 | M3-06 | M4-01 a 05, 10, 13 a 17, 19 | — | — |
| Patinador | M1-01 | M2-20 a 23 | M3-05, 06 | M4-04, 06, 11, 14 a 17 | M5-05 a 07, 15, 18 | — |
| Acudiente | M1-01, 02 | M2-18, 19 | M3-05, 06 | M4-04, 06, 09, 11, 14 a 17 | M5-05 a 07, 15, 17 | — |
| Contador | — | — | — | M4-08 | M5-05, 09, 10, 13, 15, 16 | M6-04, 05 (rol: M6-03) |
| Fisioterapeuta | — | — | — | M4-07 | — | — |
| Visitante | M1-01 | — | (M3-06, calendario público) | — | — | — |
| Sistema | — | — | — | M4-07, 08, 10, 11, 14 | M5-08, 12, 14 | — |

---

## 5. Insumos para el design system

### 5.1 Catálogo de estados (componentes Badge / Status)

| Entidad | Estados | Origen |
|---|---|---|
| Cuenta de profesor | `Por registrar` → `Cuenta activa` | M1-03 |
| Perfil de patinador menor | Bloqueado (falta autorización o póliza) → Habilitado | M1-02 |
| Grupo | Con cupo · Alerta al 90 % · Lleno (bloquea matrículas) | M3-02 |
| Competencia | `Programada` · Cancelada *(derivado)* | M4-01, M4-12 |
| Inscripción | `En validación` → `Aprobada` / `Rechazada` (con causal) / `Anulada` | M4-06, 11, 12 |
| Causal de rechazo | Póliza · Cartera · Autorización · Sanción | M4-11 |
| Participante en resultados | Con puesto · `No finalizó` | M4-14 |
| Plan | `Activo` · `Inactivo` | M5-01, 03 |
| Cobro | `Pendiente` · `Pagado` · `Anulado` | M5-08, 09, 10, 11 |
| Pago | `Registrado` · `Anulado` | M5-11, 16 |
| Comprobante | Vigente · `Anulado` | M5-14 |
| Cartera | `Al día` · `Pendiente` · `Vencido` (prevalece sobre Pendiente) | M5-12 |
| Personal | Activo · Inactivo | M6-02 |
| Uniforme | Stock normal · Alerta por cantidad mínima | M6-06 |
| Préstamo de uniforme | Activo · Devuelto · Vencido · Pérdida/daño *(derivado)* | M6-08 |

### 5.2 Patrones de UI recurrentes

| Patrón | Requisitos donde aparece |
|---|---|
| **Formulario CRUD con validación y campos obligatorios** | M2-01, 03, 05, 07 · M3-01, 02, 04 · M4-01, 02, 03 · M5-01, 02, 04 · M6-02, 06 |
| **Formulario transaccional** (monto, fecha, medio, referencia) | M5-09, 10 · M6-07, 08 |
| **Tabla con filtros combinables** | M5-13 (estado, patinador, acudiente, plan, fechas) · M5-16 (fechas, medio, estado) · M4-14 · M4-15 |
| **Ficha / perfil de patinador** | M2-02, 06, 18, 20, 21 |
| **Línea de tiempo / historial cronológico** | M2-10, 15, 22 · M4-16, 17 |
| **Selector de grupo con disponibilidad** (sede, horario, cupos, filtrado por nivel y frecuencia) | M3-05 |
| **Calendario interactivo segmentado por rol** | M3-06, M4-04 |
| **Flujo por pasos / estado de solicitud** | M4-06 a 11 · M1-02 · M1-03 |
| **Panel de KPIs** (6 indicadores mínimos) | M6-01 |
| **Exportación / descarga** (PDF, XLSX, CSV) | M4-19 · M5-15 · M6-05 |
| **Alertas visuales** | M3-02 (aforo 90 %) · M6-06 (stock mínimo) · M6-08 (préstamos vencidos) · M6-04 (reporte vacío) |
| **Diálogo de confirmación con motivo obligatorio** | M5-11 · M4-12 · M4-18 · M6-08 (pérdida/daño) |
| **Selector de contexto multi-patinador** (acudiente con varios hijos) | M5-17 · M2-04 |
| **Notificaciones automáticas** | M3-04 · M4-12 *(sin requisito propio; ver §7)* |
| **Ranking / tabla posicional** | M4-14, 15 |

### 5.3 Reglas de formato y límites (tokens y validaciones)

| Regla | Valor | Origen |
|---|---|---|
| Formato de tiempo | `MM:SS.mmm` | M4-13 |
| Moneda | Pesos colombianos (COP) | M5-04 |
| Distancia de prueba | Metros, mayor que 0 | M4-02 |
| Alerta de aforo | 90 % del cupo | M3-02 |
| Generación de archivo exportado (resultados) | ≤ 10 s | M4-19 |
| Generación de comprobante PDF | ≤ 5 s | M5-15 |
| Cierre de inscripciones | Anterior a la fecha de la competencia | M4-04 |
| Fecha de pago | No posterior a hoy | M5-09, 10 |
| Formatos de exportación financiera | PDF y XLSX | M6-05 |

### 5.4 Visibilidad por rol (qué debe ocultar o mostrar la UI)

- **Visitante:** solo información general de la escuela; nunca datos de patinadores (M1-01).
- **Acudiente:** únicamente los patinadores asociados a su cuenta (M5-17, M4-17, M5-15).
- **Patinador menor de edad:** no ve pagos ni cambia grupo, plan ni inscripciones por sí mismo (M5-18, M3-05, M5-06, M4-06).
- **Profesor:** solo patinadores de sus grupos (M4-05, M2-12, M2-14).
- **Contador:** solo lectura y exportación financiera; sin acceso a gestión de usuarios, grupos, horarios, matrículas ni inventario (M6-03). No anula pagos (M5-11).
- **Profesor, Fisioterapeuta y Visitante:** sin acceso a pagos (M5-16).
- **Observaciones del profesor:** visibles para el patinador solo si el club lo habilita (M2-23).
- **Ranking:** visible solo para la misma categoría o nivel y el personal técnico (M4-15).

---

## 6. Orden de construcción sugerido (por dependencias)

| Capa | Requisitos | Motivo |
|---|---|---|
| 0 · Base | M1-01, M6-02, M6-03 | Autenticación, roles y permisos: casi todo depende de ellos |
| 1 · Catálogos | M2-01, M2-05, M2-07, M3-01, M5-01, M5-04 | Datos maestros sin dependencias entrantes |
| 2 · Relaciones | M1-02, M2-04, M2-08, M3-02, M3-03, M5-06 | Vinculan catálogos entre sí |
| 3 · Operación | M3-04, M3-05, M3-06, M5-08, M5-09, M5-10, M5-12, M5-14 | Horarios, cobros, pagos y cartera |
| 4 · Competencias | M4-01 a M4-11 | Requieren categorías (M2), calendario (M3) y cartera (M5) |
| 5 · Resultados | M4-13 a M4-19 | Requieren inscripciones aprobadas |
| 6 · Consultas y reportes | Vistas por rol de M2 y M5, M6-01, M6-04, M6-05 | Consumen datos de las capas anteriores |

---

## 7. Observaciones y puntos abiertos

Hallazgos de consistencia al consolidar el documento; conviene resolverlos con los equipos antes de fijar el design system.

1. **Roles sin definición en M1-01.** M1-01 lista solo Patinador, Acudiente, Profesor y Visitante. Administrador, Contador y Fisioterapeuta se usan en otros módulos sin un requisito de registro o alta.
2. **Dependencias circulares.** M6-01 ↔ M6-06, M5-06 ↔ M5-08, M5-09 ↔ M5-14, M5-09 ↔ M5-12, M5-10 ↔ M5-14, M5-11 ↔ M5-12 y M5-11 ↔ M5-14 (cada par se referencia mutuamente). Afecta el orden de implementación y las pruebas.
3. **Dependencias sin RF.** M6-02 ("gestión de usuarios"), M6-04 ("pagos y facturación") y M6-07 ("pagos") apuntan a funcionalidades que no tienen ID.
4. **Funcionalidades referenciadas sin requisito propio:**
   - Registro de **sanciones disciplinarias** (M4-10 lo da por existente).
   - **Carga y validación de la póliza** por el Fisioterapeuta (M4-07; M1-02 solo exige que la póliza esté registrada).
   - **Notificaciones automáticas** (M3-04 y M4-12 las exigen).
   - Consulta de **información general para el Visitante** (M1-01).
   - Gestión de habilitación de observaciones (M2-23).
5. **Escalas de prioridad mezcladas.** M1 a M4 y M6 usan Alta/Media/Baja; M5 usa MoSCoW; M4-16 usa «Media (Should)».
6. **Actor incoherente.** M4-06 lista al Administrador como actor, pero la descripción solo menciona al Patinador o Acudiente.
7. **Campos vacíos.** Varios requisitos de M2 tienen "—" en Dependencias y Restricciones, y su criterio de aceptación es poco medible (por ejemplo M2-01, "campos obligatorios" sin definirlos).
8. **Datos pendientes.** Falta el nombre del proyecto; el formato no define los campos obligatorios de la ficha de patinador (insumo clave para el formulario base del design system).
9. **Estado de todos los RF:** «Propuesto»; ninguno está aprobado ni verificado aún.
