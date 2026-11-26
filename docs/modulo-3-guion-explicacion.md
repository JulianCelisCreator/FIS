# Guion de Sustentación y Explicación — Módulo 3: Grupos, Horarios y Programación (Grupo 2)

> **Propósito:** Este documento sirve como guion oficial para sustentar ante el profesor y los demás grupos de desarrollo el funcionamiento integral (Backend NestJS + Frontend React 19 + Design System Velora) de las 5 Historias de Usuario del Módulo 3 (`HU-3.1` a `HU-3.5`).

---

## 0. Preparación Rápida para la Demostración en Vivo

Antes de iniciar la sustentación, levanta ambos servicios desde la raíz del proyecto (`C:\Users\USUARIO\FIS`):

1. **Terminal 1 — Backend (Puerto 3000):**
   ```powershell
   cd C:\Users\USUARIO\FIS\code\backend
   pnpm.cmd start:dev
   ```
2. **Terminal 2 — Frontend (Puerto 5173):**
   ```powershell
   cd C:\Users\USUARIO\FIS\code\frontend
   pnpm.cmd dev
   ```
3. **URLs Directas de Sustentación:**
   - **HU-3.1:** `http://localhost:5173/app/#/grupos`
   - **HU-3.2:** `http://localhost:5173/app/#/asignacion-profesores`
   - **HU-3.3:** `http://localhost:5173/app/#/horarios`
   - **HU-3.4:** `http://localhost:5173/app/#/cambio-grupo`
   - **HU-3.5:** `http://localhost:5173/app/#/calendario`

---

## 1. HU-3.1: Configuración de Grupos y Aforo (`#/grupos`)

### Objetivo de Negocio y Actores
- **Actor:** Administrador (`ADMIN`).
- **Requisitos Funcionales:** `RF2.5`, `RF1.4`, `RF-M3-01`.
- **Objetivo:** Permitir la creación y gestión de grupos de entrenamiento vinculados a un nivel técnico (`DEP-M2-01`), una categoría deportiva (`DEP-M2-02`) y una sede/pista física (`DEP-G4-01`), garantizando que nunca se supere la capacidad física de la pista y alertando preventivamente cuando la ocupación alcanza el **90%**.

### Reglas Clave Validadas
1. **Validación de Aforo Físico (`DEP-G4-01`):** Si la sede tiene un aforo físico máximo (ej. `Sede Sur - Pista Recreativa Cubierta` = **15 cupos**), el backend rechaza con `400 Bad Request` cualquier intento de configurar un grupo con cupo mayor a 15.
2. **Semáforo de Capacidad (`CapacityMeter`):**
   - **Verde (`< 90%`):** Cupos disponibles normalmente.
   - **Amarillo (`>= 90%` y `< 100%`):** Activa `alerta90: true` y etiqueta `CASI LLENO (>=90%)`.
   - **Rojo (`100%`):** Bloquea nuevas inscripciones y muestra `CUPO LLENO (100% - BLOQUEADO)`.

### Recorrido Paso a Paso en la Interfaz (Demostración)
1. **Inspeccionar los 3 grupos semilla en las tarjetas superiores:**
   - `Semillero A - Iniciación Norte` (`12/20` — **60% Verde**).
   - `Avanzado A - Velocidad Norte` (`18/20` — **90% Amarillo — Escenario BDD 1**).
   - `Adultos Nocturno - Recreativo Sur` (`15/15` — **100% Rojo — Escenario BDD 2**).
2. **Demostrar Escenario BDD 1 (Ocupación al 90%):**
   - En la tarjeta de `Semillero A - Iniciación Norte` (`12/20`), pulsar `+1 Inscribir` hasta llegar a `18/20` (`90%`). Observar cómo la barra `MedidorAforo` cambia instantáneamente a amarillo (`var(--vl-warning-600)`) y aparece la insignia de alerta preventiva.
3. **Demostrar Escenario BDD 2 (Bloqueo al 100%):**
   - En la tarjeta de `Adultos Nocturno - Recreativo Sur` (`15/15`), observar que el botón `+1 Inscribir` está deshabilitado. Al pulsar `+1 Cupo` en un grupo lleno, el backend bloquea la operación con mensaje explícito de cupo agotado.
4. **Demostrar Bloqueo por Exceso de Aforo Físico de Sede (`DEP-G4-01`):**
   - En el formulario lateral **"Crear nuevo grupo"**, seleccionar la sede `Sede Sur - Pista Recreativa Cubierta (Aforo máx. pista: 15)` e ingresar `25` en **Aforo máximo del grupo**.
   - El sistema bloquea el envío e informa que excede la capacidad física permitida por la pista (`15`).

