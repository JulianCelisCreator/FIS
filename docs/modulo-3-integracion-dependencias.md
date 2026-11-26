# Guía Técnica de Dependencias y APIs — Módulo 3: Grupos, Horarios y Programación (Grupo 2)

> **Propósito:** Este documento detalla la arquitectura de **Puertos y Adaptadores** implementada en el Módulo 3 para desacoplar las **12 dependencias externas** de los Grupos 1, 3, 4, 5 y 6 mediante arreglos temporales configurables en memoria, así como el contrato oficial de las **5 APIs expuestas** (`API-M3-01` a `API-M3-05`) listas para ser consumidas por toda la plataforma de la escuela de patinaje de velocidad.

---

## 1. Estándares de Integración del Contrato

| Estándar | Especificación Implementada |
| :--- | :--- |
| **Protocolo y Formato** | HTTP/REST con payload y respuestas en `application/json; charset=utf-8` |
| **Prefijo Base de Rutas** | `/api/v1` (también compatible con `/v1` a través del proxy de Vite en desarrollo) |
| **Autenticación** | `Authorization: Bearer <token_jwt>` (validado contra `DEP-M1-01` o token HMAC-SHA256 de M1) |
| **Formato de Fechas y Horas** | ISO 8601 estricto en UTC (`YYYY-MM-DDTHH:mm:ssZ`) para marcas de tiempo y `HH:mm` (24 horas) para bloques horarios semanales |
| **Inyección de Dependencias** | Tokens de proveedor en NestJS (`EXTERNAL_DEPENDENCIES_TOKENS`) registrados en `ExternalDependenciesModule` |

---

## 2. Tabla de las 12 Dependencias Consumidas por el Módulo 3

Todas las interfaces y tokens de inyección se encuentran centralizados en:
- **Archivo de Interfaces y Tokens:** `code/backend/src/external-dependencies/interfaces/external-dependencies.interfaces.ts`
- **Módulo NestJS de Registro:** `code/backend/src/external-dependencies/external-dependencies.module.ts`

