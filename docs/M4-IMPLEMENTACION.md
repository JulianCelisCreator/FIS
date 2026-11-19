# M4 · Competencias, Inscripciones y Resultados Deportivos

Implementación del Módulo M4 sobre la arquitectura existente de FIS/Velora:
- Backend: NestJS + TypeScript, controllers, DTO, service y repository.
- Frontend: React + TypeScript, cliente HTTP compartido y componentes del Design System del proyecto.
- Persistencia: PostgreSQL, tablas ya definidas en `code/backend/db/schema.sql`.

## Historias implementadas

| Historia | Alcance implementado | Tablas / vistas principales |
|---|---|---|
| HU-M4-01 | Crear, modificar, configurar pruebas y categorías, publicar y cancelar competencias; notificaciones y auditoría. | `competencia`, `prueba`, `prueba_categoria`, `categoria`, `auditoria`, `notificacion` |
| HU-M4-02 | Elegibilidad por grupo del profesor, preselección, solicitud y validación automática de póliza, cartera, autorización y sanciones. | `preseleccion`, `inscripcion`, `inscripcion_validacion`, `patinador_grupo`, `grupo_profesor`, `poliza`, `v_estado_cartera`, `acudiente_patinador`, `autorizacion_acudiente`, `sancion` |
| HU-M4-03 | Registrar tiempos `MM:SS.mmm`, marcar No finalizó y generar tabla ordenada por tiempo. | `resultado`, `inscripcion`, `prueba` |
| HU-M4-04 | Ranking por categoría/nivel, récord personal por modalidad/distancia e historial cronológico con control de privacidad. | `resultado`, `patinador_categoria`, `patinador_nivel`, `v_record_personal` |
| HU-M4-05 | Corrección exclusiva del Administrador con motivo y auditoría; publicación y exportación CSV / PDF. | `correccion_resultado`, `auditoria`, `notificacion`, `competencia` |

## Integración incluida

El paquete modifica:
- `code/backend/src/app.module.ts`: registra `M4CompetenciasResultadosModule`.
- `code/frontend/src/app/aplicacion.tsx`: agrega la navegación de M4.
- `code/backend/db/m4-permisos.sql`: crea permisos M4 y los asigna por rol.
- Agrega `code/backend/src/modules/m4-competencias-resultados/`.
- Agrega `code/frontend/src/modules/m4-competencias-resultados/`.

No se reemplaza el esquema de la base de datos. Se utilizan los nombres y relaciones ya presentes en `schema.sql`.

## Configuración

1. Crear la base de datos usando el `schema.sql` del repositorio (si todavía no se ha instalado).
2. Ejecutar una sola vez el script adicional de permisos:

```bash
psql -h localhost -U patinaje -d patinaje -f code/backend/db/m4-permisos.sql
```

3. Configurar `code/backend/.env` según `code/backend/.env.example`.
4. Instalar y ejecutar el backend:

```bash
cd code/backend
pnpm install
pnpm start:dev
```

5. En otra terminal, instalar y ejecutar el frontend:

```bash
cd code/frontend
pnpm install
pnpm dev
```

6. Abrir la URL local que indique Vite. La aplicación usa el selector de usuario de prueba y envía `x-usuario-id`, igual que M5, mientras M1 termina de integrar autenticación.

## Endpoints principales

