import { Injectable } from '@nestjs/common';
import type {
  IPuertoM1Usuarios,
  PolizaDeportivaM1,
  ProfesorActivoM1,
  RegistroNotificacionM1,
  SesionUsuarioM1,
  SolicitudNotificacionM1,
  ValidacionMenorEdadM1,
} from '../interfaces/external-dependencies.interfaces.js';

@Injectable()
export class M1UsuariosMockAdapter implements IPuertoM1Usuarios {
  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M1-01
  private readonly sesionesMock: Record<string, SesionUsuarioM1> = {
    'mock-jwt-admin': {
      userId: 'USR-ADMIN-01',
      rol: 'ADMIN',
      activo: true,
      nombreCompleto: 'Daniela Martínez (Admin)',
    },
    'mock-jwt-profesor-01': {
      userId: 'PROF-01',
      rol: 'PROFESOR',
      activo: true,
      nombreCompleto: 'Carlos Mendoza',
    },
    'mock-jwt-profesor-03': {
      userId: 'PROF-03',
      rol: 'PROFESOR',
      activo: true,
      nombreCompleto: 'Ana Gómez',
    },
    'mock-jwt-acudiente-01': {
      userId: 'ACU-01',
      rol: 'ACUDIENTE',
      activo: true,
      nombreCompleto: 'Carolina Ramírez (Acudiente de Sofía)',
      estudianteVinculadoId: 'EST-01',
    },
    'mock-jwt-estudiante-menor': {
      userId: 'EST-01',
      rol: 'ESTUDIANTE',
      activo: true,
      nombreCompleto: 'Sofía Ramírez (10 años)',
      estudianteVinculadoId: 'EST-01',
    },
    'mock-jwt-estudiante-mayor': {
      userId: 'EST-02',
      rol: 'ESTUDIANTE',
      activo: true,
      nombreCompleto: 'Juan Pablo González (19 años)',
      estudianteVinculadoId: 'EST-02',
    },
  };

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M1-02
  private readonly profesoresActivosMock: ProfesorActivoM1[] = [
    {
      profesorId: 'PROF-01',
      nombreCompleto: 'Carlos Mendoza',
      estado: 'ACTIVO',
      especialidad: 'Velocidad y Fondo',
    },
    {
      profesorId: 'PROF-02',
      nombreCompleto: 'Profesor Person',
      estado: 'ACTIVO',
      especialidad: 'Iniciación y Técnica de Curva',
    },
    {
      profesorId: 'PROF-03',
      nombreCompleto: 'Ana Gómez',
      estado: 'ACTIVO',
      especialidad: 'Transición e Intermedio',
    },
    {
      profesorId: 'PROF-04',
      nombreCompleto: 'Luis Rojas',
      estado: 'ACTIVO',
      especialidad: 'Velocidad Pura 200m/500m',
    },
    {
      profesorId: 'PROF-05',
      nombreCompleto: 'Carlos Díaz',
      estado: 'ACTIVO',
      especialidad: 'Preparación Física sobre Ruedas',
    },
  ];

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M1-03
  private readonly menoresYAcudientesMock: ValidacionMenorEdadM1[] = [
    {
      estudianteId: 'EST-01',
      nombreEstudiante: 'Sofía Ramírez',
      edad: 10,
      esMenorEdad: true,
      acudienteId: 'ACU-01',
      nombreAcudiente: 'Carolina Ramírez',
      tieneAutorizacion: true,
    },
    {
      estudianteId: 'EST-02',
      nombreEstudiante: 'Juan Pablo González',
      edad: 19,
      esMenorEdad: false,
      acudienteId: null,
      nombreAcudiente: null,
      tieneAutorizacion: true,
    },
    {
      estudianteId: 'EST-03',
      nombreEstudiante: 'Mateo Valderrama',
      edad: 9,
      esMenorEdad: true,
      acudienteId: 'ACU-02',
      nombreAcudiente: 'Roberto Valderrama',
      tieneAutorizacion: false,
    },
    {
      estudianteId: 'EST-04',
      nombreEstudiante: 'Valentina Torres',
      edad: 12,
      esMenorEdad: true,
      acudienteId: 'ACU-03',
      nombreAcudiente: 'Marcela Torres',
      tieneAutorizacion: true,
    },
  ];

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M1-04
  private readonly polizasMock: PolizaDeportivaM1[] = [
    {
      estudianteId: 'EST-01',
      polizaVigente: true,
      fechaVencimiento: '2026-12-31T23:59:59Z',
      numeroPoliza: 'POL-SURA-882341',
    },
    {
      estudianteId: 'EST-02',
      polizaVigente: true,
      fechaVencimiento: '2026-11-30T23:59:59Z',
      numeroPoliza: 'POL-BOLIVAR-991204',
    },
    {
      estudianteId: 'EST-03',
      polizaVigente: true,
      fechaVencimiento: '2026-12-15T23:59:59Z',
      numeroPoliza: 'POL-SURA-443120',
    },
    {
      estudianteId: 'EST-04',
      polizaVigente: false,
      fechaVencimiento: '2026-01-15T23:59:59Z',
      numeroPoliza: 'POL-SURA-102938',
    },
  ];

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M1-05
  private readonly colaNotificacionesAuditables: RegistroNotificacionM1[] = [
    {
      notificacionId: 'NOTIF-001',
      destinatariosIds: ['PROF-01', 'EST-01'],
      asunto: 'Apertura de programación de entrenamientos M3',
      mensaje:
        'Se encuentran publicados los horarios oficiales de entrenamiento para la sede Norte y Sur.',
      canal: 'EMAIL_PUSH',
      fechaEnvio: '2026-10-01T08:00:00Z',
      estadoEnvio: 'ENVIADO',
    },
  ];

