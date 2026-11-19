-- Permisos y asignaciones del Módulo M4. Ejecutar una vez después de schema.sql.
BEGIN;
INSERT INTO permiso (codigo,modulo,descripcion) VALUES
 ('M4_CONSULTAR','M4','Consultar competencias y el módulo M4'),
 ('M4_COMPETENCIA_GESTIONAR','M4','Crear, configurar, modificar, publicar y cancelar competencias (M4-01 a M4-04, M4-12)'),
 ('M4_INSCRIPCION_GESTIONAR','M4','Preseleccionar patinadores y solicitar inscripciones (M4-05 a M4-11)'),
 ('M4_RESULTADO_REGISTRAR','M4','Registrar tiempos y consultar tablas de resultados (M4-13, M4-14)'),
 ('M4_RESULTADO_CONSULTAR','M4','Consultar ranking, récords e historial deportivo (M4-14 a M4-17)'),
 ('M4_RESULTADO_ADMINISTRAR','M4','Corregir resultados con auditoría (M4-18)'),
 ('M4_RESULTADO_PUBLICAR','M4','Publicar y exportar resultados (M4-19)')
ON CONFLICT (codigo) DO NOTHING;

-- Administrador: todos los permisos M4.
INSERT INTO rol_permiso (rol_id,permiso_id)
SELECT r.id,p.id FROM rol r CROSS JOIN permiso p
WHERE r.codigo='ADMINISTRADOR' AND p.modulo='M4'
ON CONFLICT DO NOTHING;

-- Profesor: gestiona competencias, preselección, captura resultados y consulta.
INSERT INTO rol_permiso (rol_id,permiso_id)
SELECT r.id,p.id FROM rol r JOIN permiso p ON p.codigo IN
 ('M4_CONSULTAR','M4_COMPETENCIA_GESTIONAR','M4_INSCRIPCION_GESTIONAR',
  'M4_RESULTADO_REGISTRAR','M4_RESULTADO_CONSULTAR','M4_RESULTADO_PUBLICAR')
WHERE r.codigo='PROFESOR'
ON CONFLICT DO NOTHING;

-- Patinador y acudiente: consultan y participan; su visibilidad se restringe en el servicio.
INSERT INTO rol_permiso (rol_id,permiso_id)
SELECT r.id,p.id FROM rol r JOIN permiso p ON p.codigo IN
 ('M4_CONSULTAR','M4_INSCRIPCION_GESTIONAR','M4_RESULTADO_CONSULTAR')
WHERE r.codigo IN ('PATINADOR','ACUDIENTE')
ON CONFLICT DO NOTHING;
COMMIT;