Base: `/m4`. Todas las rutas pasan por `AutenticacionTemporalGuard` y `PermisosGuard`.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/competencias` | Listado visible según rol |
| GET | `/competencias/:id` | Detalle y pruebas |
| GET | `/categorias` | Catálogo activo de categorías |
| POST | `/competencias` | Crear competencia |
| PATCH | `/competencias/:id` | Modificar competencia |
| POST | `/competencias/:id/publicar` | Publicar competencia |
| POST | `/competencias/:id/cancelar` | Cancelar con motivo (solo Administrador) |
| POST | `/pruebas` | Crear/asociar modalidad, distancia, categoría y género |
| GET | `/competencias/:id/elegibles` | Patinadores elegibles / propios preseleccionados |
| POST | `/preselecciones` | Preseleccionar patinadores |
| POST | `/inscripciones` | Solicitar y validar inscripción |
| GET | `/pruebas/:id/inscripciones` | Inscripciones y sus validaciones (Admin/Profesor) |
| GET | `/pruebas/:id/participantes` | Participantes aprobados para registrar tiempos |
| POST | `/resultados` | Registrar tiempo o No finalizó |
| GET | `/pruebas/:id/resultados` | Tabla ordenada (Admin/Profesor) |
| GET | `/ranking` | Ranking acumulado con filtros opcionales |
| GET | `/rendimiento/:patinadorId` | Récords e historial con privacidad por usuario |
| PATCH | `/resultados/:id/corregir` | Corregir con motivo (solo Administrador) |
| GET | `/resultados/:id/auditoria` | Historial de correcciones (solo Administrador) |
| POST | `/competencias/:id/publicar-resultados` | Consolidar y publicar resultados |

### Formatos de entrada

Crear competencia:

```json
{
  "nombre": "Copa Distrital",
  "fechaHora": "2026-12-12T08:00:00-05:00",
  "lugar": "Pista de Patinaje",
  "tipo": "FEDERADA",
  "aperturaInscripciones": "2026-11-20T08:00:00-05:00",
  "cierreInscripciones": "2026-12-05T23:59:00-05:00"
}
```

Crear prueba:

```json
{
  "competenciaId": 1,
  "modalidad": "VELOCIDAD",
  "distanciaMetros": 300,
  "descripcion": "Velocidad 300 metros",
  "categoriaId": 2,
  "genero": "FEMENINO"
}
```

Solicitar inscripción:

```json
{
  "pruebaId": 1,
  "patinadorId": 15,
  "confirmarAutorizacionAcudiente": true
}
```

Registrar resultado:

```json
{
  "inscripcionId": 4,
  "tiempo": "00:42.315",
  "noFinalizo": false
}
```

Corregir resultado:

```json
{
  "tiempo": "00:42.210",
  "noFinalizo": false,
  "motivo": "Corrección según revisión del cronometraje"
}
```

## Decisiones y límites que deben conocer

1. **Estado inicial:** la base de datos define `competencia.estado='BORRADOR'`; la interfaz lo presenta como **Programada**. Publicada y Cancelada mantienen su correspondencia. Al publicar resultados consolidados, la competencia pasa a `FINALIZADA`, estado que ya existe en el esquema.
2. **Validación de cartera:** el requisito de negocio del repositorio indica que `VENCIDO` bloquea la inscripción. `PENDIENTE` no la bloquea; `AL_DIA` tampoco.
3. **Autorización de menores:** el vínculo acudiente-patinador se consulta en `acudiente_patinador`; la autorización general vigente se verifica en `autorizacion_acudiente`, y la confirmación digital de esta inscripción queda en `inscripcion.autorizada_por_acudiente` / `autorizada_en`.
4. **Récord personal:** se consulta la vista `v_record_personal`, agrupada por modalidad y distancia. Al registrar una marca que mejora la anterior, la API devuelve la diferencia en milisegundos.
5. **Ranking:** usa `resultado.puntos` como acumulado. El esquema y los requisitos no establecen una fórmula de puntos por puesto; por tanto, este módulo no inventa ni asigna puntos automáticamente. Si el grupo acuerda una tabla de puntuación, debe añadirse explícitamente.
6. **Exportación:** CSV se descarga desde el navegador. PDF usa la función de impresión del navegador (Imprimir → Guardar como PDF), sin añadir dependencias externas.
7. **Publicación de resultados:** se registra en `auditoria`, se notifican los solicitantes, patinadores y acudientes vinculados, y la competencia pasa a `FINALIZADA`. El esquema actual no tiene una columna independiente `resultados_publicados_en`.
8. **Pruebas:** la restricción única del esquema es `(competencia_id, modalidad, distancia_metros)`. Para una misma prueba se pueden asociar varias categorías/géneros usando `prueba_categoria`.

## Verificación

El código fuente se revisó para consistencia sintáctica y correspondencia con los nombres del esquema. No se pudo ejecutar una compilación NestJS/React ni pruebas de integración contra PostgreSQL en el entorno de preparación porque el ZIP fuente no incluye `node_modules` ni una instancia de base de datos. Ejecuta `pnpm install`, `pnpm build` y prueba los flujos en tu entorno antes de hacer merge.