| ID Dependencia | Grupo / Módulo Proveedor | Token NestJS (`EXTERNAL_DEPENDENCIES_TOKENS`) | Archivo del Adaptador Mock (Arreglo Temporal) | Método de la Interfaz | Endpoint HTTP Esperado y Contrato JSON | Historia(s) que la Consumen |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEP-M1-01** | Grupo 1 — M1 Usuarios y Acceso | `M1_USUARIOS_PORT` | `code/backend/src/external-dependencies/adapters/m1-usuarios.mock.adapter.ts` (`SESIONES_MOCK`) | `validarSesionYRol(tokenOrUserId)` | `GET /api/v1/auth/session` (Header `Authorization: Bearer <token>`) → `{ userId: string, rol: "ADMIN" \| "PROFESOR" \| "ESTUDIANTE" \| "ACUDIENTE", activo: boolean }` | HU-3.1, HU-3.2, HU-3.3, HU-3.4, HU-3.5 |
| **DEP-M1-02** | Grupo 1 — M1 Usuarios y Acceso | `M1_USUARIOS_PORT` | `code/backend/src/external-dependencies/adapters/m1-usuarios.mock.adapter.ts` (`PROFESORES_MOCK`) | `listarProfesoresActivos()` | `GET /api/v1/usuarios/profesores?estado=ACTIVO` → `[{ profesorId: string, nombreCompleto: string, estado: "ACTIVO" \| "INACTIVO", especialidad?: string }]` | HU-3.2, HU-3.3, HU-3.5 |
| **DEP-M1-03** | Grupo 1 — M1 Usuarios y Acceso | `M1_USUARIOS_PORT` | `code/backend/src/external-dependencies/adapters/m1-usuarios.mock.adapter.ts` (`MENORES_ACUDIENTES_MOCK`) | `validarMenorYAcudiente(estudianteId, acudienteId?)` | `GET /api/v1/usuarios/estudiantes/{id}/autorizacion-menor` → `{ estudianteId: string, nombreEstudiante: string, edad: number, esMenorEdad: boolean, acudienteId: string \| null, nombreAcudiente: string \| null, tieneAutorizacion: boolean }` | HU-3.4, HU-3.5 |
| **DEP-M1-04** | Grupo 1 — M1 Usuarios y Acceso | `M1_USUARIOS_PORT` | `code/backend/src/external-dependencies/adapters/m1-usuarios.mock.adapter.ts` (`POLIZAS_MOCK`) | `validarPolizaVigente(estudianteId)` | `GET /api/v1/usuarios/estudiantes/{id}/poliza` → `{ estudianteId: string, polizaVigente: boolean, numeroPoliza: string, aseguradora: string, fechaVencimiento: "YYYY-MM-DDTHH:mm:ssZ" }` | HU-3.4 |
| **DEP-M1-05** | Grupo 1 — M1 Usuarios y Acceso | `M1_USUARIOS_PORT` | `code/backend/src/external-dependencies/adapters/m1-usuarios.mock.adapter.ts` (`NOTIFICACIONES_ENVIADAS_MOCK`) | `enviarNotificacion({ destinatariosIds, asunto, mensaje, canal?, motivo? })` | `POST /api/v1/notificaciones/enviar` → Body: `{ destinatariosIds: string[], asunto: string, mensaje: string, canal: "EMAIL" \| "PUSH" \| "AMBOS" }` → Respuesta: `{ notificacionId: string, fechaEnvio: "YYYY-MM-DDTHH:mm:ssZ", estado: "ENVIADA" }` | HU-3.3, HU-3.4, HU-3.5 |
| **DEP-M2-01** | Grupo 3 — M2 Gestión Deportiva | `M2_DEPORTIVO_PORT` | `code/backend/src/external-dependencies/adapters/m2-deportivo.mock.adapter.ts` (`NIVELES_TECNICOS_MOCK`) | `listarNivelesTecnicosActivos()` | `GET /api/v1/deportivo/niveles?activo=true` → `[{ nivelId: string, nombre: string, descripcion: string, activo: boolean }]` | HU-3.1, HU-3.4, HU-3.5 |
| **DEP-M2-02** | Grupo 3 — M2 Gestión Deportiva | `M2_DEPORTIVO_PORT` | `code/backend/src/external-dependencies/adapters/m2-deportivo.mock.adapter.ts` (`CATEGORIAS_MOCK`) | `listarCategorias()` | `GET /api/v1/deportivo/categorias` → `[{ categoriaId: string, nombre: string, edadMin: number, edadMax: number }]` | HU-3.1, HU-3.4, HU-3.5 |
| **DEP-M2-03** | Grupo 3 — M2 Gestión Deportiva | `M2_DEPORTIVO_PORT` | `code/backend/src/external-dependencies/adapters/m2-deportivo.mock.adapter.ts` (`PERFILES_DEPORTIVOS_MOCK`) | `obtenerPerfilDeportivoEstudiante(estudianteId)` | `GET /api/v1/deportivo/estudiantes/{id}/perfil` → `{ estudianteId: string, nombreCompleto: string, nivelId: string, categoriaId: string, estadoDeportivo: "ACTIVO" \| "SUSPENDIDO" \| "RETIRADO" }` | HU-3.4, HU-3.5 |
| **DEP-G4-01** | Grupo 4 — Sedes, Planes y Cartera | `G4_SEDES_CARTERA_PORT` | `code/backend/src/external-dependencies/adapters/g4-sedes-cartera.mock.adapter.ts` (`SEDES_PISTAS_MOCK`) | `listarSedesYPistas()` y `obtenerSedePorId(sedeId)` | `GET /api/v1/sedes` → `[{ sedeId: string, nombreSede: string, pista: string, direccion: string, aforoMaximoFisico: number }]` | HU-3.1, HU-3.3, HU-3.5 |
| **DEP-G4-02** | Grupo 4 — Sedes, Planes y Cartera | `G4_SEDES_CARTERA_PORT` | `code/backend/src/external-dependencies/adapters/g4-sedes-cartera.mock.adapter.ts` (`ESTADO_PLAN_CARTERA_MOCK`) | `obtenerEstadoPlanYCartera(estudianteId)` | `GET /api/v1/cartera/estudiantes/{id}/estado-plan` → `{ estudianteId: string, nombrePlan: string, planActivo: boolean, alDiaEnPagos: boolean, limiteClasesSemanales: number, fechaCorte: "YYYY-MM-DDTHH:mm:ssZ" }` | HU-3.4 |
| **DEP-M4-01** | Grupo 5 — M4 Competencias | `M4_COMPETENCIAS_PORT` | `code/backend/src/external-dependencies/adapters/m4-competencias.mock.adapter.ts` (`COMPETENCIAS_PUBLICADAS_MOCK`) | `listarCompetenciasPublicadas()` | `GET /api/v1/competencias?estado=PUBLICADA` → `[{ competenciaId: string, titulo: string, fechaInicio: "YYYY-MM-DDTHH:mm:ssZ", fechaFin: "YYYY-MM-DDTHH:mm:ssZ", sedeId: string, categorias: string[] }]` | HU-3.5 |
| **DEP-M6-01** | Grupo 6 — M6 Personal | `M6_PERSONAL_PORT` | `code/backend/src/external-dependencies/adapters/m6-personal.mock.adapter.ts` (`DISPONIBILIDAD_DOCENTE_MOCK`) | `obtenerEstadoYDisponibilidadDocente(personalId)` | `GET /api/v1/personal/{id}/disponibilidad` → `{ personalId: string, nombreCompleto: string, cargo: string, estadoContrato: "VIGENTE" \| "SUSPENDIDO" \| "FINALIZADO", disponibilidad: [{ dia: string, horaInicio: "HH:mm", horaFin: "HH:mm" }] }` | HU-3.2, HU-3.3 |

