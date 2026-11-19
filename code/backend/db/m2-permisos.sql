-- Permisos y asignaciones iniciales de M2. Ejecutar una vez después de schema.sql.
BEGIN;
INSERT INTO permiso (codigo, modulo, descripcion) VALUES
  ('M2_ACUDIENTE_GESTIONAR', 'M2', 'Asociar perfiles existentes de patinador y acudiente (HU-M2-03)'),
  ('M2_NIVEL_GESTIONAR', 'M2', 'Crear, editar y desactivar niveles de patinaje (HU-M2-04)'),
  ('M2_NIVEL_CONSULTAR', 'M2', 'Consultar el nivel actual de un patinador (HU-M2-05)')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.codigo = 'ADMINISTRADOR' AND p.modulo = 'M2'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo = 'M2_NIVEL_CONSULTAR'
WHERE r.codigo IN ('PATINADOR', 'ACUDIENTE')
ON CONFLICT DO NOTHING;
COMMIT;
