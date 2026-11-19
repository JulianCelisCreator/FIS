-- Migración M6 · 2026-11-18 · Permiso del panel general administrativo (HU-6.1)
-- Aplica sobre una base ya creada el permiso nuevo de schema.sql, sin borrar datos.
-- Solo el Administrador lo recibe (el Contador y los demás roles no ven el panel).
-- Uso (desde code/backend):
--   psql -h localhost -p 5433 -U patinaje -d patinaje -f db/migraciones/2026-11-18-m6-permiso-panel.sql

BEGIN;

INSERT INTO permiso (codigo, modulo, descripcion)
VALUES ('M6_PANEL_CONSULTAR', 'M6', 'Consultar el panel general administrativo (M6-01); solo Administrador')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON p.codigo = 'M6_PANEL_CONSULTAR'
WHERE r.codigo = 'ADMINISTRADOR'
ON CONFLICT DO NOTHING;

COMMIT;