### Endpoints y Conexión con Otros Módulos
- **Expone:** `API-M3-01` (`GET /api/v1/grupos`), `POST /api/v1/grupos`, `PATCH /api/v1/grupos/{id}`.
- **Consume:** `DEP-M2-01` (Niveles), `DEP-M2-02` (Categorías), `DEP-G4-01` (Sedes y aforo físico).

---

## 2. HU-3.2: Asignación de Profesores (`#/asignacion-profesores`)

### Objetivo de Negocio y Actores
- **Actor:** Administrador (`ADMIN`).
- **Requisitos Funcionales:** `RF2.2`, `RF1.3`, `RF-M3-02`, `RF-M3-03`.
- **Objetivo:** Asignar uno o múltiples profesores (`TITULAR` o `AUXILIAR`) a un grupo validando en tiempo real que el docente tenga contrato vigente, disponibilidad horaria (`DEP-M6-01`) y que no tenga traslape con otro grupo ya asignado en el mismo día y franja horaria.

### Reglas Clave Validadas
1. **Múltiples Profesores por Grupo:** Un grupo puede tener docente titular y auxiliares simultáneamente.
2. **Detección de Traslape en Tiempo Real (Escenario BDD 3):** Cruza los bloques horarios del grupo destino contra todos los horarios vigentes de los grupos donde ya dicta clase el profesor.
3. **Validación Contractual y de Disponibilidad (`DEP-M6-01`):** Si un docente tiene contrato `SUSPENDIDO` (ej. `Profesora Laura Gómez` / `prof-inactivo`) o el horario cae fuera de su ventana laboral, se rechaza la asignación.

### Recorrido Paso a Paso en la Interfaz (Demostración)
1. **Camino Feliz (Asignación Múltiple):**
   - Seleccionar el grupo `Semillero A - Iniciación Norte` (Lunes y Miércoles `14:00 - 16:00`).
   - En el buscador de profesores, filtrar por `"Andrés"` (`Profesor Andrés Mejía` — `prof-andres`), elegir rol `AUXILIAR` y pulsar **Asignar al grupo**.
   - Observar cómo la ficha lateral **"Agenda consolidada del profesor (`API-M3-02`)"** se actualiza inmediatamente con el nuevo grupo y sus horarios.
2. **Demostrar Escenario BDD 3 (Bloqueo por Traslape con `Profesor Person`):**
   - Seleccionar el grupo `Intermedio B - Colisión Lunes 08:00` (que entrena Lunes `08:00 - 10:00`).
   - Seleccionar en el listado a **`Profesor Person`** (`prof-person`), quien ya es titular de `Avanzado A - Velocidad Norte` los Lunes de `08:00 a 10:00`.
   - Observar que la interfaz muestra anticipadamente la insignia roja `TRASLAPE DETECTADO` y, al pulsar **Asignar al grupo**, se despliega el modal/alerta de conflicto horario indicando exactamente el grupo y bloque en colisión (`Lunes 08:00-10:00`).

### Endpoints y Conexión con Otros Módulos
- **Expone:** `API-M3-02` (`GET /api/v1/profesores/{id}/grupos`), `POST /api/v1/grupos/{id}/profesores`, `DELETE /api/v1/grupos/{id}/profesores/{profesorId}`.
- **Consume:** `DEP-M1-02` (Profesores activos), `DEP-M6-01` (Contrato y disponibilidad docente).

---

## 3. HU-3.3: Programación de Horarios de Clase (`#/horarios`)

### Objetivo de Negocio y Actores
- **Actor:** Administrador (`ADMIN`).
- **Requisitos Funcionales:** `RF2.1`, `RF2.3`, `RF-M3-04`, `RF-M3-05`.
- **Objetivo:** Gestionar visualmente los bloques semanales de entrenamiento (`Lunes` a `Domingo`, `06:00` a `20:00`) con soporte **Drag & Drop**, impidiendo colisiones de pista/sede (`DEP-G4-01`) o de profesor (`DEP-M6-01`), exigiendo motivo obligatorio al anular una sesión y disparando notificaciones automáticas (`DEP-M1-05`) a profesores, estudiantes y acudientes ante cualquier cambio.

### Reglas Clave Validadas
1. **Validación Anti-Colisión de Pista/Sede:** Dos grupos distintos no pueden ocupar la misma pista (`sedeId`) en horarios que se solapen el mismo día.
2. **Reprogramación Drag & Drop con Notificación Automática (`DEP-M1-05`):** Arrastrar un bloque a otro día/hora valida colisiones y registra una notificación auditable con los IDs de todos los afectados.
3. **Anulación con Motivo Obligatorio (`Dialog/ConfirmWithReason`):** No se permite eliminar/anular un horario sin escribir el motivo que se enviará por correo/push a las familias.

