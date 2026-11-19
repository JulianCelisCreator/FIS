-- =============================================================================
-- Datos de demostración de M5 (Grupo 04), con los nombres de los wireframes.
-- Se cargan a mano sobre una base recién creada; no los carga el contenedor:
--
--   docker exec -i patinaje-db psql -U patinaje -d patinaje < db/datos-demo.sql
--
-- Las fechas son relativas al mes actual para que la demo siempre tenga sentido.
-- Usuarios (ingresan en /app/ con su correo y la contraseña Velora2026):
--   Andrea López (Administradora) · Martha Gómez (Contadora)
--   Carolina Torres (Acudiente de Sofía y Mateo) · Luis Herrera (Acudiente de Samuel)
--   Juan Pablo González (Patinador mayor) · Sofía Ramírez Torres (Patinadora menor)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  mes_actual   date := date_trunc('month', current_date)::date;
  mes_anterior date := (date_trunc('month', current_date) - interval '1 month')::date;
  hace_dos     date := (date_trunc('month', current_date) - interval '2 months')::date;

  u_andrea bigint; u_martha bigint; u_carolina bigint; u_luis bigint;
  u_juan bigint;   u_sofia bigint;
  -- Contraseña de todos los usuarios demo: Velora2026 (hash scrypt, ver m1-usuarios-acceso/utils/contrasena.ts).
  clave_demo text := 'scrypt$16384$8$1$htSWvut4WlWb0zwCPaPFIA==$+Elg9ogTo6L9e57jxLeb6SF7/r6iJeO3NBKbGQQV35XRcUEiLLq0LSWSXyLskG1GPQLYaAlK3yk5MTf6vXXGCQ==';
  p_sofia bigint;  p_mateo bigint; p_samuel bigint; p_juan bigint; p_valentina bigint;
  pl_clase bigint; pl_formacion bigint; pl_competencia bigint; pl_alto bigint; pl_viejo bigint;
  t_formacion bigint; t_competencia bigint;
  a_sofia bigint; a_samuel bigint;
  c_id bigint; c2_id bigint; pago_id bigint;
  pat bigint;