  validarSesion(authorizationHeader?: string): SesionUsuarioM1 {
    if (!authorizationHeader) {
      return this.sesionesMock['mock-jwt-admin'];
    }
    const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
    return (
      this.sesionesMock[token] ??
      Object.values(this.sesionesMock).find((s) => s.userId === token) ??
      this.sesionesMock['mock-jwt-admin']
    );
  }

  listarSesionesDisponibles(): SesionUsuarioM1[] {
    return Object.values(this.sesionesMock);
  }

  listarProfesoresActivos(): ProfesorActivoM1[] {
    return this.profesoresActivosMock.filter((p) => p.estado === 'ACTIVO');
  }

  validarMenorYAcudiente(estudianteId: string): ValidacionMenorEdadM1 {
    return (
      this.menoresYAcudientesMock.find(
        (m) => m.estudianteId === estudianteId,
      ) ?? {
        estudianteId,
        nombreEstudiante: 'Estudiante no registrado',
        edad: 18,
        esMenorEdad: false,
        acudienteId: null,
        tieneAutorizacion: false,
      }
    );
  }

  listarValidacionesMenores(): ValidacionMenorEdadM1[] {
    return this.menoresYAcudientesMock;
  }

  validarPolizaVigente(estudianteId: string): PolizaDeportivaM1 {
    return (
      this.polizasMock.find((p) => p.estudianteId === estudianteId) ?? {
        estudianteId,
        polizaVigente: false,
        fechaVencimiento: '2025-12-31T23:59:59Z',
      }
    );
  }

  enviarNotificacion(
    payload: SolicitudNotificacionM1,
  ): RegistroNotificacionM1 {
    const registro: RegistroNotificacionM1 = {
      notificacionId: `NOTIF-${String(this.colaNotificacionesAuditables.length + 1).padStart(3, '0')}`,
      destinatariosIds: payload.destinatariosIds,
      asunto: payload.asunto,
      mensaje: payload.mensaje,
      canal: 'EMAIL_PUSH',
      fechaEnvio: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      estadoEnvio: 'ENVIADO',
    };
    this.colaNotificacionesAuditables.unshift(registro);
    return registro;
  }

  listarNotificacionesEnviadas(): RegistroNotificacionM1[] {
    return this.colaNotificacionesAuditables;
  }
}
