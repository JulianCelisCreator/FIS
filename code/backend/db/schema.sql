-- =============================================================================
-- Plataforma de gestión para escuela de patinaje · DDL de la base de datos
-- Motor: PostgreSQL 17
--
-- Fuente de los requisitos: docs/REQUIREMENTS.md y docs/CONTEXT.md (77 RF).
-- Los campos salen de los wireframes de cada grupo (wireframes/grupo-XX).
--
-- Convenciones:
--   * Tablas y columnas en español, snake_case, sin tildes ni ñ (igual que el
--     backend). Tablas en singular.
--   * Llave primaria `id` BIGINT IDENTITY; llaves foráneas `<tabla>_id`.
--   * Estados como TEXT en MAYÚSCULAS con CHECK (más fáciles de extender que
--     un tipo ENUM).
--   * Moneda en COP: NUMERIC(14,2). Tiempos de competencia en milisegundos.
--   * Sin borrado físico (regla de negocio 5): las tablas de negocio usan
--     estados, `activo` o fechas de fin. Las FK no usan ON DELETE CASCADE.
--   * Cada tabla tiene COMMENT ON TABLE con el prefijo [Mx] del módulo dueño
--     y los RF que cubre; se ve en cualquier cliente (\dt+ en psql, DBeaver…).
--   * Lo que es derivado (estado de cartera, aforo, perfil habilitado,
--     récords) se expone como VISTA y no se guarda.
--
-- Orden del archivo (sigue las dependencias, no la numeración):
--   0. Transversal   1. M1 Usuarios y Acceso   2. M2 Gestión deportiva
--   3. M1 (vínculo acudiente, autorización, póliza; dependen de patinador)
--   4. M3 Grupos y horarios   5. M5 Planes, Tarifas y Pagos
--   6. M4 Competencias        7. M6 Administración e Inventario
--   8. Vistas                 9. Datos semilla
--
-- El script es idempotente solo sobre una base vacía: el contenedor lo ejecuta
-- una vez, al crear el volumen (ver db/README.md).
-- =============================================================================

SET client_encoding = 'UTF8';
SET timezone = 'America/Bogota';

BEGIN;

-- -----------------------------------------------------------------------------
-- Función compartida: mantiene `actualizado_en` al día en cada UPDATE.
-- Se engancha al final del script a todas las tablas que tienen esa columna.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_set_actualizado_en() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 0. TRANSVERSAL (lo usan varios módulos)
-- =============================================================================

CREATE TABLE parametro_sistema (
  clave          TEXT PRIMARY KEY,
  valor          TEXT NOT NULL,
  descripcion    TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE parametro_sistema IS
  '[Transversal] Parámetros configurables del club: % de alerta de aforo (M3-02), día de generación de cobros (M5-08), visibilidad de observaciones para el patinador (M2-23), etc.';


-- =============================================================================
-- 1. M1 · USUARIOS Y ACCESO
-- =============================================================================

CREATE TABLE rol (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE
              CHECK (codigo IN ('ADMINISTRADOR','PROFESOR','PATINADOR','ACUDIENTE',
                                'CONTADOR','FISIOTERAPEUTA','VISITANTE')),
  nombre      TEXT NOT NULL,
  descripcion TEXT
);
COMMENT ON TABLE rol IS
  '[M1] Roles del sistema (M1-06). Catálogo cerrado; se carga en la sección de datos semilla.';

CREATE TABLE permiso (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE,          -- p. ej. M5_PAGO_REGISTRAR
  modulo      TEXT NOT NULL CHECK (modulo IN ('M1','M2','M3','M4','M5','M6')),
  descripcion TEXT NOT NULL
);
COMMENT ON TABLE permiso IS
  '[M1] Acciones protegidas del sistema para el control de acceso por rol (M1-07). Cada módulo registra aquí sus permisos con el prefijo de su módulo.';

CREATE TABLE rol_permiso (
  rol_id     BIGINT NOT NULL REFERENCES rol(id),
  permiso_id BIGINT NOT NULL REFERENCES permiso(id),
  PRIMARY KEY (rol_id, permiso_id)
);
COMMENT ON TABLE rol_permiso IS
  '[M1] Permisos de cada rol (M1-07). El Administrador asigna los del Contador (M6-03).';

CREATE TABLE usuario (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombres              TEXT NOT NULL,
  apellidos            TEXT NOT NULL,
  tipo_documento       TEXT CHECK (tipo_documento IN ('CC','TI','RC','CE','PASAPORTE','OTRO')),
  numero_documento     TEXT,
  correo               TEXT NOT NULL,
  telefono             TEXT,
  contrasena_hash      TEXT NOT NULL,
  estado               TEXT NOT NULL DEFAULT 'ACTIVA'
                       CHECK (estado IN ('POR_REGISTRAR','ACTIVA','DESACTIVADA')),
  correo_verificado_en TIMESTAMPTZ,          -- NULL = «Pendiente de verificación» (M1-04)
  activado_en          TIMESTAMPTZ,          -- primer ingreso del profesor (M1-12)
  ultimo_ingreso_en    TIMESTAMPTZ,
  creado_por           BIGINT REFERENCES usuario(id),  -- NULL = autorregistro
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuario_documento_completo
    CHECK ((tipo_documento IS NULL) = (numero_documento IS NULL))
);
CREATE UNIQUE INDEX usuario_correo_uk    ON usuario (lower(correo));
CREATE UNIQUE INDEX usuario_documento_uk ON usuario (tipo_documento, numero_documento)
  WHERE numero_documento IS NOT NULL;
COMMENT ON TABLE usuario IS
  '[M1] Cuentas de acceso de todos los actores (M1-01, M1-05). Correo único sin distinguir mayúsculas. Estado POR_REGISTRAR → ACTIVA para profesores (M1-12). Nunca se borra: se pasa a DESACTIVADA.';
COMMENT ON COLUMN usuario.contrasena_hash IS 'Hash (bcrypt/argon2). Nunca la contraseña en claro.';

CREATE TABLE usuario_rol (
  usuario_id  BIGINT NOT NULL REFERENCES usuario(id),
  rol_id      BIGINT NOT NULL REFERENCES rol(id),
  asignado_por BIGINT REFERENCES usuario(id),
  asignado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, rol_id)
);
COMMENT ON TABLE usuario_rol IS
  '[M1] Roles asignados a cada usuario (M1-06). Quitar un rol borra la fila; el cambio queda en auditoria.';

CREATE TABLE token_usuario (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id),
  tipo       TEXT NOT NULL CHECK (tipo IN ('VERIFICACION_CORREO','RECUPERACION_CONTRASENA')),
  token_hash TEXT NOT NULL UNIQUE,
  expira_en  TIMESTAMPTZ NOT NULL,
  usado_en   TIMESTAMPTZ,                    -- un solo uso
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX token_usuario_usuario_idx ON token_usuario (usuario_id, tipo);
COMMENT ON TABLE token_usuario IS
  '[M1] Códigos o enlaces de un solo uso para verificar el correo (M1-04) y recuperar la contraseña (M1-08). Se guarda el hash, no el token.';

CREATE TABLE sesion (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id         BIGINT NOT NULL REFERENCES usuario(id),
  refresh_token_hash TEXT NOT NULL UNIQUE,
  ip                 INET,
  user_agent         TEXT,
  creada_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en          TIMESTAMPTZ NOT NULL,
  cerrada_en         TIMESTAMPTZ             -- cierre de sesión (M1-03)
);
CREATE INDEX sesion_usuario_idx ON sesion (usuario_id) WHERE cerrada_en IS NULL;
COMMENT ON TABLE sesion IS
  '[M1] Sesiones iniciadas (M1-02) y cerradas (M1-03). Permite invalidar el refresh token al cerrar sesión.';


