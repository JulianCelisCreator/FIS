-- Migración M1: metadatos del adjunto de la póliza y vigencia coherente con M4 (HU-M1-10).
-- Uso (desde code/backend):
--   psql -h localhost -p 5432 -U patinaje -d patinaje -f db/migraciones/2026-11-25-m1-poliza-archivo.sql
-- Una base nueva no la necesita: schema.sql ya incluye estos cambios.

ALTER TABLE poliza ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;
ALTER TABLE poliza ADD COLUMN IF NOT EXISTS archivo_tipo TEXT;
ALTER TABLE poliza ADD COLUMN IF NOT EXISTS archivo_tamano INTEGER;

-- Una póliza pendiente de revisión no habilita el perfil; M4-07 ya exigía APROBADA.
CREATE OR REPLACE VIEW v_perfil_patinador AS
SELECT pt.id AS patinador_id,
       date_part('year', age(current_date, pt.fecha_nacimiento))::int AS edad,
       (age(current_date, pt.fecha_nacimiento) < interval '18 years') AS es_menor,
       EXISTS (SELECT 1 FROM autorizacion_acudiente a
               WHERE a.patinador_id = pt.id AND a.revocada_en IS NULL)  AS tiene_autorizacion,
       EXISTS (SELECT 1 FROM poliza po
               WHERE po.patinador_id = pt.id AND po.estado_revision = 'APROBADA'
                 AND current_date BETWEEN po.vigente_desde AND po.vigente_hasta) AS tiene_poliza_vigente,
       CASE
         WHEN age(current_date, pt.fecha_nacimiento) >= interval '18 years' THEN 'HABILITADO'
         WHEN EXISTS (SELECT 1 FROM autorizacion_acudiente a
                      WHERE a.patinador_id = pt.id AND a.revocada_en IS NULL)
          AND EXISTS (SELECT 1 FROM poliza po
                      WHERE po.patinador_id = pt.id AND po.estado_revision = 'APROBADA'
                        AND current_date BETWEEN po.vigente_desde AND po.vigente_hasta) THEN 'HABILITADO'
         ELSE 'BLOQUEADO'
       END AS estado_perfil
FROM patinador pt;