### Recorrido Paso a Paso en la Interfaz (Demostración)
1. **Reprogramación por Drag & Drop (Camino Feliz):**
   - En la grilla semanal, tomar con el cursor el bloque de `Semillero A - Iniciación Norte` del **Lunes 14:00 - 16:00** y arrastrarlo hacia la celda **Martes 14:00**.
   - Observar cómo el bloque se mueve en tiempo real y en el panel inferior **"Bitácora auditable de notificaciones enviadas (`DEP-M1-05`)"** aparece un nuevo registro con el asunto `"Reprogramación de horario — Semillero A - Iniciación Norte"`.
2. **Demostrar Bloqueo por Colisión de Pista (`DEP-G4-01`):**
   - Intentar arrastrar un bloque de la `Sede Norte - Pista Principal 200m` hacia el **Lunes 08:00**, donde ya entrena `Avanzado A - Velocidad Norte` en esa misma pista.
   - El backend rechaza el movimiento (`400 Bad Request`) y muestra la alerta de colisión física de pista.
3. **Demostrar Anulación con Motivo Obligatorio:**
   - Hacer clic en el botón `Anular` dentro de un bloque horario.
   - En el diálogo modal, intentar confirmar con el motivo vacío (el botón permanece bloqueado hasta ingresar al menos 5 caracteres, ej. `"Mantenimiento preventivo de recubrimiento sintético"`).
   - Confirmar y verificar en la bitácora `DEP-M1-05` que se notificó el motivo exacto a los estudiantes y profesores del grupo.

### Endpoints y Conexión con Otros Módulos
- **Expone:** `API-M3-03` (`GET /api/v1/horarios`), `POST /api/v1/horarios`, `PATCH /api/v1/horarios/{id}`, `DELETE /api/v1/horarios/{id}`, `GET /api/v1/horarios/notificaciones`.
- **Consume:** `DEP-G4-01` (Sedes/pistas), `DEP-M6-01` (Disponibilidad docente), `DEP-M1-05` (Servicio de notificaciones).

---

## 4. HU-3.4: Selección y Cambio de Grupo por Parte del Usuario (`#/cambio-grupo`)

### Objetivo de Negocio y Actores
- **Actores:** Estudiante mayor de edad (`ESTUDIANTE`) o Acudiente autorizado (`ACUDIENTE`).
- **Requisitos Funcionales:** `RF1.2`, `RF2.4`, `RF-M3-04`, `RF-M3-05`.
- **Objetivo:** Permitir que el usuario seleccione o cambie su grupo de entrenamiento dentro de un catálogo filtrado automáticamente por su nivel técnico y categoría (`DEP-M2-03`), validando su plan y cartera al día (`DEP-G4-02`), vigencia de póliza médico-deportiva (`DEP-M1-04`), restricción legal de mayoría de edad (`DEP-M1-03`) y liberación atómica del cupo anterior.

### Reglas Clave Validadas (Los 5Perfiles Semilla del Simulador)
En la parte superior de la pantalla `#/cambio-grupo` encontrarás un selector de escenarios que permite probar las 5 reglas de negocio con un solo clic:

| Perfil Semilla en el Selector | ID Estudiante / Rol Actor | Regla de Negocio que Demuestra | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **1. Menor gestionado por Acudiente autorizado** | `est-menor-autorizado` (`ACUDIENTE` `acu-maria`) | Camino feliz: Nivel `Avanzado`, Cartera al día, Póliza vigente, Acudiente autorizado | Permite cambiar del grupo `Avanzado A - Velocidad Norte` (`18/20`) al grupo `Avanzado B - Tarde Norte` (`10/20`), liberando el cupo anterior (`17/20`) y ocupando el nuevo (`11/20`) |
| **2. Menor intentando autogestionarse sin Acudiente** | `est-menor-autorizado` (`ESTUDIANTE`) | Bloqueo `DEP-M1-03`: Un menor de edad (14 años) no puede cambiar de grupo por sí mismo | Muestra banner de bloqueo legal y rechaza cualquier intento con `403 Forbidden` |
| **3. Estudiante Mayor de Edad (Autogestión)** | `est-adulto-activo` (`ESTUDIANTE`, 21 años) | Camino feliz adulto: Nivel `Iniciación`, Póliza vigente y Cartera al día | Permite inscribirse o cambiar de grupo autónomamente sin requerir acudiente |
| **4. Estudiante con Póliza Médica Vencida** | `est-poliza-vencida` (`ACUDIENTE` `acu-jorge`) | Bloqueo `DEP-M1-04`: Póliza deportiva vencida (`2026-01-10`) | Bloquea la selección/cambio de grupo e indica el número de póliza vencida |
| **5. Estudiante con Mora en Cartera** | `est-mora-cartera` (`ESTUDIANTE`) | Bloqueo `DEP-G4-02`: Cartera en mora (`alDiaEnPagos: false`) | Bloquea la selección/cambio de grupo hasta ponerse al día en pagos |