---

## 3. Paso a Paso para Reemplazar los Arreglos Temporales por Consumo HTTP Real

Cada adaptador temporal tiene marcas explícitas `// TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de <DEP-ID>`. Debido a que `GruposService` inyecta únicamente las **interfaces de puerto** (`IM1UsuariosPort`, `IM2DeportivoPort`, `IG4SedesCarteraPort`, `IM4CompetenciasPort`, `IM6PersonalPort`), **no es necesario tocar ni una sola línea de lógica de negocio en `GruposService` ni en los controladores** cuando los demás grupos entreguen sus servicios.

### Paso 1: Crear el Adaptador HTTP Real (Ejemplo para `DEP-G4-01` y `DEP-G4-02` del Grupo 4)

Crear el archivo `code/backend/src/external-dependencies/adapters/g4-sedes-cartera.http.adapter.ts`:

```typescript
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  EstadoPlanCarteraG4,
  IG4SedesCarteraPort,
  SedePistaCapacidadG4,
} from '../interfaces/external-dependencies.interfaces.js';

@Injectable()
export class G4SedesCarteraHttpAdapter implements IG4SedesCarteraPort {
  private readonly baseUrl = process.env.EXTERNAL_G4_URL ?? 'http://localhost:3000/api/v1';

  private obtenerCabeceras(jwtToken?: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
    };
  }

  // Reemplazo real de DEP-G4-01
  async listarSedesYPistas(): Promise<SedePistaCapacidadG4[]> {
    const respuesta = await fetch(`${this.baseUrl}/sedes`, {
      method: 'GET',
      headers: this.obtenerCabeceras(process.env.INTERNAL_SERVICE_JWT),
    });
    if (!respuesta.ok) {
      throw new ServiceUnavailableException(
        `Error al consultar DEP-G4-01 (/sedes): HTTP ${respuesta.status}`,
      );
    }
    return (await respuesta.json()) as SedePistaCapacidadG4[];
  }

  async obtenerSedePorId(sedeId: string): Promise<SedePistaCapacidadG4 | null> {
    const sedes = await this.listarSedesYPistas();
    return sedes.find((s) => s.sedeId === sedeId) ?? null;
  }

  // Reemplazo real de DEP-G4-02
  async obtenerEstadoPlanYCartera(estudianteId: string): Promise<EstadoPlanCarteraG4 | null> {
    const respuesta = await fetch(
      `${this.baseUrl}/cartera/estudiantes/${encodeURIComponent(estudianteId)}/estado-plan`,
      {
        method: 'GET',
        headers: this.obtenerCabeceras(process.env.INTERNAL_SERVICE_JWT),
      },
    );
    if (respuesta.status === 404) return null;
    if (!respuesta.ok) {
      throw new ServiceUnavailableException(
        `Error al consultar DEP-G4-02 (/cartera/estudiantes/${estudianteId}/estado-plan): HTTP ${respuesta.status}`,
      );
    }
    return (await respuesta.json()) as EstadoPlanCarteraG4;
  }
}
```

