import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExternalDependenciesModule } from '../external-dependencies/external-dependencies.module.js';
import { GruposService } from './grupos.service.js';

describe('GruposService (HU-3.1, HU-3.2, HU-3.3 y HU-3.4)', () => {
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
      nivelId: 'NIV-01',
      categoriaId: 'CAT-02',
      sedeId: 'SEDE-NORTE-P1',
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
      ocupados: 17,
    });

    expect(grupo.alerta90).toBe(false);
    expect(grupo.estadoCupo).toBe('con-cupo');
    expect(grupo.bloqueadoInscripcion).toBe(false);

    const al90 = service.registrarInscripcionEnGrupo(grupo.grupoId);
    expect(al90.ocupados).toBe(18);
    expect(al90.alerta90).toBe(true);
    expect(al90.estadoCupo).toBe('alerta-90');
    expect(al90.bloqueadoInscripcion).toBe(false);

    service.registrarInscripcionEnGrupo(grupo.grupoId);
    const al100 = service.registrarInscripcionEnGrupo(grupo.grupoId);
    expect(al100.ocupados).toBe(20);
    expect(al100.alerta90).toBe(true);
    expect(al100.estadoCupo).toBe('lleno');
    expect(al100.bloqueadoInscripcion).toBe(true);

    expect(() => service.registrarInscripcionEnGrupo(grupo.grupoId)).toThrow(
      BadRequestException,
    );
  });

  it('debe rechazar un grupo cuyo cupo exceda el aforo físico máximo de la sede (DEP-G4-01)', () => {
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
    const actualizado = service.asignarProfesoresMultiple('GRP-02', {
      profesoresIds: ['PROF-03', 'PROF-04'],
    });

    expect(
      actualizado.profesoresAsignados.some((p) => p.profesorId === 'PROF-04'),
    ).toBe(true);

    const gruposDeLuis = service.obtenerGruposPorProfesor('PROF-04');
    expect(gruposDeLuis.some((g) => g.grupoId === 'GRP-02')).toBe(true);
    for (const g of gruposDeLuis) {
      expect(g.grupoId).toBeDefined();
      expect(g.nombreGrupo).toBeDefined();
      expect(g.rolDocente).toBeDefined();
      expect(Array.isArray(g.horarios)).toBe(true);
    }

    const nuevoGrupoJueves = service.create({
      nombre: 'Transición Salitre Tarde',
      nivelId: 'NIV-02',
      categoriaId: 'CAT-02',
      sedeId: 'SEDE-SALITRE-P1',
      dias: ['Jueves'],
      aforoMax: 15,
    });
    service.agregarHorario(nuevoGrupoJueves.grupoId, {
      dia: 'Jueves',
      horaInicio: '14:00',
      horaFin: '16:00',
      pista: 'Pista Principal - El Salitre',
    });

    expect(() =>
      service.asignarProfesor(nuevoGrupoJueves.grupoId, {
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

  // ==========================================================================
  // PRUEBAS HU-3.3: PROGRAMACIÓN DE HORARIOS, ANTI-SOLAPAMIENTO Y DEP-M1-05
  // ==========================================================================

  it('HU-3.3: debe exponer API-M3-03 en listarHorarios() filtrable por grupo y sede', () => {
    const todos = service.listarHorarios();
    expect(todos.length).toBeGreaterThanOrEqual(5);
    for (const h of todos) {
      expect(h.horarioId).toBeDefined();
      expect(h.grupoId).toBeDefined();
      expect(h.diaSemana).toBeDefined();
      expect(h.horaInicio).toBeDefined();
      expect(h.horaFin).toBeDefined();
      expect(h.sedeId).toBeDefined();
      expect(h.estado).toBeDefined();
    }

    const soloNorte = service.listarHorarios({ sedeId: 'SEDE-NORTE-P1' });
    expect(soloNorte.every((h) => h.sedeId === 'SEDE-NORTE-P1')).toBe(true);

    const soloGrp02 = service.listarHorarios({ grupoId: 'GRP-02' });
    expect(soloGrp02.every((h) => h.grupoId === 'GRP-02')).toBe(true);
  });

  it('HU-3.3: debe bloquear el solapamiento de pista/sede entre dos grupos distintos (DEP-G4-01)', () => {
    expect(() =>
      service.crearHorario({
        grupoId: 'GRP-03',
        diaSemana: 'Lunes',
        horaInicio: '14:00',
        horaFin: '16:00',
        sedeId: 'SEDE-NORTE-P1',
        pista: 'Pista 1 · Norte',
      }),
    ).toThrow(BadRequestException);
  });

  it('HU-3.3: debe reprogramar una franja horaria y disparar automáticamente una notificación auditable en DEP-M1-05', () => {
    const notificacionesAntes = service.listarNotificacionesHorarios().length;

    const resultado = service.actualizarHorario('HOR-06', {
      diaSemana: 'Jueves',
      horaInicio: '08:00',
      horaFin: '10:00',
    });

    expect(resultado.horario.diaSemana).toBe('Jueves');
    expect(resultado.horario.estado).toBe('REPROGRAMADO');
    expect(resultado.notificacion).not.toBeNull();
    expect(resultado.notificacion?.asunto).toContain('Reprogramación');

    const notificacionesDespues = service.listarNotificacionesHorarios().length;
    expect(notificacionesDespues).toBe(notificacionesAntes + 1);
  });

  it('HU-3.3: debe anular una franja horaria con motivo obligatorio y disparar notificación en DEP-M1-05', () => {
    expect(() => service.cancelarHorario('HOR-05', { motivo: '   ' })).toThrow(
      BadRequestException,
    );

    const resultado = service.cancelarHorario('HOR-05', {
      motivo: 'Mantenimiento preventivo del recubrimiento de la pista Norte',
    });

    expect(resultado.horario.estado).toBe('CANCELADO');
    expect(resultado.notificacion).not.toBeNull();
    expect(resultado.notificacion?.asunto).toContain('Cancelación');
    expect(resultado.notificacion?.mensaje).toContain(
      'Mantenimiento preventivo',
    );
  });

  // ==========================================================================
  // PRUEBAS HU-3.4: SELECCIÓN Y CAMBIO DE GRUPO Y API-M3-04
  // ==========================================================================

  it('HU-3.4: Regla 1 - debe bloquear autogestión de cambio de grupo si el estudiante es menor de edad (DEP-M1-03), permitiéndolo solo a su acudiente autorizado', () => {
    // EST-01 (Sofía Ramírez, 10 años, menor de edad) intenta cambiar por sí misma como ESTUDIANTE
    const contextoMenor = service.obtenerContextoAutogestionGrupo(
      'EST-01',
      'ESTUDIANTE',
    );
    expect(contextoMenor.puedeGestionarCambio).toBe(false);
    expect(contextoMenor.motivoBloqueoActor).toContain('menores de edad');

    expect(() =>
      service.inscribirOCambiarGrupoEstudiante({
        estudianteId: 'EST-01',
        grupoDestinoId: 'GRP-04',
        actorRol: 'ESTUDIANTE',
      }),
    ).toThrow(BadRequestException);

    // EST-03 (Mateo Valderrama, menor sin autorización firmada en DEP-M1-03) también se bloquea
    expect(() =>
      service.inscribirOCambiarGrupoEstudiante({
        estudianteId: 'EST-03',
        grupoDestinoId: 'GRP-04',
        actorRol: 'ACUDIENTE',
        acudienteId: 'ACU-02',
      }),
    ).toThrow(BadRequestException);
  });

  it('HU-3.4: Regla 2 - debe bloquear inscripción o cambio si el estudiante no tiene póliza vigente (DEP-M1-04) o cartera al día (DEP-G4-02)', () => {
    // EST-04 (Valentina Torres) tiene póliza vencida en DEP-M1-04 y cartera vencida en DEP-G4-02
    expect(() =>
      service.inscribirOCambiarGrupoEstudiante({
        estudianteId: 'EST-04',
        grupoDestinoId: 'GRP-05',
        actorRol: 'ACUDIENTE',
        acudienteId: 'ACU-03',
      }),
    ).toThrow(BadRequestException);
  });

  it('HU-3.4: Regla 3 (Escenario BDD 2) - debe revalidar atómicamente el cupo al confirmar y bloquear si el grupo destino está al 100% (20/20)', () => {
    // GRP-06 (Iniciación Norte C) tiene 20/20 cupos ocupados (100% lleno)
    expect(() =>
      service.inscribirOCambiarGrupoEstudiante({
        estudianteId: 'EST-01',
        grupoDestinoId: 'GRP-06',
        actorRol: 'ACUDIENTE',
        acudienteId: 'ACU-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('HU-3.4: Regla 4 y API-M3-04 - debe liberar de inmediato el cupo del grupo anterior al cambiar de grupo y reflejar la inscripción en obtenerEstudiantesDeGrupo()', () => {
    // EST-01 (Sofía Ramírez) está inicialmente en GRP-01 (12/20 ocupados) y pasa a GRP-05 (Iniciación Sur A, 18/20 ocupados)
    const antesGrp01 = service.findOne('GRP-01').ocupados;
    const antesGrp05 = service.findOne('GRP-05').ocupados;
    expect(antesGrp01).toBe(12);
    expect(antesGrp05).toBe(18);

    const resultado = service.inscribirOCambiarGrupoEstudiante({
      estudianteId: 'EST-01',
      grupoDestinoId: 'GRP-05',
      actorRol: 'ACUDIENTE',
      acudienteId: 'ACU-01',
    });

    expect(resultado.tipoOperacion).toBe('CAMBIO_GRUPO');
    expect(resultado.grupoAnterior?.grupoId).toBe('GRP-01');
    expect(resultado.grupoAnterior?.ocupados).toBe(11); // Cupo anterior liberado de inmediato (12 -> 11)
    expect(resultado.grupoNuevo.grupoId).toBe('GRP-05');
    expect(resultado.grupoNuevo.ocupados).toBe(19); // Nuevo cupo ocupado (18 -> 19)

    // API-M3-04: GET /api/v1/grupos/GRP-05/estudiantes
    const estudiantesGrp05 = service.obtenerEstudiantesDeGrupo('GRP-05');
    expect(
      estudiantesGrp05.some(
        (e) => e.estudianteId === 'EST-01' && e.estado === 'ACTIVO',
      ),
    ).toBe(true);
    for (const est of estudiantesGrp05) {
      expect(est.estudianteId).toBeDefined();
      expect(est.fechaInscripcion).toBeDefined();
      expect(est.estado).toBeDefined();
    }
  });
});
