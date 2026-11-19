-- Migración M6: agrega la foto a bases creadas antes de este cambio.
-- Uso (desde code/backend):
--   psql -h localhost -p 5432 -U patinaje -d patinaje -f db/migraciones/2026-11-19-m6-foto-uniforme.sql
-- Una base nueva no la necesita: schema.sql ya incluye la columna.

ALTER TABLE uniforme ADD COLUMN IF NOT EXISTS foto_url TEXT;