### Paso 2: Crear el Adaptador HTTP Real para M1, M2, M4 y M6

Sigue exactamente el mismo patrón con `fetch` nativo de Node 22+ para los otros 4 puertos:

```typescript
// Ejemplo para DEP-M4-01 (Grupo 5 - Competencias)
@Injectable()
export class M4CompetenciasHttpAdapter implements IM4CompetenciasPort {
  private readonly baseUrl = process.env.EXTERNAL_M4_URL ?? 'http://localhost:3000/api/v1';

  async listarCompetenciasPublicadas(): Promise<CompetenciaPublicadaM4[]> {
    const res = await fetch(`${this.baseUrl}/competencias?estado=PUBLICADA`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_SERVICE_JWT ?? ''}`,
      },
    });
    if (!res.ok) return [];
    return (await res.json()) as CompetenciaPublicadaM4[];
  }
}
```

### Paso 3: Conmutar Proveedores Dinámicamente en `ExternalDependenciesModule`

En `code/backend/src/external-dependencies/external-dependencies.module.ts`, actualiza el arreglo `providers` para conmutar por variable de entorno (`USE_MOCK_DEPENDENCIES`) de forma individual o global sin romper el sistema:

```typescript
import { Global, Module } from '@nestjs/common';
import { EXTERNAL_DEPENDENCIES_TOKENS } from './interfaces/external-dependencies.interfaces.js';
import { M1UsuariosMockAdapter } from './adapters/m1-usuarios.mock.adapter.js';
import { M2DeportivoMockAdapter } from './adapters/m2-deportivo.mock.adapter.js';
import { G4SedesCarteraMockAdapter } from './adapters/g4-sedes-cartera.mock.adapter.js';
import { M4CompetenciasMockAdapter } from './adapters/m4-competencias.mock.adapter.js';
import { M6PersonalMockAdapter } from './adapters/m6-personal.mock.adapter.js';

const usarMocks = process.env.USE_MOCK_DEPENDENCIES !== 'false';