-- =============================================================================
-- 2. M2 · GESTIÓN DEPORTIVA DE PATINADORES
-- =============================================================================

CREATE TABLE nivel (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,          -- Fundamentos, Intermedio, Avanzado…
  descripcion TEXT,
  orden       SMALLINT NOT NULL UNIQUE CHECK (orden > 0),
  activo      BOOLEAN NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE nivel IS
  '[M2] Niveles técnicos de patinaje, ordenados de menor a mayor (M2-05, M2-17). También los usan M3 (grupos por nivel) y M4 (ranking por nivel).';

CREATE TABLE categoria (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre          TEXT NOT NULL UNIQUE,      -- Infantil B, Prejuvenil, Juvenil A…
  edad_minima     SMALLINT NOT NULL CHECK (edad_minima >= 0),
  edad_maxima     SMALLINT CHECK (edad_maxima IS NULL OR edad_maxima >= edad_minima),
  nivel_minimo_id BIGINT REFERENCES nivel(id),
  genero          TEXT NOT NULL DEFAULT 'MIXTO' CHECK (genero IN ('FEMENINO','MASCULINO','MIXTO')),
  activo          BOOLEAN NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE categoria IS
  '[M2] Categorías del club por edad, nivel mínimo y género (M2-07, M2-17, M2-19). M4 asocia las pruebas de competencia a estas categorías (M4-03).';

CREATE TABLE patinador (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id        BIGINT UNIQUE REFERENCES usuario(id),  -- cuenta propia, si la tiene
  nombres           TEXT NOT NULL,
  apellidos         TEXT NOT NULL,
  tipo_documento    TEXT NOT NULL CHECK (tipo_documento IN ('CC','TI','RC','CE','PASAPORTE','OTRO')),
  numero_documento  TEXT NOT NULL,
  fecha_nacimiento  DATE NOT NULL CHECK (fecha_nacimiento > DATE '1900-01-01'),
  genero            TEXT NOT NULL CHECK (genero IN ('FEMENINO','MASCULINO')),
  telefono_contacto TEXT,
  activo            BOOLEAN NOT NULL DEFAULT true,
  creado_por        BIGINT REFERENCES usuario(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo_documento, numero_documento)
);
COMMENT ON TABLE patinador IS
  '[M2] Ficha del patinador (M2-01, M2-02, M2-03). Entidad central: la usan M1 (póliza, autorización), M3 (grupo), M4 (inscripciones) y M5 (planes y pagos). Menor de edad = menos de 18 años según fecha_nacimiento.';
COMMENT ON COLUMN patinador.genero IS 'Necesario para las categorías de competencia por género (M4-03).';

CREATE TABLE patinador_nivel (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id  BIGINT NOT NULL REFERENCES patinador(id),
  nivel_id      BIGINT NOT NULL REFERENCES nivel(id),
  desde         DATE NOT NULL DEFAULT current_date,
  hasta         DATE CHECK (hasta IS NULL OR hasta >= desde),  -- NULL = nivel actual
  evaluacion_id BIGINT,                      -- FK agregada después de crear evaluacion_nivel
  asignado_por  BIGINT REFERENCES usuario(id),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX patinador_nivel_actual_uk ON patinador_nivel (patinador_id) WHERE hasta IS NULL;
COMMENT ON TABLE patinador_nivel IS
  '[M2] Historial de niveles del patinador (M2-06, M2-10, M2-15, M2-20, M2-22). La fila con hasta NULL es el nivel actual; nunca se sobrescribe.';

CREATE TABLE patinador_categoria (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id BIGINT NOT NULL REFERENCES patinador(id),
  categoria_id BIGINT NOT NULL REFERENCES categoria(id),
  desde        DATE NOT NULL DEFAULT current_date,   -- fecha efectiva del cambio
  hasta        DATE CHECK (hasta IS NULL OR hasta >= desde),
  motivo       TEXT,
  propuesta_id BIGINT,                       -- FK agregada después de crear la propuesta
  asignado_por BIGINT REFERENCES usuario(id),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX patinador_categoria_actual_uk ON patinador_categoria (patinador_id) WHERE hasta IS NULL;
COMMENT ON TABLE patinador_categoria IS
  '[M2] Historial de categorías del patinador (M2-08, M2-09, M2-10, M2-18, M2-21, M2-22). La fila con hasta NULL es la categoría actual.';

CREATE TABLE evaluacion_nivel (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id     BIGINT NOT NULL REFERENCES patinador(id),
  profesor_id      BIGINT NOT NULL REFERENCES usuario(id),
  nivel_evaluado_id BIGINT NOT NULL REFERENCES nivel(id),
  resultado        TEXT NOT NULL CHECK (resultado IN ('APROBADO','EN_PROCESO','NO_APROBADO')),
  observacion      TEXT,
  fecha            DATE NOT NULL DEFAULT current_date,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX evaluacion_nivel_patinador_idx ON evaluacion_nivel (patinador_id, fecha DESC);
COMMENT ON TABLE evaluacion_nivel IS
  '[M2] Evaluaciones del nivel de conocimiento hechas por el profesor (M2-12).';

ALTER TABLE patinador_nivel
  ADD CONSTRAINT patinador_nivel_evaluacion_fk FOREIGN KEY (evaluacion_id) REFERENCES evaluacion_nivel(id);

CREATE TABLE habilidad (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nivel_id    BIGINT NOT NULL REFERENCES nivel(id),
  nombre      TEXT NOT NULL,                 -- Postura básica, Cruce en curva…
  descripcion TEXT,
  orden       SMALLINT NOT NULL DEFAULT 1,
  activo      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (nivel_id, nombre)
);
COMMENT ON TABLE habilidad IS
  '[M2] Catálogo de habilidades técnicas por nivel, base para registrar lo adquirido y lo pendiente (M2-13).';

CREATE TABLE patinador_habilidad (
  patinador_id   BIGINT NOT NULL REFERENCES patinador(id),
  habilidad_id   BIGINT NOT NULL REFERENCES habilidad(id),
  estado         TEXT NOT NULL CHECK (estado IN ('ADQUIRIDA','PENDIENTE')),
  evaluacion_id  BIGINT REFERENCES evaluacion_nivel(id),
  actualizado_por BIGINT REFERENCES usuario(id),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (patinador_id, habilidad_id)
);
COMMENT ON TABLE patinador_habilidad IS
  '[M2] Habilidades adquiridas y pendientes de cada patinador (M2-13).';

CREATE TABLE observacion_desempeno (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id           BIGINT NOT NULL REFERENCES patinador(id),
  profesor_id            BIGINT NOT NULL REFERENCES usuario(id),
  texto                  TEXT NOT NULL CHECK (length(trim(texto)) > 0),
  visible_para_patinador BOOLEAN NOT NULL DEFAULT false,
  fecha                  DATE NOT NULL DEFAULT current_date,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX observacion_desempeno_patinador_idx ON observacion_desempeno (patinador_id, fecha DESC);
COMMENT ON TABLE observacion_desempeno IS
  '[M2] Observaciones de desempeño del profesor (M2-14). El patinador solo las ve si visible_para_patinador y el parámetro del club lo permiten (M2-23).';

CREATE TABLE propuesta_cambio_categoria (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id           BIGINT NOT NULL REFERENCES patinador(id),
  categoria_actual_id    BIGINT NOT NULL REFERENCES categoria(id),
  categoria_propuesta_id BIGINT NOT NULL REFERENCES categoria(id),
  justificacion          TEXT NOT NULL,
  fecha_efectiva         DATE,
  estado                 TEXT NOT NULL DEFAULT 'PROPUESTA'
                         CHECK (estado IN ('PROPUESTA','APROBADA','RECHAZADA')),
  propuesta_por          BIGINT NOT NULL REFERENCES usuario(id),
  propuesta_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelta_por           BIGINT REFERENCES usuario(id),
  resuelta_en            TIMESTAMPTZ,
  CHECK (categoria_actual_id <> categoria_propuesta_id),
  CHECK ((estado = 'PROPUESTA') = (resuelta_en IS NULL))
);
COMMENT ON TABLE propuesta_cambio_categoria IS
  '[M2] Propuestas de cambio de categoría del profesor y su resolución por el Administrador (M2-09, M2-16). Al aprobarse se cierra la fila actual de patinador_categoria y se abre otra.';

ALTER TABLE patinador_categoria
  ADD CONSTRAINT patinador_categoria_propuesta_fk FOREIGN KEY (propuesta_id) REFERENCES propuesta_cambio_categoria(id);


-- =============================================================================
-- 3. M1 (continuación) · relaciones con el patinador
--    Son de M1, pero van aquí porque dependen de la tabla patinador (M2).
-- =============================================================================

CREATE TABLE acudiente_patinador (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  acudiente_id    BIGINT NOT NULL REFERENCES usuario(id),
  patinador_id    BIGINT NOT NULL REFERENCES patinador(id),
  parentesco      TEXT NOT NULL,             -- madre, padre, tutor legal…
  es_principal    BOOLEAN NOT NULL DEFAULT true,
  vinculado_por   BIGINT REFERENCES usuario(id),
  vinculado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  desvinculado_en TIMESTAMPTZ
);
CREATE UNIQUE INDEX acudiente_patinador_activo_uk ON acudiente_patinador (acudiente_id, patinador_id)
  WHERE desvinculado_en IS NULL;
CREATE INDEX acudiente_patinador_patinador_idx ON acudiente_patinador (patinador_id)
  WHERE desvinculado_en IS NULL;
COMMENT ON TABLE acudiente_patinador IS
  '[M1/M2] Vínculo acudiente ↔ patinador (M1-11 y M2-04, que describen la misma relación; ver punto abierto 4 de REQUIREMENTS §7). Base de la privacidad: el acudiente solo ve a sus patinadores (M5-17, M4-17). Desvincular llena desvinculado_en.';

CREATE TABLE autorizacion_acudiente (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id       BIGINT NOT NULL REFERENCES patinador(id),
  acudiente_id       BIGINT NOT NULL REFERENCES usuario(id),
  fecha_autorizacion DATE NOT NULL DEFAULT current_date,
  revocada_en        TIMESTAMPTZ,
  registrado_por     BIGINT REFERENCES usuario(id),
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX autorizacion_acudiente_vigente_uk ON autorizacion_acudiente (patinador_id)
  WHERE revocada_en IS NULL;
COMMENT ON TABLE autorizacion_acudiente IS
  '[M1] Autorización general del acudiente para que el menor participe (M1-09). Sin autorización vigente el perfil del menor queda Bloqueado (ver v_perfil_patinador).';

CREATE TABLE poliza (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id    BIGINT NOT NULL REFERENCES patinador(id),
  aseguradora     TEXT NOT NULL,
  numero_poliza   TEXT NOT NULL,
  vigente_desde   DATE NOT NULL,
  vigente_hasta   DATE NOT NULL,
  archivo_url     TEXT,                      -- adjunto (PDF o imagen)
  estado_revision TEXT NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado_revision IN ('PENDIENTE','APROBADA','RECHAZADA')),
  revisada_por    BIGINT REFERENCES usuario(id),   -- Fisioterapeuta (M4-07)
  revisada_en     TIMESTAMPTZ,
  motivo_rechazo  TEXT,
  registrado_por  BIGINT REFERENCES usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (vigente_hasta >= vigente_desde),
  CHECK (estado_revision <> 'RECHAZADA' OR motivo_rechazo IS NOT NULL),
  UNIQUE (aseguradora, numero_poliza, patinador_id)
);
CREATE INDEX poliza_patinador_idx ON poliza (patinador_id, vigente_hasta DESC);
COMMENT ON TABLE poliza IS
  '[M1] Pólizas médicas del patinador (M1-10). Se guardan todas: «reemplazar» agrega una nueva. M4-07 valida que haya una vigente. La revisión del Fisioterapeuta no tiene RF propio (REQUIREMENTS §7, punto 4); los campos de revisión quedan listos por si se confirma.';


-- =============================================================================
-- 4. M3 · GRUPOS, HORARIOS Y PROGRAMACIÓN
-- =============================================================================

CREATE TABLE sede (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         TEXT NOT NULL UNIQUE,
  direccion      TEXT NOT NULL,
  ciudad         TEXT NOT NULL DEFAULT 'Bogotá',
  telefono       TEXT,
  activa         BOOLEAN NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE sede IS '[M3] Sedes del club (M3-01).';

CREATE TABLE grupo (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre             TEXT NOT NULL,
  sede_id            BIGINT NOT NULL REFERENCES sede(id),
  nivel_id           BIGINT REFERENCES nivel(id),
  categoria_id       BIGINT REFERENCES categoria(id),
  frecuencia_semanal SMALLINT NOT NULL CHECK (frecuencia_semanal BETWEEN 1 AND 7),
  cupo_maximo        SMALLINT NOT NULL CHECK (cupo_maximo > 0),
  activo             BOOLEAN NOT NULL DEFAULT true,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sede_id, nombre)
);
COMMENT ON TABLE grupo IS
  '[M3] Grupos de entrenamiento con sede, nivel, frecuencia semanal y cupo (M3-02). La ocupación y la alerta del 90 % se calculan en v_ocupacion_grupo.';

CREATE TABLE grupo_profesor (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grupo_id       BIGINT NOT NULL REFERENCES grupo(id),
  profesor_id    BIGINT NOT NULL REFERENCES usuario(id),
  es_titular     BOOLEAN NOT NULL DEFAULT true,
  asignado_por   BIGINT REFERENCES usuario(id),
  asignado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  desasignado_en TIMESTAMPTZ
);
CREATE UNIQUE INDEX grupo_profesor_activo_uk ON grupo_profesor (grupo_id, profesor_id)
  WHERE desasignado_en IS NULL;
COMMENT ON TABLE grupo_profesor IS
  '[M3] Profesores asignados a cada grupo (M3-03). Solo profesores con cuenta activa (M1-12). Define qué patinadores ve cada profesor.';

CREATE TABLE horario (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grupo_id      BIGINT NOT NULL REFERENCES grupo(id),
  dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),  -- 1 = lunes (ISO)
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  vigente_desde DATE NOT NULL DEFAULT current_date,
  vigente_hasta DATE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (hora_fin > hora_inicio),
  CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);
CREATE INDEX horario_grupo_idx ON horario (grupo_id, dia_semana);
COMMENT ON TABLE horario IS
  '[M3] Franjas semanales de cada grupo (M3-04). Un cambio cierra la franja (vigente_hasta) y crea otra; se notifica con la tabla notificacion.';

CREATE TABLE patinador_grupo (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id     BIGINT NOT NULL REFERENCES patinador(id),
  grupo_id         BIGINT NOT NULL REFERENCES grupo(id),
  desde            DATE NOT NULL DEFAULT current_date,
  hasta            DATE CHECK (hasta IS NULL OR hasta >= desde),
  motivo_cambio    TEXT,
  solicitado_por   BIGINT REFERENCES usuario(id),   -- patinador mayor o acudiente (M3-05)
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX patinador_grupo_actual_uk ON patinador_grupo (patinador_id) WHERE hasta IS NULL;
CREATE INDEX patinador_grupo_grupo_idx ON patinador_grupo (grupo_id) WHERE hasta IS NULL;
COMMENT ON TABLE patinador_grupo IS
  '[M3] Matrícula del patinador en un grupo e historial de cambios (M3-05). Un grupo activo a la vez. El backend bloquea la matrícula si el grupo está lleno (M3-02) y si el menor no la hace por sí mismo.';

CREATE TABLE evento_calendario (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo      TEXT NOT NULL,
  descripcion TEXT,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ENTRENAMIENTO_ESPECIAL','REUNION','FESTIVO','CIERRE_SEDE','OTRO')),
  inicio      TIMESTAMPTZ NOT NULL,
  fin         TIMESTAMPTZ NOT NULL,
  sede_id     BIGINT REFERENCES sede(id),
  grupo_id    BIGINT REFERENCES grupo(id),   -- NULL = para toda la escuela
  creado_por  BIGINT REFERENCES usuario(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fin >= inicio)
);
CREATE INDEX evento_calendario_inicio_idx ON evento_calendario (inicio);
COMMENT ON TABLE evento_calendario IS
  '[M3] Eventos propios del calendario de la escuela (M3-06). El calendario integrado se arma con estos eventos, los horarios (M3-04) y las competencias publicadas (M4-04).';


-- =============================================================================
-- 5. M5 · PLANES, TARIFAS Y PAGOS
-- =============================================================================

CREATE TABLE plan (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre           TEXT NOT NULL UNIQUE,     -- Formación 3 días, Competencia 6 días…
  tipo             TEXT NOT NULL CHECK (tipo IN ('DIA_UNICO','TRES_DIAS','SEIS_DIAS','SEIS_DIAS_GIMNASIO')),
  dias_por_semana  SMALLINT CHECK (dias_por_semana BETWEEN 1 AND 7),
  incluye_gimnasio BOOLEAN NOT NULL DEFAULT false,
  periodicidad     TEXT NOT NULL CHECK (periodicidad IN ('MENSUAL','POR_SESION')),
  dia_limite_pago  SMALLINT CHECK (dia_limite_pago BETWEEN 1 AND 28),
  descripcion      TEXT,
  estado           TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
  desactivado_en   TIMESTAMPTZ,
  creado_por       BIGINT REFERENCES usuario(id),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- El plan de día único se cobra por sesión; los demás, mensual con día límite.
  CHECK ((tipo = 'DIA_UNICO') = (periodicidad = 'POR_SESION')),
  CHECK (periodicidad = 'POR_SESION' OR dia_limite_pago IS NOT NULL),
  CHECK ((estado = 'INACTIVO') = (desactivado_en IS NOT NULL))
);
COMMENT ON TABLE plan IS
  '[M5] Planes de servicio (M5-01, M5-02, M5-03, M5-05). El precio NO está aquí: va en tarifa. Un plan con patinadores o pagos no se borra, se desactiva (M5-03).';

CREATE TABLE tarifa (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id        BIGINT NOT NULL REFERENCES plan(id),
  valor          NUMERIC(14,2) NOT NULL CHECK (valor > 0),   -- COP; por mes o por sesión
  vigente_desde  DATE NOT NULL,
  registrado_por BIGINT NOT NULL REFERENCES usuario(id),
  registrado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, vigente_desde)
);
COMMENT ON TABLE tarifa IS
  '[M5] Historial de tarifas de cada plan con fecha de vigencia (M5-04). Nunca se edita: un cambio de precio es una fila nueva, con quién y cuándo (auditoría). La vigente está en v_tarifa_vigente.';

CREATE TABLE asignacion_plan (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id          BIGINT NOT NULL REFERENCES patinador(id),
  plan_id               BIGINT NOT NULL REFERENCES plan(id),
  fecha_inicio          DATE NOT NULL,
  fecha_fin             DATE CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  asignacion_anterior_id BIGINT REFERENCES asignacion_plan(id),  -- cambio de plan (M5-07)
  motivo_cambio         TEXT,
  asignado_por          BIGINT NOT NULL REFERENCES usuario(id),  -- Adm, acudiente o patinador mayor
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asignacion_plan_activa_uk ON asignacion_plan (patinador_id) WHERE fecha_fin IS NULL;
CREATE INDEX asignacion_plan_plan_idx ON asignacion_plan (plan_id) WHERE fecha_fin IS NULL;
COMMENT ON TABLE asignacion_plan IS
  '[M5] Plan asignado a cada patinador y su historial (M5-06, M5-07). Un plan activo a la vez (fecha_fin NULL). Cambiar de plan cierra la fila actual y crea otra enlazada.';

CREATE TABLE cobro (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id        BIGINT NOT NULL REFERENCES patinador(id),
  asignacion_plan_id  BIGINT REFERENCES asignacion_plan(id),
  tarifa_id           BIGINT REFERENCES tarifa(id),
  concepto            TEXT NOT NULL CHECK (concepto IN ('MENSUALIDAD','SESION','MATRICULA',
                                                        'GASTOS_ADMINISTRATIVOS','VENTA_UNIFORME')),
  periodo             DATE,                  -- primer día del mes cobrado (mensualidades)
  descripcion         TEXT,
  valor               NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  fecha_limite        DATE NOT NULL,
  estado              TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADO','ANULADO')),
  generado_automatico BOOLEAN NOT NULL DEFAULT false,
  anulado_en          TIMESTAMPTZ,
  motivo_anulacion    TEXT,
  creado_por          BIGINT REFERENCES usuario(id),   -- NULL si lo generó el sistema
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (concepto <> 'MENSUALIDAD' OR (periodo IS NOT NULL AND asignacion_plan_id IS NOT NULL)),
  CHECK (periodo IS NULL OR extract(day FROM periodo) = 1),
  CHECK ((estado = 'ANULADO') = (anulado_en IS NOT NULL)),
  CHECK (estado <> 'ANULADO' OR motivo_anulacion IS NOT NULL)
);
-- Evita generar dos veces la mensualidad del mismo mes (el proceso del día 1 es reintentable).
CREATE UNIQUE INDEX cobro_mensualidad_uk ON cobro (asignacion_plan_id, periodo)
  WHERE concepto = 'MENSUALIDAD' AND estado <> 'ANULADO';
CREATE INDEX cobro_patinador_idx ON cobro (patinador_id, estado, fecha_limite);
COMMENT ON TABLE cobro IS
  '[M5] Obligaciones de pago (M5-08). Las mensualidades las genera el sistema el día 1; también se registran sesiones, matrícula, gastos administrativos y venta de uniformes (M6-07). Estado PAGADO cuando los pagos aplicados cubren el valor; el saldo está en v_saldo_cobro.';

CREATE SEQUENCE comprobante_numero_seq START 1;

CREATE TABLE pago (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id     BIGINT NOT NULL REFERENCES patinador(id),
  tipo             TEXT NOT NULL CHECK (tipo IN ('COBRO','SESION','MATRICULA','VENTA_UNIFORME')),
  monto            NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha_pago       DATE NOT NULL,
  medio_pago       TEXT NOT NULL CHECK (medio_pago IN ('EFECTIVO','TRANSFERENCIA','CONSIGNACION')),
  referencia       TEXT,                     -- referencia de la transacción
  numero_sesiones  SMALLINT CHECK (numero_sesiones > 0),   -- solo pago por sesión (M5-10)
  estado           TEXT NOT NULL DEFAULT 'REGISTRADO' CHECK (estado IN ('REGISTRADO','ANULADO')),
  registrado_por   BIGINT NOT NULL REFERENCES usuario(id),
  registrado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  anulado_por      BIGINT REFERENCES usuario(id),
  anulado_en       TIMESTAMPTZ,
  motivo_anulacion TEXT,
  -- La fecha de pago no puede ser posterior al día en que se registra (REQUIREMENTS §5.3).
  CHECK (fecha_pago <= (registrado_en AT TIME ZONE 'America/Bogota')::date),
  CHECK (medio_pago = 'EFECTIVO' OR referencia IS NOT NULL),
  CHECK ((tipo = 'SESION') = (numero_sesiones IS NOT NULL)),
  CHECK ((estado = 'ANULADO') = (anulado_en IS NOT NULL AND anulado_por IS NOT NULL
                                 AND motivo_anulacion IS NOT NULL))
);
CREATE INDEX pago_patinador_idx ON pago (patinador_id, fecha_pago DESC);
CREATE INDEX pago_fecha_idx ON pago (fecha_pago, medio_pago, estado);
COMMENT ON TABLE pago IS
  '[M5] Pagos registrados manualmente por Administrador o Contador (M5-09, M5-10, M5-16). Sin pasarela de pagos. No se editan ni se borran: se anulan con motivo, solo el Administrador (M5-11). Los anulados no suman.';

CREATE TABLE pago_cobro (
  pago_id        BIGINT NOT NULL REFERENCES pago(id),
  cobro_id       BIGINT NOT NULL REFERENCES cobro(id),
  monto_aplicado NUMERIC(14,2) NOT NULL CHECK (monto_aplicado > 0),
  PRIMARY KEY (pago_id, cobro_id)
);
CREATE INDEX pago_cobro_cobro_idx ON pago_cobro (cobro_id);
COMMENT ON TABLE pago_cobro IS
  '[M5] Cómo se reparte cada pago entre cobros. Permite pagos parciales y un pago que cubre varios cobros (p. ej. matrícula + gastos administrativos). La suma por pago no debe superar pago.monto (lo valida el backend).';

CREATE TABLE comprobante (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pago_id     BIGINT NOT NULL UNIQUE REFERENCES pago(id),
  numero      TEXT NOT NULL UNIQUE
              DEFAULT 'CP-' || lpad(nextval('comprobante_numero_seq')::text, 6, '0'),
  emitido_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado      TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE','ANULADO')),
  anulado_en  TIMESTAMPTZ,
  archivo_url TEXT,                          -- PDF generado (M5-15, ≤ 5 s)
  CHECK ((estado = 'ANULADO') = (anulado_en IS NOT NULL))
);
ALTER SEQUENCE comprobante_numero_seq OWNED BY comprobante.numero;
COMMENT ON TABLE comprobante IS
  '[M5] Comprobante generado automáticamente por cada pago (M5-14), con consecutivo único CP-000001. Se descarga en PDF (M5-15). Al anular el pago el comprobante pasa a ANULADO (no es factura electrónica).';


-- =============================================================================
-- 6. M4 · COMPETENCIAS Y RESULTADOS
-- =============================================================================

CREATE TABLE competencia (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre                 TEXT NOT NULL,
  fecha_hora             TIMESTAMPTZ NOT NULL,
  lugar                  TEXT NOT NULL,
  tipo                   TEXT NOT NULL CHECK (tipo IN ('INTERNA','FEDERADA','FESTIVAL')),
  apertura_inscripciones TIMESTAMPTZ NOT NULL,
  cierre_inscripciones   TIMESTAMPTZ NOT NULL,
  estado                 TEXT NOT NULL DEFAULT 'BORRADOR'
                         CHECK (estado IN ('BORRADOR','PUBLICADA','CANCELADA','FINALIZADA')),
  publicada_en           TIMESTAMPTZ,
  cancelada_en           TIMESTAMPTZ,
  motivo_cancelacion     TEXT,
  creado_por             BIGINT NOT NULL REFERENCES usuario(id),
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (apertura_inscripciones < cierre_inscripciones),
  CHECK (cierre_inscripciones < fecha_hora),   -- REQUIREMENTS §5.3
  CHECK (estado <> 'CANCELADA' OR (cancelada_en IS NOT NULL AND motivo_cancelacion IS NOT NULL)),
  CHECK (estado = 'BORRADOR' OR publicada_en IS NOT NULL OR estado = 'CANCELADA')
);
CREATE INDEX competencia_fecha_idx ON competencia (fecha_hora);
COMMENT ON TABLE competencia IS
  '[M4] Competencias (M4-01), su publicación y apertura de inscripciones (M4-04), modificación y cancelación con motivo (M4-12). Con inscripciones no se borra: se cancela.';

CREATE TABLE prueba (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  competencia_id   BIGINT NOT NULL REFERENCES competencia(id),
  modalidad        TEXT NOT NULL CHECK (modalidad IN ('CONTRARRELOJ','PUNTOS','ELIMINACION','RELEVOS','VELOCIDAD','FONDO')),
  distancia_metros INTEGER NOT NULL CHECK (distancia_metros > 0),
  descripcion      TEXT,
  UNIQUE (competencia_id, modalidad, distancia_metros)
);
COMMENT ON TABLE prueba IS
  '[M4] Pruebas de una competencia por modalidad y distancia en metros (M4-02). La lista de modalidades es un supuesto; ajústenla con el Grupo 05.';

CREATE TABLE prueba_categoria (
  prueba_id    BIGINT NOT NULL REFERENCES prueba(id),
  categoria_id BIGINT NOT NULL REFERENCES categoria(id),
  genero       TEXT NOT NULL CHECK (genero IN ('FEMENINO','MASCULINO','MIXTO')),
  PRIMARY KEY (prueba_id, categoria_id, genero)
);
COMMENT ON TABLE prueba_categoria IS
  '[M4] Categorías de edad y género habilitadas en cada prueba (M4-03).';

CREATE TABLE preseleccion (
  competencia_id BIGINT NOT NULL REFERENCES competencia(id),
  patinador_id   BIGINT NOT NULL REFERENCES patinador(id),
  profesor_id    BIGINT NOT NULL REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competencia_id, patinador_id)
);
COMMENT ON TABLE preseleccion IS
  '[M4] Patinadores elegibles marcados por el profesor para una competencia (M4-05). Solo de sus grupos.';

CREATE TABLE sancion (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patinador_id   BIGINT NOT NULL REFERENCES patinador(id),
  motivo         TEXT NOT NULL,
  desde          DATE NOT NULL,
  hasta          DATE CHECK (hasta IS NULL OR hasta >= desde),  -- NULL = indefinida
  anulada_en     TIMESTAMPTZ,
  registrado_por BIGINT NOT NULL REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sancion_patinador_idx ON sancion (patinador_id, desde, hasta);
COMMENT ON TABLE sancion IS
  '[M4] Sanciones disciplinarias. M4-10 bloquea la inscripción si hay una activa, pero su registro no tiene RF propio (REQUIREMENTS §7, punto 4).';

CREATE TABLE inscripcion (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prueba_id                BIGINT NOT NULL REFERENCES prueba(id),
  patinador_id             BIGINT NOT NULL REFERENCES patinador(id),
  solicitada_por           BIGINT NOT NULL REFERENCES usuario(id),
  solicitada_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado                   TEXT NOT NULL DEFAULT 'EN_VALIDACION'
                           CHECK (estado IN ('EN_VALIDACION','APROBADA','RECHAZADA','ANULADA')),
  autorizada_por_acudiente BIGINT REFERENCES usuario(id),   -- M4-09 (menores)
  autorizada_en            TIMESTAMPTZ,
  resuelta_en              TIMESTAMPTZ,
  anulada_en               TIMESTAMPTZ,
  motivo_anulacion         TEXT,
  UNIQUE (prueba_id, patinador_id),
  CHECK ((autorizada_por_acudiente IS NULL) = (autorizada_en IS NULL)),
  CHECK (estado = 'EN_VALIDACION' OR resuelta_en IS NOT NULL OR estado = 'ANULADA'),
  CHECK (estado <> 'ANULADA' OR anulada_en IS NOT NULL)
);
CREATE INDEX inscripcion_patinador_idx ON inscripcion (patinador_id);
COMMENT ON TABLE inscripcion IS
  '[M4] Solicitud de inscripción a una prueba (M4-06) y su ratificación o rechazo automático (M4-11). Sin aprobación manual: la decide inscripcion_validacion.';

CREATE TABLE inscripcion_validacion (
  inscripcion_id BIGINT NOT NULL REFERENCES inscripcion(id),
  tipo           TEXT NOT NULL CHECK (tipo IN ('POLIZA','CARTERA','AUTORIZACION','SANCION')),
  aprobada       BOOLEAN NOT NULL,
  detalle        TEXT,                       -- causal legible si no aprueba
  validada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inscripcion_id, tipo)
);
COMMENT ON TABLE inscripcion_validacion IS
  '[M4] Resultado de las cuatro validaciones automáticas de cada inscripción: póliza (M4-07), cartera con v_estado_cartera de M5 (M4-08), autorización del acudiente (M4-09) y sanción (M4-10). Cada una no aprobada es una causal de rechazo (M4-11).';

CREATE TABLE resultado (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscripcion_id BIGINT NOT NULL UNIQUE REFERENCES inscripcion(id),
  tiempo_ms      INTEGER CHECK (tiempo_ms > 0),   -- se muestra como MM:SS.mmm
  no_finalizo    BOOLEAN NOT NULL DEFAULT false,
  puesto         SMALLINT CHECK (puesto > 0),
  puntos         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (puntos >= 0),
  observaciones  TEXT,
  registrado_por BIGINT NOT NULL REFERENCES usuario(id),
  registrado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (no_finalizo = (tiempo_ms IS NULL)),
  CHECK (NOT no_finalizo OR puesto IS NULL)
);
COMMENT ON TABLE resultado IS
  '[M4] Tiempo oficial en milisegundos de cada inscripción aprobada (M4-13). Base de la tabla de resultados (M4-14), el ranking por puntos (M4-15), los récords (M4-16), el historial (M4-17) y la exportación (M4-19). La regla de puntos por puesto la define M4.';

CREATE TABLE correccion_resultado (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resultado_id        BIGINT NOT NULL REFERENCES resultado(id),
  tiempo_anterior_ms  INTEGER,
  tiempo_nuevo_ms     INTEGER,
  no_finalizo_anterior BOOLEAN NOT NULL,
  no_finalizo_nuevo   BOOLEAN NOT NULL,
  motivo              TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  corregido_por       BIGINT NOT NULL REFERENCES usuario(id),
  corregido_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE correccion_resultado IS
  '[M4] Auditoría de correcciones de tiempos: valor anterior, valor nuevo, motivo obligatorio, usuario y fecha (M4-18).';


-- =============================================================================
-- 7. M6 · ADMINISTRACIÓN, REPORTES, FINANZAS E INVENTARIO
-- =============================================================================

CREATE TABLE personal (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id          BIGINT UNIQUE REFERENCES usuario(id),  -- cuenta y rol del sistema (M1)
  tipo_documento      TEXT NOT NULL CHECK (tipo_documento IN ('CC','CE','PASAPORTE','OTRO')),
  numero_documento    TEXT NOT NULL,
  nombres             TEXT NOT NULL,
  apellidos           TEXT NOT NULL,
  correo_institucional TEXT NOT NULL,
  telefono            TEXT,
  cargo               TEXT NOT NULL CHECK (cargo IN ('PROFESOR','CONTADOR','FISIOTERAPEUTA','ADMINISTRATIVO')),
  estado              TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
  fecha_ingreso       DATE NOT NULL DEFAULT current_date,
  fecha_retiro        DATE CHECK (fecha_retiro IS NULL OR fecha_retiro >= fecha_ingreso),
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo_documento, numero_documento),
  CHECK ((estado = 'INACTIVO') = (fecha_retiro IS NOT NULL))
);
CREATE UNIQUE INDEX personal_correo_uk ON personal (lower(correo_institucional));
COMMENT ON TABLE personal IS
  '[M6] Ficha laboral del personal (M6-02). Las credenciales y los roles siguen en usuario/usuario_rol (M1-05, M1-06); aquí solo los datos laborales. Desactivar conserva el histórico.';

CREATE TABLE proveedor (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  razon_social   TEXT NOT NULL,
  nit_documento  TEXT NOT NULL UNIQUE,
  correo         TEXT,
  telefono       TEXT,
  activo         BOOLEAN NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE proveedor IS '[M6] Proveedores de uniformes (M6-06).';

CREATE TABLE uniforme (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  referencia          TEXT NOT NULL UNIQUE,  -- UNI-CHA-10 (incluye la talla)
  tipo                TEXT NOT NULL CHECK (tipo IN ('CAMISETA','CHAQUETA','PANTALON','UNIFORME_COMPLETO')),
  talla               TEXT NOT NULL,
  proveedor_id        BIGINT REFERENCES proveedor(id),
  costo               NUMERIC(14,2) NOT NULL CHECK (costo >= 0),
  precio_venta        NUMERIC(14,2) NOT NULL CHECK (precio_venta >= 0),
  cantidad_disponible INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
  cantidad_minima     INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_minima >= 0),
  activo              BOOLEAN NOT NULL DEFAULT true,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, talla, proveedor_id)
);
COMMENT ON TABLE uniforme IS
  '[M6] Inventario de uniformes por referencia y talla (M6-06). cantidad_disponible >= 0 impide vender o prestar más de lo que hay. Alerta cuando disponible <= mínimo (v_stock_uniforme).';

CREATE TABLE venta_uniforme (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comprador_id   BIGINT NOT NULL REFERENCES usuario(id),   -- patinador o acudiente
  patinador_id   BIGINT REFERENCES patinador(id),
  fecha          DATE NOT NULL DEFAULT current_date,
  total          NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  cobro_id       BIGINT UNIQUE REFERENCES cobro(id),       -- asiento en M5 (concepto VENTA_UNIFORME)
  registrado_por BIGINT NOT NULL REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE venta_uniforme IS
  '[M6] Venta de uniformes (M6-07). M6 guarda el detalle comercial; el ingreso, el pago y el comprobante van a M5 mediante un cobro VENTA_UNIFORME (punto abierto 1 de grupo-06/trazabilidad.md).';

CREATE TABLE venta_detalle (
  venta_id       BIGINT NOT NULL REFERENCES venta_uniforme(id),
  uniforme_id    BIGINT NOT NULL REFERENCES uniforme(id),
  cantidad       INTEGER NOT NULL CHECK (cantidad > 0),
  valor_unitario NUMERIC(14,2) NOT NULL CHECK (valor_unitario >= 0),
  subtotal       NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * valor_unitario) STORED,
  PRIMARY KEY (venta_id, uniforme_id)
);
COMMENT ON TABLE venta_detalle IS '[M6] Ítems de cada venta de uniformes (M6-07).';

CREATE TABLE prestamo_uniforme (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uniforme_id                BIGINT NOT NULL REFERENCES uniforme(id),
  patinador_id               BIGINT NOT NULL REFERENCES patinador(id),
  responsable_id             BIGINT NOT NULL REFERENCES usuario(id),  -- acudiente o patinador
  cantidad                   INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  fecha_prestamo             DATE NOT NULL DEFAULT current_date,
  fecha_devolucion_prevista  DATE NOT NULL,
  estado_entrega             TEXT NOT NULL CHECK (estado_entrega IN ('NUEVO','BUEN_ESTADO','CON_DESGASTE')),
  estado                     TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','DEVUELTO','PERDIDA_DANO')),
  fecha_recepcion            DATE,
  estado_recepcion           TEXT CHECK (estado_recepcion IN ('BUEN_ESTADO','CON_DESGASTE','DANADO')),
  observacion                TEXT,
  registrado_por             BIGINT NOT NULL REFERENCES usuario(id),
  creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_devolucion_prevista >= fecha_prestamo),
  CHECK ((estado = 'ACTIVO') = (fecha_recepcion IS NULL)),
  CHECK (estado <> 'PERDIDA_DANO' OR observacion IS NOT NULL)
);
CREATE INDEX prestamo_uniforme_activo_idx ON prestamo_uniforme (fecha_devolucion_prevista) WHERE estado = 'ACTIVO';
COMMENT ON TABLE prestamo_uniforme IS
  '[M6] Préstamo y devolución de uniformes (M6-08). «Vencido» no se guarda: es ACTIVO con fecha_devolucion_prevista pasada (v_prestamo_uniforme). Pérdida o daño exige observación justificativa.';

CREATE TABLE movimiento_inventario (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uniforme_id        BIGINT NOT NULL REFERENCES uniforme(id),
  tipo               TEXT NOT NULL CHECK (tipo IN ('ENTRADA','VENTA','PRESTAMO','DEVOLUCION','BAJA','AJUSTE')),
  cantidad           INTEGER NOT NULL CHECK (cantidad <> 0),   -- negativo = sale del stock
  venta_id           BIGINT REFERENCES venta_uniforme(id),
  prestamo_id        BIGINT REFERENCES prestamo_uniforme(id),
  observacion        TEXT,
  registrado_por     BIGINT NOT NULL REFERENCES usuario(id),
  registrado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movimiento_inventario_fecha_idx ON movimiento_inventario (registrado_en);
COMMENT ON TABLE movimiento_inventario IS
  '[M6] Kardex de uniformes: cada entrada, venta, préstamo, devolución o baja (M6-06, M6-07, M6-08). Alimenta el reporte «Movimientos de inventario» (M6-04).';


-- =============================================================================
-- 0. TRANSVERSAL (continuación): auditoría y notificaciones
-- =============================================================================

CREATE TABLE auditoria (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  modulo         TEXT NOT NULL CHECK (modulo IN ('M1','M2','M3','M4','M5','M6')),
  tabla          TEXT NOT NULL,
  registro_id    BIGINT NOT NULL,
  accion         TEXT NOT NULL,              -- CREAR, ACTUALIZAR, DESACTIVAR, ANULAR, ASIGNAR_ROL…
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  motivo         TEXT,
  usuario_id     BIGINT REFERENCES usuario(id),   -- NULL = proceso del sistema
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_registro_idx ON auditoria (tabla, registro_id, creado_en DESC);
COMMENT ON TABLE auditoria IS
  '[Transversal] Bitácora de cambios sensibles con usuario, fecha y motivo (regla de negocio 6): tarifas (M5-04), anulaciones (M5-11), roles (M1-06), cancelación de competencias (M4-12), pérdidas de uniforme (M6-08). Solo inserción.';

CREATE TABLE notificacion (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuario(id),
  modulo      TEXT NOT NULL CHECK (modulo IN ('M1','M2','M3','M4','M5','M6')),
  titulo      TEXT NOT NULL,
  mensaje     TEXT NOT NULL,
  entidad     TEXT,                          -- p. ej. competencia, horario, cobro
  entidad_id  BIGINT,
  leida_en    TIMESTAMPTZ,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notificacion_usuario_idx ON notificacion (usuario_id, creada_en DESC) WHERE leida_en IS NULL;
COMMENT ON TABLE notificacion IS
  '[Transversal] Notificaciones a usuarios: cambios de horario (M3-04), modificación o cancelación de competencias (M4-12). No tienen RF propio (REQUIREMENTS §7, punto 4).';


-- =============================================================================
-- 8. VISTAS (datos derivados; no se guardan para que no se desincronicen)
-- =============================================================================

-- [M5] Tarifa vigente hoy por plan (M5-05).
CREATE VIEW v_tarifa_vigente AS
SELECT DISTINCT ON (t.plan_id)
       t.plan_id, t.id AS tarifa_id, t.valor, t.vigente_desde
FROM tarifa t
WHERE t.vigente_desde <= current_date
ORDER BY t.plan_id, t.vigente_desde DESC;
COMMENT ON VIEW v_tarifa_vigente IS '[M5] Tarifa vigente de cada plan a la fecha actual (M5-05).';

-- [M5] Valor pagado y saldo de cada cobro, contando solo pagos no anulados.
CREATE VIEW v_saldo_cobro AS
SELECT c.id AS cobro_id, c.patinador_id, c.concepto, c.periodo, c.valor, c.fecha_limite, c.estado,
       COALESCE(sum(pc.monto_aplicado) FILTER (WHERE p.estado = 'REGISTRADO'), 0) AS pagado,
       c.valor - COALESCE(sum(pc.monto_aplicado) FILTER (WHERE p.estado = 'REGISTRADO'), 0) AS saldo,
       -- Primer día en mora: fecha límite + días de gracia + 1 (límite día 5 y 4 de gracia → día 10).
       c.fecha_limite + 1 + COALESCE(
         (SELECT valor::int FROM parametro_sistema WHERE clave = 'dias_gracia_mora'), 0) AS vencido_desde
FROM cobro c
LEFT JOIN pago_cobro pc ON pc.cobro_id = c.id
LEFT JOIN pago p        ON p.id = pc.pago_id
GROUP BY c.id;
COMMENT ON VIEW v_saldo_cobro IS '[M5] Pagado, saldo y fecha desde la que el cobro queda en mora (M5-09, M5-12, M5-13). Los pagos anulados no suman (M5-11).';

-- [M5] Estado de cartera por patinador (M5-12). Vencido prevalece sobre Pendiente.
CREATE VIEW v_estado_cartera AS
SELECT pt.id AS patinador_id,
       COALESCE(sum(s.saldo), 0)                                       AS saldo_pendiente,
       count(*) FILTER (WHERE s.vencido_desde <= current_date)        AS cobros_vencidos,
       min(s.fecha_limite)                                             AS vencimiento_mas_antiguo,
       CASE
         WHEN count(*) FILTER (WHERE s.vencido_desde <= current_date) > 0 THEN 'VENCIDO'
         WHEN count(s.cobro_id) > 0                                      THEN 'PENDIENTE'
         ELSE 'AL_DIA'
       END                                                             AS estado
FROM patinador pt
LEFT JOIN v_saldo_cobro s
       ON s.patinador_id = pt.id AND s.estado <> 'ANULADO' AND s.saldo > 0
GROUP BY pt.id;
COMMENT ON VIEW v_estado_cartera IS
  '[M5] Estado de cartera Al día / Pendiente / Vencido por patinador (M5-12, M5-13, M5-17, M5-18). M4 la consulta para validar inscripciones (M4-08): VENCIDO bloquea.';

-- [M1] Perfil del patinador: menor de edad bloqueado si falta autorización o póliza vigente.
CREATE VIEW v_perfil_patinador AS
SELECT pt.id AS patinador_id,
       date_part('year', age(current_date, pt.fecha_nacimiento))::int AS edad,
       (age(current_date, pt.fecha_nacimiento) < interval '18 years') AS es_menor,
       EXISTS (SELECT 1 FROM autorizacion_acudiente a
               WHERE a.patinador_id = pt.id AND a.revocada_en IS NULL)  AS tiene_autorizacion,
       EXISTS (SELECT 1 FROM poliza po
               WHERE po.patinador_id = pt.id AND po.estado_revision <> 'RECHAZADA'
                 AND current_date BETWEEN po.vigente_desde AND po.vigente_hasta) AS tiene_poliza_vigente,
       CASE
         WHEN age(current_date, pt.fecha_nacimiento) >= interval '18 years' THEN 'HABILITADO'
         WHEN EXISTS (SELECT 1 FROM autorizacion_acudiente a
                      WHERE a.patinador_id = pt.id AND a.revocada_en IS NULL)
          AND EXISTS (SELECT 1 FROM poliza po
                      WHERE po.patinador_id = pt.id AND po.estado_revision <> 'RECHAZADA'
                        AND current_date BETWEEN po.vigente_desde AND po.vigente_hasta) THEN 'HABILITADO'
         ELSE 'BLOQUEADO'
       END AS estado_perfil
FROM patinador pt;
COMMENT ON VIEW v_perfil_patinador IS
  '[M1] Edad, autorización, póliza vigente y estado Bloqueado/Habilitado del perfil (M1-09, M1-10). M4 la usa para validar póliza y autorización (M4-07, M4-09).';

-- [M3] Ocupación de cada grupo y alerta de aforo.
CREATE VIEW v_ocupacion_grupo AS
SELECT g.id AS grupo_id, g.cupo_maximo,
       count(pg.id) AS inscritos,
       round(100.0 * count(pg.id) / g.cupo_maximo, 1) AS porcentaje,
       CASE
         WHEN count(pg.id) >= g.cupo_maximo THEN 'LLENO'
         WHEN 100.0 * count(pg.id) / g.cupo_maximo >=
              COALESCE((SELECT valor::numeric FROM parametro_sistema WHERE clave = 'alerta_aforo_porcentaje'), 90)
           THEN 'ALERTA'
         ELSE 'CON_CUPO'
       END AS estado_cupo
FROM grupo g
LEFT JOIN patinador_grupo pg ON pg.grupo_id = g.id AND pg.hasta IS NULL
GROUP BY g.id;
COMMENT ON VIEW v_ocupacion_grupo IS '[M3] Inscritos, porcentaje y estado Con cupo / Alerta (90 %) / Lleno de cada grupo (M3-02).';

-- [M4] Mejor marca personal por patinador, modalidad y distancia.
CREATE VIEW v_record_personal AS
SELECT i.patinador_id, pr.modalidad, pr.distancia_metros,
       min(r.tiempo_ms) AS mejor_tiempo_ms,
       count(*)         AS participaciones
FROM resultado r
JOIN inscripcion i ON i.id = r.inscripcion_id
JOIN prueba pr     ON pr.id = i.prueba_id
WHERE NOT r.no_finalizo
GROUP BY i.patinador_id, pr.modalidad, pr.distancia_metros;
COMMENT ON VIEW v_record_personal IS '[M4] Récord personal por modalidad y distancia (M4-16).';

-- [M6] Stock de uniformes con alerta de mínimo.
CREATE VIEW v_stock_uniforme AS
SELECT u.id AS uniforme_id, u.referencia, u.tipo, u.talla,
       u.cantidad_disponible, u.cantidad_minima,
       CASE WHEN u.cantidad_disponible <= u.cantidad_minima THEN 'ALERTA_MINIMO' ELSE 'STOCK_NORMAL' END AS estado_stock
FROM uniforme u
WHERE u.activo;
COMMENT ON VIEW v_stock_uniforme IS '[M6] Estado de stock Normal / Alerta por cantidad mínima (M6-06).';

-- [M6] Préstamos con el estado derivado «Vencido».
CREATE VIEW v_prestamo_uniforme AS
SELECT p.*,
       CASE WHEN p.estado = 'ACTIVO' AND p.fecha_devolucion_prevista < current_date
            THEN 'VENCIDO' ELSE p.estado END AS estado_actual
FROM prestamo_uniforme p;
COMMENT ON VIEW v_prestamo_uniforme IS '[M6] Préstamos con estado Activo / Vencido / Devuelto / Pérdida o daño (M6-08).';


-- -----------------------------------------------------------------------------
-- Trigger de actualizado_en en todas las tablas que tienen esa columna.
-- -----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'actualizado_en'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en()',
                   'trg_' || t || '_actualizado_en', t);
  END LOOP;
END;
$$;


-- =============================================================================
-- 9. DATOS SEMILLA (solo catálogos cerrados que no dependen de ningún grupo)
-- =============================================================================

INSERT INTO rol (codigo, nombre, descripcion) VALUES
  ('ADMINISTRADOR',  'Administrador',  'Gestiona toda la operación de la escuela'),
  ('PROFESOR',       'Profesor',       'Entrena, evalúa y propone cambios de categoría'),
  ('PATINADOR',      'Patinador',      'Consulta su progreso; gestiona solo si es mayor de edad'),
  ('ACUDIENTE',      'Acudiente',      'Actúa por el patinador menor de edad'),
  ('CONTADOR',       'Contador',       'Consulta financiera, registro de pagos y reportes'),
  ('FISIOTERAPEUTA', 'Fisioterapeuta', 'Interviene en la validación de la póliza médica'),
  ('VISITANTE',      'Visitante',      'Solo información general, sin datos de patinadores');

INSERT INTO parametro_sistema (clave, valor, descripcion) VALUES
  ('alerta_aforo_porcentaje',          '90',    'M3-02: % de ocupación que dispara la alerta del grupo'),
  ('dia_generacion_cobros',            '1',     'M5-08: día del mes en que se generan las mensualidades'),
  ('dias_gracia_mora',                 '4',     'M5-12: días después de la fecha límite antes de pasar a Vencido (límite día 5 → vencido desde el día 10)'),
  ('observaciones_visibles_patinador', 'false', 'M2-23: si el club permite al patinador ver las observaciones'),
  ('zona_horaria',                     'America/Bogota', 'Zona horaria del club');

-- Permisos de M5 y M6 (los demás módulos agregan los suyos con el mismo formato).
INSERT INTO permiso (codigo, modulo, descripcion) VALUES
  ('M5_PLAN_GESTIONAR',        'M5', 'Crear, editar y desactivar planes; registrar tarifas (M5-01 a M5-04)'),
  ('M5_PLAN_CONSULTAR',        'M5', 'Consultar planes y tarifas vigentes (M5-05)'),
  ('M5_PLAN_ASIGNAR',          'M5', 'Asignar o cambiar el plan de un patinador (M5-06, M5-07)'),
  ('M5_PAGO_REGISTRAR',        'M5', 'Registrar pagos de cobros y por sesión (M5-09, M5-10)'),
  ('M5_PAGO_ANULAR',           'M5', 'Anular un pago con motivo (M5-11)'),
  ('M5_CARTERA_CONSULTAR',     'M5', 'Consultar la cartera de todos los patinadores (M5-13)'),
  ('M5_PAGO_HISTORIAL',        'M5', 'Consultar el historial de pagos (M5-16)'),
  ('M5_COMPROBANTE_DESCARGAR', 'M5', 'Descargar comprobantes de pago (M5-15)'),
  ('M5_COBRO_GENERAR',         'M5', 'Lanzar o recuperar la generación de mensualidades (M5-08)'),
  ('M6_REPORTE_FINANCIERO',    'M6', 'Generar y exportar reportes financieros (M6-04, M6-05)'),
  ('M6_PERSONAL_GESTIONAR',    'M6', 'Registrar y administrar personal (M6-02, M6-03)'),
  ('M6_INVENTARIO_GESTIONAR',  'M6', 'Inventario, ventas y préstamos de uniformes (M6-06 a M6-08)');

-- Administrador: todos los permisos cargados.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p WHERE r.codigo = 'ADMINISTRADOR';

-- Contador (M6-03): registra pagos, consulta y exporta; NO anula pagos ni gestiona inventario o personal.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo IN
  ('M5_PLAN_CONSULTAR','M5_PAGO_REGISTRAR','M5_CARTERA_CONSULTAR','M5_PAGO_HISTORIAL',
   'M5_COMPROBANTE_DESCARGAR','M6_REPORTE_FINANCIERO')
WHERE r.codigo = 'CONTADOR';

-- Acudiente y patinador: consultan planes y comprobantes propios; asignan plan (el backend
-- impide que un menor lo haga por sí mismo, M5-06).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo IN
  ('M5_PLAN_CONSULTAR','M5_PLAN_ASIGNAR','M5_COMPROBANTE_DESCARGAR')
WHERE r.codigo IN ('ACUDIENTE','PATINADOR');

COMMIT;
