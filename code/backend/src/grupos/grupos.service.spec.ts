import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExternalDependenciesModule } from '../external-dependencies/external-dependencies.module.js';
import { GruposService } from './grupos.service.js';

describe('GruposService (HU-3.1 y HU-3.2)', () => {
  let service: GruposService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ExternalDependenciesModule],
      providers: [GruposService],
    }).compile();

    service = module.get<GruposService>(GruposService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe exponer el contrato API-M3-01 en findAll() con grupoId, nivelId, categoriaId, sedeId, aforoMax, ocupados y alerta90', () => {
    const grupos = service.findAll('Bearer mock-jwt-admin');
    expect(grupos.length).toBeGreaterThanOrEqual(3);
    for (const g of grupos) {
      expect(g.grupoId).toBeDefined();
      expect(g.nombre).toBeDefined();
      expect(g.nivelId).toBeDefined();
      expect(g.categoriaId).toBeDefined();
      expect(g.sedeId).toBeDefined();
      expect(typeof g.aforoMax).toBe('number');
      expect(typeof g.ocupados).toBe('number');
      expect(typeof g.alerta90).toBe('boolean');
    }
  });

  it('Escenario BDD 1: Creación exitosa de grupo con nombre, nivel Iniciación, sede Norte, días y cupo 20', () => {
    const nuevo = service.create({
      nombre: 'Iniciación Norte D',
      nivelId: 'NIV-01', // Iniciación
      categoriaId: 'CAT-02',
      sedeId: 'SEDE-NORTE-P1', // Sede Norte
      dias: ['Lunes', 'Miercoles'],
      aforoMax: 20,
    });

    expect(nuevo.grupoId).toBeDefined();
    expect(nuevo.nombre).toBe('Iniciación Norte D');
    expect(nuevo.nivelId).toBe('NIV-01');
    expect(nuevo.nivelNombre).toBe('Iniciación');
    expect(nuevo.sedeId).toBe('SEDE-NORTE-P1');
    expect(nuevo.sedeNombre).toBe('Norte');
    expect(nuevo.dias).toEqual(['Lunes', 'Miercoles']);
    expect(nuevo.aforoMax).toBe(20);
    expect(nuevo.ocupados).toBe(0);
    expect(nuevo.alerta90).toBe(false);
    expect(nuevo.estadoCupo).toBe('con-cupo');

    const listadoGeneral = service.findAll();
    expect(listadoGeneral.some((g) => g.grupoId === nuevo.grupoId)).toBe(true);
  });

  it('Escenario BDD 2: Validación de aforo máximo (alerta desde el 90% y bloqueo de inscripción al 100%)', () => {
    const grupo = service.create({
      nombre: 'Iniciación Control Aforo',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-02',
      sedeId: 'SEDE-SUR-P2',
      dias: ['Martes', 'Jueves'],
      aforoMax: 20,
      ocupados: 17, // 85% -> Con cupo (<90%)
    });

    expect(grupo.alerta90).toBe(false);
    expect(grupo.estadoCupo).toBe('con-cupo');
    expect(grupo.bloqueadoInscripcion).toBe(false);

    // Al inscribir al estudiante 18 (18/20 = 90%), activa alerta90 y estado warning
    const al90 = service.registrarInscripcionEnGrupo(grupo.grupoId);
    expect(al90.ocupados).toBe(18);
    expect(al90.alerta90).toBe(true);
    expect(al90.estadoCupo).toBe('alerta-90');
    expect(al90.bloqueadoInscripcion).toBe(false);

    // Inscribir estudiantes 19 y 20 (20/20 = 100%)
    service.registrarInscripcionEnGrupo(grupo.grupoId);
    const al100 = service.registrarInscripcionEnGrupo(grupo.grupoId);
    expect(al100.ocupados).toBe(20);
    expect(al100.alerta90).toBe(true);
    expect(al100.estadoCupo).toBe('lleno');
    expect(al100.bloqueadoInscripcion).toBe(true);

    // Cuando un estudiante o acudiente intenta inscribirse al 100% (20/20), bloquea la inscripción
    expect(() => service.registrarInscripcionEnGrupo(grupo.grupoId)).toThrow(
      BadRequestException,
    );
  });

  it('debe rechazar un grupo cuyo cupo exceda el aforo físico máximo de la sede (DEP-G4-01)', () => {
    // SEDE-SUR-P2 tiene aforoMaximoFisico = 20 en DEP-G4-01
    expect(() =>
      service.create({
        nombre: 'Grupo Sobrecupo Sur',
        nivelId: 'NIV-02',
        categoriaId: 'CAT-02',
        sedeId: 'SEDE-SUR-P2',
        dias: ['Martes', 'Jueves'],
        aforoMax: 25,
      }),
    ).toThrow(BadRequestException);
  });

  it('debe validar campos obligatorios al crear un grupo (nombre, sede, días, cupo)', () => {
    expect(() =>
      service.create({
        nombre: '   ',
        nivelId: 'NIV-01',
        sedeId: 'SEDE-NORTE-P1',
        dias: ['Lunes'],
        aforoMax: 15,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.create({
        nombre: 'Grupo Sin Días',
        nivelId: 'NIV-01',
        sedeId: 'SEDE-NORTE-P1',
        dias: [],
        aforoMax: 15,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.create({
        nombre: 'Grupo Cupo Inválido',
        nivelId: 'NIV-01',
        sedeId: 'SEDE-NORTE-P1',
        dias: ['Lunes'],
        aforoMax: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('debe crear un grupo correctamente con el formato legado', () => {
    const nuevo = service.create({
      nombre: 'Avanzado Nocturno',
      categoria: 'Avanzado',
      cupoMaximo: 15,
    });
    expect(nuevo.id).toBeDefined();
    expect(nuevo.nombre).toBe('Avanzado Nocturno');
  });

  it('debe rechazar horarios solapados en el mismo grupo', () => {
    expect(() =>
      service.agregarHorario('GRP-01', {
        dia: 'Martes',
        horaInicio: '16:00',
        horaFin: '18:00',
        pista: 'Pista Principal - El Salitre',
      }),
    ).toThrow(BadRequestException);
  });

  // ==========================================================================
  // PRUEBAS HU-3.2: ASIGNACIÓN DE PROFESORES Y ESCENARIO BDD 3
  // ==========================================================================

  it('Escenario BDD 3: debe emitir alerta de traslape y bloquear la asignación cuando Profesor Person ya tiene clase los lunes a las 14:00 (DEP-M6-01)', () => {
    // GRP-01 tiene horario el Lunes de 14:00 a 16:00, y Profesor Person (PROF-02) ya tiene clase los lunes a las 14:00 en DEP-M6-01
    const disponibilidad = service.listarProfesoresConDisponibilidad('GRP-01');
    const profesorPerson = disponibilidad.find(
      (p) => p.profesorId === 'PROF-02',
    );
    expect(profesorPerson).toBeDefined();
    expect(profesorPerson?.tieneConflicto).toBe(true);
    expect(profesorPerson?.detalleConflicto).toContain('lunes a las 14:00');

    expect(() =>
      service.asignarProfesor('GRP-01', {
        profesorId: 'PROF-02',
        profesorNombre: 'Profesor Person',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.asignarProfesoresMultiple('GRP-01', {
        profesoresIds: ['PROF-02'],
      }),
    ).toThrow(BadRequestException);
  });

  it('HU-3.2: debe permitir asignar múltiples profesores sin conflicto a un grupo y reflejarlo de inmediato en API-M3-02 (obtenerGruposPorProfesor)', () => {
    // GRP-02 (Intermedio Sur B: Mar y Jue 14:00) tiene libres a Ana Gómez (PROF-03) y Luis Rojas (PROF-04)
    const actualizado = service.asignarProfesoresMultiple('GRP-02', {
      profesoresIds: ['PROF-03', 'PROF-04'],
    });

    expect(
      actualizado.profesoresAsignados.some((p) => p.profesorId === 'PROF-04'),
    ).toBe(true);

    // API-M3-02: GET /api/v1/profesores/PROF-04/grupos
    const gruposDeLuis = service.obtenerGruposPorProfesor('PROF-04');
    expect(gruposDeLuis.some((g) => g.grupoId === 'GRP-02')).toBe(true);
    for (const g of gruposDeLuis) {
      expect(g.grupoId).toBeDefined();
      expect(g.nombreGrupo).toBeDefined();
      expect(g.rolDocente).toBeDefined();
      expect(Array.isArray(g.horarios)).toBe(true);
    }

    // Si ahora creamos otro grupo con horario Martes 14:00-16:00 e intentamos asignar a Ana Gómez (PROF-03), debe bloquear por cruce entre grupos
    const nuevoGrupoMartes = service.create({
      nombre: 'Transición Sur Tarde',
      nivelId: 'NIV-02',
      categoriaId: 'CAT-02',
      sedeId: 'SEDE-SUR-P2',
      dias: ['Martes'],
      aforoMax: 15,
    });
    service.agregarHorario(nuevoGrupoMartes.grupoId, {
      dia: 'Martes',
      horaInicio: '14:00',
      horaFin: '16:00',
      pista: 'Pista 2 · Sur',
    });

    expect(() =>
      service.asignarProfesor(nuevoGrupoMartes.grupoId, {
        profesorId: 'PROF-03',
        profesorNombre: 'Ana Gómez',
      }),
    ).toThrow(BadRequestException);
  });

  it('HU-3.2: debe permitir quitar un profesor de un grupo y actualizar inmediatamente su perfil en API-M3-02', () => {
    const antes = service.obtenerGruposPorProfesor('PROF-05');
    expect(antes.some((g) => g.grupoId === 'GRP-02')).toBe(true);

    service.desasignarProfesor('GRP-02', 'PROF-05');

    const despues = service.obtenerGruposPorProfesor('PROF-05');
    expect(despues.some((g) => g.grupoId === 'GRP-02')).toBe(false);
  });
});