@Global()
@Module({
  providers: [
    {
      provide: EXTERNAL_DEPENDENCIES_TOKENS.M1_USUARIOS_PORT,
      useClass: usarMocks ? M1UsuariosMockAdapter : M1UsuariosMockAdapter /* M1UsuariosHttpAdapter */,
    },
    {
      provide: EXTERNAL_DEPENDENCIES_TOKENS.M2_DEPORTIVO_PORT,
      useClass: usarMocks ? M2DeportivoMockAdapter : M2DeportivoMockAdapter /* M2DeportivoHttpAdapter */,
    },
    {
      provide: EXTERNAL_DEPENDENCIES_TOKENS.G4_SEDES_CARTERA_PORT,
      useClass: usarMocks ? G4SedesCarteraMockAdapter : G4SedesCarteraMockAdapter /* G4SedesCarteraHttpAdapter */,
    },
    {
      provide: EXTERNAL_DEPENDENCIES_TOKENS.M4_COMPETENCIAS_PORT,
      useClass: usarMocks ? M4CompetenciasMockAdapter : M4CompetenciasMockAdapter /* M4CompetenciasHttpAdapter */,
    },
    {
      provide: EXTERNAL_DEPENDENCIES_TOKENS.M6_PERSONAL_PORT,
      useClass: usarMocks ? M6PersonalMockAdapter : M6PersonalMockAdapter /* M6PersonalHttpAdapter */,
    },
  ],
  exports: [
    EXTERNAL_DEPENDENCIES_TOKENS.M1_USUARIOS_PORT,
    EXTERNAL_DEPENDENCIES_TOKENS.M2_DEPORTIVO_PORT,
    EXTERNAL_DEPENDENCIES_TOKENS.G4_SEDES_CARTERA_PORT,
    EXTERNAL_DEPENDENCIES_TOKENS.M4_COMPETENCIAS_PORT,
    EXTERNAL_DEPENDENCIES_TOKENS.M6_PERSONAL_PORT,
  ],
})
export class ExternalDependenciesModule {}
```

---

## 4. Tabla de APIs Expuestas por el Módulo 3 (`API-M3-01` a `API-M3-05`)

Esta sección está lista para compartirse directamente con los **Grupos 1, 3, 4, 5 y 6**.

| ID API | Método y Ruta Oficial | Controlador en `code/backend/src/grupos/` | Parámetros / Query Params | Cabeceras Requeridas | Códigos de Respuesta y Error | Consumidores Principales |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-M3-01** | `GET /api/v1/grupos` | `grupos.controller.ts` (`GruposController.findAll`) | Ninguno | `Authorization: Bearer <jwt>` | `200 OK`, `401 Unauthorized` | M1, M2 (Grupo 3), Grupo 4 (Planes y Cartera) |
| **API-M3-02** | `GET /api/v1/profesores/{id}/grupos` | `profesores-grupo.controller.ts` (`ProfesoresGrupoController.obtenerGruposDeProfesor`) | Path: `id` (`string`, ej. `prof-person` o `prof-carlos`) | `Authorization: Bearer <jwt>` | `200 OK`, `404 Not Found` (si el profesor no existe en `DEP-M1-02`) | M1, M6 (Grupo 6 — Personal y Nómina) |
| **API-M3-03** | `GET /api/v1/horarios` | `horarios.controller.ts` (`HorariosController.obtenerHorariosVigentes`) | Query opcionales: `sedeId`, `grupoId`, `dia` | `Authorization: Bearer <jwt>` | `200 OK` | M2 (Asistencia), Grupo 4 (Ocupación de Sedes), M6 |
| **API-M3-04** | `GET /api/v1/grupos/{id}/estudiantes` | `grupos.controller.ts` (`GruposController.obtenerEstudiantesDeGrupo`) | Path: `id` (`string`, ej. `grp-avanzado-norte`) | `Authorization: Bearer <jwt>` | `200 OK`, `404 Not Found` (si el grupo no existe) | M2 (Evaluaciones Técnicas y Asistencia), M4 (Inscripción a Competencias) |
| **API-M3-05** | `GET /api/v1/calendario` | `calendario.controller.ts` (`CalendarioController.obtenerCalendarioConsolidado`) | Query opcionales: `rol` (`ADMIN`, `PROFESOR`, `ESTUDIANTE`, `ACUDIENTE`), `userId`, `nivelId`, `categoriaId`, `sedeId`, `profesorId`, `tipo` (`CLASE`, `EVENTO_ESCUELA`, `COMPETENCIA`) | `Authorization: Bearer <jwt>` | `200 OK`, `400 Bad Request` | Todos los módulos y portal unificado del usuario |

### Ejemplos Reales de Respuesta JSON por API Expuesta

#### `API-M3-01` — `GET /api/v1/grupos`
```json
[
  {
    "grupoId": "grp-avanzado-norte",
    "nombre": "Avanzado A - Velocidad Norte",
    "nivelId": "niv-avanzado",
    "categoriaId": "cat-juvenil",
    "sedeId": "sede-norte-pista1",
    "aforoMax": 20,
    "ocupados": 18,
    "alerta90": true,
    "estado": "ACTIVO",
    "profesoresIds": ["prof-person"]
  }
]
```

#### `API-M3-02` — `GET /api/v1/profesores/prof-person/grupos`
```json
[
  {
    "grupoId": "grp-avanzado-norte",
    "nombreGrupo": "Avanzado A - Velocidad Norte",
    "rolDocente": "TITULAR",
    "horarios": [
      {
        "horarioId": "hor-seed-person-lun",
        "dia": "Lunes",
        "horaInicio": "08:00",
        "horaFin": "10:00",
        "sedeId": "sede-norte-pista1",
        "estado": "VIGENTE"
      },
      {
        "horarioId": "hor-seed-person-mie",
        "dia": "Miercoles",
        "horaInicio": "08:00",
        "horaFin": "10:00",
        "sedeId": "sede-norte-pista1",
        "estado": "VIGENTE"
      }
    ]
  }
]
```

#### `API-M3-03` — `GET /api/v1/horarios`
```json
[
  {
    "horarioId": "hor-seed-person-lun",
    "grupoId": "grp-avanzado-norte",
    "sedeId": "sede-norte-pista1",
    "dia": "Lunes",
    "horaInicio": "08:00",
    "horaFin": "10:00",
    "estado": "VIGENTE"
  }
]
```

#### `API-M3-04` — `GET /api/v1/grupos/grp-avanzado-norte/estudiantes`
```json
[
  {
    "estudianteId": "est-menor-autorizado",
    "fechaInscripcion": "2026-03-01T14:00:00Z",
    "estado": "ACTIVO"
  }
]
```

#### `API-M3-05` — `GET /api/v1/calendario?rol=ESTUDIANTE&userId=est-menor-autorizado`
```json
{
  "eventos": [
    {
      "eventoId": "clase-hor-seed-person-lun",
      "titulo": "Avanzado A - Velocidad Norte",
      "tipo": "CLASE",
      "fechaInicio": "2026-04-13T08:00:00Z",
      "fechaFin": "2026-04-13T10:00:00Z",
      "diaSemana": "Lunes",
      "horaInicio": "08:00",
      "horaFin": "10:00",
      "sedeId": "sede-norte-pista1",
      "nombreSede": "Sede Norte - Pista Principal 200m",
      "grupoId": "grp-avanzado-norte",
      "nivelId": "niv-avanzado",
      "nombreNivel": "Avanzado / Fondo y Velocidad",
      "categoriaId": "cat-juvenil",
      "nombreCategoria": "Juvenil (13 a 16 años)",
      "profesores": [
        {
          "profesorId": "prof-person",
          "nombreCompleto": "Profesor Person",
          "rolDocente": "TITULAR"
        }
      ],
      "cuposDisponibles": 2,
      "aforoMax": 20,
      "ocupados": 18,
      "estado": "PROGRAMADO"
    },
    {
      "eventoId": "comp-distrital-2026-1",
      "titulo": " I Válida Distrital de Velocidad 2026",
      "tipo": "COMPETENCIA",
      "fechaInicio": "2026-04-18T08:00:00Z",
      "fechaFin": "2026-04-19T18:00:00Z",
      "diaSemana": "Sabado",
      "horaInicio": "08:00",
      "horaFin": "18:00",
      "sedeId": "sede-norte-pista1",
      "nombreSede": "Sede Norte - Pista Principal 200m",
      "grupoId": null,
      "nivelId": null,
      "nombreNivel": null,
      "categoriaId": "cat-juvenil",
      "nombreCategoria": "Juvenil (13 a 16 años)",
      "profesores": [],
      "cuposDisponibles": null,
      "aforoMax": null,
      "ocupados": null,
      "estado": "PROGRAMADO"
    }
  ]
}
```

---

## 5. Mapa de Variables de Entorno (`.env`) para Integración Real

Agrega estas variables en `code/backend/.env` para alternar entre los adaptadores temporales (`USE_MOCK_DEPENDENCIES=true`) y los servicios reales cuando se desplieguen todos los módulos:

```dotenv
# ==============================================================================
# CONFIGURACIÓN DE INTEGRACIÓN — MÓDULO 3 (GRUPOS, HORARIOS Y PROGRAMACIÓN)
# ==============================================================================

# Si es "true" (por defecto), usa los arreglos temporales en memoria con datos semilla.
# Cambiar a "false" cuando los endpoints de los Grupos 1, 3, 4, 5 y 6 estén activos.
USE_MOCK_DEPENDENCIES=true

# URLs base de los demás módulos (pueden apuntar al mismo monolito modular o microservicios)
EXTERNAL_M1_URL=http://localhost:3000/api/v1
EXTERNAL_M2_URL=http://localhost:3000/api/v1
EXTERNAL_G4_URL=http://localhost:3000/api/v1
EXTERNAL_M4_URL=http://localhost:3000/api/v1
EXTERNAL_M6_URL=http://localhost:3000/api/v1

# Token JWT de servicio interno para comunicación entre módulos (Bearer)
INTERNAL_SERVICE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.m3-service-token
```
