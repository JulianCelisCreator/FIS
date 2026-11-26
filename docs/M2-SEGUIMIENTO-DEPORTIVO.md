# M2 · Seguimiento deportivo (RF-M2-07 a RF-M2-23) — backend

Complementa los PR #44 a #47 (RF-M2-01 a RF-M2-06). Módulo Nest propio: `M2SeguimientoDeportivoModule`
(`code/backend/src/modules/m2-gestion-deportiva/m2-seguimiento-deportivo.module.ts`). No edita archivos de esos PR,
salvo una línea en `app.module.ts`. Permisos: `code/backend/db/m2-permisos-seguimiento.sql` (ejecutar tras `schema.sql`).

## Trazabilidad

El PDF de historias usa `HU-4.2-NN` con `RFMG-0NN`; el .docx usa `RF-M2-NN`; los PR usan `HU-M2-*`.
Correspondencia por número: `RFMG-0NN` = `RF-M2-NN`. Excepción: en el PDF, HU-4.2-14 cita `RFMG-016` y HU-4.2-15
cita `RFMG-015` (encabezado) / `RFMG-016` (campo ID); aquí se tratan como RF-M2-15 (historial del profesor) y
RF-M2-16 (propuesta de cambio), como en el orden de las dependencias. Confirmar con el equipo.

| Historia (PDF) | Requisito | Endpoint | Prueba |
|---|---|---|---|
| HU-4.2-06 | RF-M2-07 | `GET/POST /m2/categorias`, `PATCH /m2/categorias/:id` | e2e «Categorías» |
| HU-4.2-07 | RF-M2-08 | `POST /m2/patinadores/:id/categoria` | e2e «Evaluación, asignación y cambio» |
| HU-4.2-08 | RF-M2-09 | `POST /m2/patinadores/:id/categoria/cambio` | idem |
| HU-4.2-09 | RF-M2-10 | `GET /m2/patinadores/:id/historial` | e2e «Historial y consultas» |
| HU-4.2-10 | RF-M2-11 | `GET /m2/entrenamiento/patinadores[/:id]` | idem |
| HU-4.2-11 | RF-M2-12 | `POST /m2/patinadores/:id/evaluaciones` | e2e «Evaluación…» |
| HU-4.2-12 | RF-M2-13 | `GET/PUT /m2/patinadores/:id/habilidades` | idem |
| HU-4.2-13 | RF-M2-14 | `GET/POST /m2/patinadores/:id/observaciones` | e2e «Observaciones» |
| HU-4.2-14 | RF-M2-15 | `GET /m2/patinadores/:id/historial` (profesor) | e2e «Historial» |
| HU-4.2-15 | RF-M2-16 | `POST/GET /m2/propuestas-categoria`, `…/:id/aprobar`, `…/:id/rechazar` | e2e «Propuestas» |
| HU-4.2-16 | RF-M2-17 | `GET /m2/catalogo-club` | e2e «Categorías» |
| HU-4.2-17 | RF-M2-18 | `GET /m2/categoria-actual` (acudiente) | e2e «Historial y consultas» |
| HU-4.2-18 | RF-M2-19 | `GET /m2/catalogo-club` (acudiente, sin niveles) | e2e «Categorías» |
| HU-4.2-20 | RF-M2-21 | `GET /m2/categoria-actual` (patinador) | e2e «Historial y consultas» |
| HU-4.2-21 | RF-M2-22 | `GET /m2/patinadores/:id/historial` (patinador) | idem |
| HU-4.2-22 | RF-M2-23 | `GET /m2/mis-observaciones`, `GET/PUT /m2/parametros/observaciones-visibles` | e2e «Observaciones» |

Fuera de este trabajo (en los PR del compañero): RF-M2-01 a 06 y RF-M2-20 (nivel actual).

## Decisiones tomadas (reversibles; confirmar con el club)

1. **Alcance del profesor**: patinadores matriculados en un grupo que tiene asignado (`grupo_profesor`, que el esquema
   define como «qué patinadores ve cada profesor»). Los requisitos dicen «categorías del entrenador»; el esquema no
   enlaza profesor y categoría directamente. Alternativa: usar `grupo.categoria_id`.
2. **Avance de nivel**: una evaluación `APROBADO` de un nivel superior al vigente (o sin nivel previo) cierra el nivel
   actual y abre el nuevo en `patinador_nivel`. Las demás evaluaciones solo se guardan.
3. **Elegibilidad para una categoría**: edad, género y nivel mínimo definidos en `categoria`; el patinador necesita un nivel registrado.
4. **Cambio de categoría (RF-M2-09/16)**: exige otra categoría activa, elegible, y una evaluación aprobada desde que
   entró a la categoría actual.
5. **Propuesta vs. promoción directa**: el profesor propone y el administrador aprueba o rechaza. Con el permiso
   `M2_CATEGORIA_PROMOVER_DIRECTO` (sin asignar por defecto) el cambio se ejecuta de una vez y queda registrado.
6. **Observaciones**: el profesor decide si cada una es visible para el patinador; el patinador solo ve las visibles y solo si el
   administrador habilita el parámetro `observaciones_visibles_patinador`. El acudiente no tiene acceso (no está en los requisitos).
7. **Inactivar categoría**: se bloquea si tiene patinadores asignados.
8. La ficha de entrenamiento no expone documento ni teléfono.
9. Catálogo de habilidades: ningún RF define quién lo administra; hoy se llena por SQL.

## Hallazgo que afecta a otros PR

`tsconfig` usa `target: ES2023`, así que los campos declarados de un DTO son propiedades propias con valor `undefined`.
Por eso `Object.hasOwn(dto, 'x')` y `Object.keys(dto).length === 0` siempre dan «enviado». Revisar los PATCH de #44 y #46.