BEGIN
  -- Usuarios ---------------------------------------------------------------
  INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, correo_verificado_en)
  VALUES ('Andrea', 'López', 'andrea.lopez@escuela.com', clave_demo, now()) RETURNING id INTO u_andrea;
  INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, correo_verificado_en)
  VALUES ('Martha', 'Gómez', 'martha.gomez@escuela.com', clave_demo, now()) RETURNING id INTO u_martha;
  INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, correo_verificado_en)
  VALUES ('Carolina', 'Torres', 'carolina.torres@example.com', clave_demo, now()) RETURNING id INTO u_carolina;
  INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, correo_verificado_en)
  VALUES ('Luis', 'Herrera', 'luis.herrera@example.com', clave_demo, now()) RETURNING id INTO u_luis;
  INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, correo_verificado_en)
  VALUES ('Juan Pablo', 'González', 'juan.gonzalez@example.com', clave_demo, now()) RETURNING id INTO u_juan;
  INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, correo_verificado_en)
  VALUES ('Sofía', 'Ramírez Torres', 'sofia.ramirez@example.com', clave_demo, now()) RETURNING id INTO u_sofia;

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT x.u, r.id FROM (VALUES
    (u_andrea, 'ADMINISTRADOR'), (u_martha, 'CONTADOR'),
    (u_carolina, 'ACUDIENTE'), (u_luis, 'ACUDIENTE'),
    (u_juan, 'PATINADOR'), (u_sofia, 'PATINADOR')) AS x(u, codigo)
  JOIN rol r ON r.codigo = x.codigo;

  -- Patinadores ------------------------------------------------------------
  INSERT INTO patinador (usuario_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, creado_por)
  VALUES (u_sofia, 'Sofía', 'Ramírez Torres', 'TI', '1023456789', current_date - interval '12 years 3 months', 'FEMENINO', u_andrea)
  RETURNING id INTO p_sofia;
  INSERT INTO patinador (nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, creado_por)
  VALUES ('Mateo', 'Ramírez Torres', 'TI', '1034567890', current_date - interval '9 years 2 months', 'MASCULINO', u_andrea)
  RETURNING id INTO p_mateo;
  INSERT INTO patinador (nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, creado_por)
  VALUES ('Samuel', 'Herrera Díaz', 'TI', '1045678901', current_date - interval '14 years 5 months', 'MASCULINO', u_andrea)
  RETURNING id INTO p_samuel;
  INSERT INTO patinador (usuario_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, creado_por)
  VALUES (u_juan, 'Juan Pablo', 'González', 'CC', '1012345678', current_date - interval '22 years', 'MASCULINO', u_andrea)
  RETURNING id INTO p_juan;
  INSERT INTO patinador (nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, creado_por)
  VALUES ('Valentina', 'Ruiz', 'TI', '1056789012', current_date - interval '8 years', 'FEMENINO', u_andrea)
  RETURNING id INTO p_valentina;  -- sin acudiente: no se le puede asignar plan

  INSERT INTO acudiente_patinador (acudiente_id, patinador_id, parentesco, vinculado_por) VALUES
    (u_carolina, p_sofia, 'madre', u_andrea),
    (u_carolina, p_mateo, 'madre', u_andrea),
    (u_luis, p_samuel, 'padre', u_andrea);

  -- Planes y tarifas (planes.html) -----------------------------------------
  INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, descripcion, creado_por)
  VALUES ('Clase suelta', 'DIA_UNICO', NULL, 'POR_SESION', 'Asistes el día que quieras. Pagas en la sede cada vez que vienes.', u_andrea)
  RETURNING id INTO pl_clase;
  INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, dia_limite_pago, creado_por)
  VALUES ('Formación 3 días', 'TRES_DIAS', 3, 'MENSUAL', 5, u_andrea) RETURNING id INTO pl_formacion;
  INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, dia_limite_pago, creado_por)
  VALUES ('Competencia 6 días', 'SEIS_DIAS', 6, 'MENSUAL', 5, u_andrea) RETURNING id INTO pl_competencia;
  INSERT INTO plan (nombre, tipo, dias_por_semana, incluye_gimnasio, periodicidad, dia_limite_pago, descripcion, creado_por)
  VALUES ('Alto rendimiento', 'SEIS_DIAS_GIMNASIO', 6, true, 'MENSUAL', 5, 'Incluye acceso al gimnasio.', u_andrea)
  RETURNING id INTO pl_alto;
  INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, dia_limite_pago, estado, desactivado_en, creado_por)
  VALUES ('Formación 3 días (2025)', 'TRES_DIAS', 3, 'MENSUAL', 15, 'INACTIVO', now(), u_andrea)
  RETURNING id INTO pl_viejo;

  INSERT INTO tarifa (plan_id, valor, vigente_desde, registrado_por) VALUES
    (pl_clase, 35000, '2026-02-01', u_andrea),
    (pl_formacion, 165000, '2025-02-01', u_andrea),
    (pl_competencia, 300000, '2026-02-01', u_andrea),
    (pl_alto, 380000, '2026-07-01', u_andrea),
    (pl_viejo, 160000, '2025-01-01', u_andrea);
  INSERT INTO tarifa (plan_id, valor, vigente_desde, registrado_por)
  VALUES (pl_formacion, 180000, '2026-02-01', u_andrea) RETURNING id INTO t_formacion;
  SELECT id INTO t_competencia FROM tarifa WHERE plan_id = pl_competencia;

  -- Matrícula y gastos pagados (Sofía, Samuel y Juan Pablo) ----------------
  FOREACH pat IN ARRAY ARRAY[p_sofia, p_samuel, p_juan] LOOP
    INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, registrado_por)
    VALUES (pat, 'MATRICULA', 165000, hace_dos, 'EFECTIVO', u_martha) RETURNING id INTO pago_id;
    INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
    VALUES (pat, 'MATRICULA', 'Matrícula', 120000, hace_dos, 'PAGADO', u_martha) RETURNING id INTO c_id;
    INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
    VALUES (pat, 'GASTOS_ADMINISTRATIVOS', 'Gastos administrativos', 45000, hace_dos, 'PAGADO', u_martha) RETURNING id INTO c2_id;
    INSERT INTO pago_cobro VALUES (pago_id, c_id, 120000), (pago_id, c2_id, 45000);
    INSERT INTO comprobante (pago_id) VALUES (pago_id);
  END LOOP;

  -- Sofía: Formación 3 días; mes anterior pagado, mes actual pendiente -----
  INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
  VALUES (p_sofia, pl_formacion, hace_dos, u_carolina) RETURNING id INTO a_sofia;
  INSERT INTO cobro (patinador_id, asignacion_plan_id, tarifa_id, concepto, periodo, descripcion, valor, fecha_limite, estado, generado_automatico)
  VALUES (p_sofia, a_sofia, t_formacion, 'MENSUALIDAD', mes_anterior,
          'Mensualidad Formación 3 días ' || to_char(mes_anterior, 'MM/YYYY'), 180000, mes_anterior + 4, 'PAGADO', true)
  RETURNING id INTO c_id;
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, referencia, registrado_por)
  VALUES (p_sofia, 'COBRO', 180000, mes_anterior + 3, 'TRANSFERENCIA', 'TRX-88213', u_martha) RETURNING id INTO pago_id;
  INSERT INTO pago_cobro VALUES (pago_id, c_id, 180000);
  INSERT INTO comprobante (pago_id) VALUES (pago_id);
  INSERT INTO cobro (patinador_id, asignacion_plan_id, tarifa_id, concepto, periodo, descripcion, valor, fecha_limite, generado_automatico)
  VALUES (p_sofia, a_sofia, t_formacion, 'MENSUALIDAD', mes_actual,
          'Mensualidad Formación 3 días ' || to_char(mes_actual, 'MM/YYYY'), 180000, mes_actual + 4, true);

  -- Samuel: Competencia 6 días; mes anterior en mora, mes actual con abono -
  INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
  VALUES (p_samuel, pl_competencia, hace_dos, u_luis) RETURNING id INTO a_samuel;
  INSERT INTO cobro (patinador_id, asignacion_plan_id, tarifa_id, concepto, periodo, descripcion, valor, fecha_limite, generado_automatico)
  VALUES (p_samuel, a_samuel, t_competencia, 'MENSUALIDAD', mes_anterior,
          'Mensualidad Competencia 6 días ' || to_char(mes_anterior, 'MM/YYYY'), 300000, mes_anterior + 4, true);
  INSERT INTO cobro (patinador_id, asignacion_plan_id, tarifa_id, concepto, periodo, descripcion, valor, fecha_limite, generado_automatico)
  VALUES (p_samuel, a_samuel, t_competencia, 'MENSUALIDAD', mes_actual,
          'Mensualidad Competencia 6 días ' || to_char(mes_actual, 'MM/YYYY'), 300000, mes_actual + 4, true)
  RETURNING id INTO c_id;
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, registrado_por)
  VALUES (p_samuel, 'COBRO', 150000, mes_actual, 'EFECTIVO', u_martha) RETURNING id INTO pago_id;
  INSERT INTO pago_cobro VALUES (pago_id, c_id, 150000);
  INSERT INTO comprobante (pago_id) VALUES (pago_id);

  -- Juan Pablo: Clase suelta (pago por sesión) -----------------------------
  INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
  VALUES (p_juan, pl_clase, hace_dos, u_juan);
END;
$$;

COMMIT;