### Endpoints y Conexión con Otros Módulos
- **Expone:** `API-M3-04` (`GET /api/v1/grupos/{id}/estudiantes`), `GET /api/v1/grupos/elegibles`, `POST /api/v1/grupos/cambio-grupo`.
- **Consume:** `DEP-M1-03` (Menor/Acudiente), `DEP-M1-04` (Póliza vigente), `DEP-M2-03` (Perfil deportivo), `DEP-G4-02` (Plan y cartera), `DEP-M1-05` (Notificación de confirmación).

---

## 5. HU-3.5: Visualización de Calendario Interactivo (`#/calendario`)

### Objetivo de Negocio y Actores
- **Actores:** Administrador (`ADMIN`), Profesor (`PROFESOR`), Estudiante (`ESTUDIANTE`) y Acudiente (`ACUDIENTE`).
- **Requisitos Funcionales:** `RF2.1`, `RF3.3`, `RF-M3-06`.
- **Objetivo:** Consolidar en una sola vista interactiva (Semanal, Mensual y Agenda) las **Clases Regulares** del Módulo 3, las **Competencias Oficiales** publicadas por el Módulo 4 (`DEP-M4-01`) y los **Eventos Institucionales de la Escuela**, segmentando automáticamente la visibilidad según el rol del usuario autenticado.

### Reglas Clave Validadas
1. **Segmentación Estricta por Rol (`API-M3-05`):**
   - **Estudiante / Acudiente:** Solo ve las clases de los grupos en los que está inscrito (o su representado menor en `DEP-M1-03`), las competencias de su categoría (`DEP-M2-03` + `DEP-M4-01`) y los eventos globales de la escuela.
   - **Profesor:** Ve todas las clases donde es docente (`TITULAR` o `AUXILIAR`), más competencias y eventos institucionales.
   - **Administrador:** Ve la programación completa de toda la escuela, dispone de filtros cruzados (Nivel, Categoría, Sede, Profesor, Tipo de Evento) y puede crear, reprogramar o anular eventos institucionales con notificación masiva (`DEP-M1-05`).
2. **Popover / Drawer de Detalle Completo:** Al hacer clic en cualquier evento del calendario, muestra horario exacto, sede/pista (`DEP-G4-01`), profesores asignados (`DEP-M1-02`), nivel/categoría y cupos disponibles en tiempo real (`ocupados / aforoMax`).

### Recorrido Paso a Paso en la Interfaz (Demostración)
1. **Alternar Perspectiva de Rol en la Barra Superior:**
   - Seleccionar **`Administrador (Vista total + Gestión)`**: observar los filtros multicriterio y cómo aparecen todos los entrenamientos, el *"Festival Interno de Habilidades y Velocidad"* (`EVENTO_ESCUELA`) y las competencias de M4 (*"I Válida Distrital de Velocidad 2026"* y *"Festival Nacional Interclubes de Semilleros"*).
   - Cambiar a **`Profesor Person (Mis clases + Eventos)`**: observar cómo las clases de otros docentes desaparecen y quedan únicamente sus sesiones asignadas junto con los eventos institucionales.
   - Cambiar a **`Estudiante inscrito (Mateo Gómez)`** o **`Acudiente autorizado (María Gómez)`**: verificar que solo aparecen las sesiones de su grupo (`Avanzado A - Velocidad Norte`) y la competencia de su categoría (`Juvenil`).
2. **Cambiar entre Vistas (`Semana`, `Mes`, `Agenda`) y Abrir Detalle:**
   - Alternar los botones **Semana**, **Mes** y **Agenda**.
   - Hacer clic sobre cualquier tarjeta de evento para inspeccionar su panel lateral con docentes, sede y cupos disponibles.
3. **Crear o Anular un Evento Institucional (como Administrador):**
   - En el formulario lateral **"Programar evento institucional"**, crear un evento (ej. *"Clínica Técnica de Curvas y Peralte"*, Sábado `09:00 - 11:00`) con notificación automática activada.
   - Verificar que el evento se renderiza inmediatamente en el calendario con su etiqueta de color institucional.

### Endpoints y Conexión con Otros Módulos
- **Expone:** `API-M3-05` (`GET /api/v1/calendario`), `POST /api/v1/calendario/eventos`, `PATCH /api/v1/calendario/eventos/{id}`, `DELETE /api/v1/calendario/eventos/{id}`.
- **Consume:** `DEP-M4-01` (Competencias publicadas de M4), `DEP-M1-01` (Sesión/Rol), `DEP-M1-02` (Profesores), `DEP-M1-03` (Vínculo Acudiente-Menor), `DEP-M1-05` (Notificaciones), `DEP-M2-01` (Niveles), `DEP-M2-02` (Categorías), `DEP-M2-03` (Perfil deportivo), `DEP-G4-01` (Sedes).
