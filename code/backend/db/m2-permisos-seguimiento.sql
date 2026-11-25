-- Permisos del seguimiento deportivo de M2 (RF-M2-07 a RF-M2-23).
-- Ejecutar una vez después de schema.sql. Es idempotente y no toca db/m2-permisos.sql
-- (perfiles, niveles y acudientes, PR #44 a #47).
BEGIN;
INSERT INTO permiso (codigo, modulo, descripcion) VALUES
  ('M2_CATEGORIA_GESTIONAR',        'M2', 'Crear, editar e inactivar categorías del club (RF-M2-07)'),
  ('M2_CATEGORIA_CONSULTAR',        'M2', 'Consultar el catálogo de categorías y niveles del club (RF-M2-17, RF-M2-19)'),
  ('M2_ASIGNACION_GESTIONAR',       'M2', 'Asignar patinadores a categorías, cambiarlas y resolver propuestas (RF-M2-08, RF-M2-09, RF-M2-16)'),
  ('M2_CATEGORIA_PROPONER',         'M2', 'Proponer el cambio de categoría de un patinador (RF-M2-16)'),
  ('M2_CATEGORIA_PROMOVER_DIRECTO', 'M2', 'Ejecutar el cambio de categoría sin aprobación; el administrador lo concede por rol (RF-M2-16)'),
  ('M2_CATEGORIA_ACTUAL_CONSULTAR', 'M2', 'Consultar la categoría actual propia o de los patinadores a cargo (RF-M2-18, RF-M2-21)'),
  ('M2_HISTORIAL_CONSULTAR',        'M2', 'Consultar el historial de niveles y categorías (RF-M2-10, RF-M2-15, RF-M2-22)'),
  ('M2_ENTRENAMIENTO_CONSULTAR',    'M2', 'Consultar la información de entrenamiento de los patinadores asignados (RF-M2-11)'),
  ('M2_SEGUIMIENTO_REGISTRAR',      'M2', 'Evaluar el nivel, marcar habilidades y escribir observaciones (RF-M2-12, RF-M2-13, RF-M2-14)'),
  ('M2_OBSERVACION_PROPIA_CONSULTAR', 'M2', 'Consultar las observaciones propias cuando el club las habilita (RF-M2-23)'),
  ('M2_OBSERVACION_HABILITAR',      'M2', 'Habilitar o deshabilitar la consulta de observaciones por los patinadores (RF-M2-23)')
ON CONFLICT (codigo) DO NOTHING;

-- Administrador
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo IN
  ('M2_CATEGORIA_GESTIONAR', 'M2_CATEGORIA_CONSULTAR', 'M2_ASIGNACION_GESTIONAR',
   'M2_HISTORIAL_CONSULTAR', 'M2_OBSERVACION_HABILITAR')
WHERE r.codigo = 'ADMINISTRADOR'
ON CONFLICT DO NOTHING;

-- Profesor (CATEGORIA_PROMOVER_DIRECTO no se asigna: el administrador decide si lo concede)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo IN
  ('M2_CATEGORIA_CONSULTAR', 'M2_CATEGORIA_PROPONER', 'M2_HISTORIAL_CONSULTAR',
   'M2_ENTRENAMIENTO_CONSULTAR', 'M2_SEGUIMIENTO_REGISTRAR')
WHERE r.codigo = 'PROFESOR'
ON CONFLICT DO NOTHING;

-- Acudiente
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo IN
  ('M2_CATEGORIA_CONSULTAR', 'M2_CATEGORIA_ACTUAL_CONSULTAR')
WHERE r.codigo = 'ACUDIENTE'
ON CONFLICT DO NOTHING;

-- Patinador
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo IN
  ('M2_CATEGORIA_ACTUAL_CONSULTAR', 'M2_HISTORIAL_CONSULTAR', 'M2_OBSERVACION_PROPIA_CONSULTAR')
WHERE r.codigo = 'PATINADOR'
ON CONFLICT DO NOTHING;
COMMIT;
