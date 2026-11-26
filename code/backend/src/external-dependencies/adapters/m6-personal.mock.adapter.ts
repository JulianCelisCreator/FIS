import { Injectable } from '@nestjs/common';
import type {
  DisponibilidadPersonalM6,
  IPuertoM6Personal,
} from '../interfaces/external-dependencies.interfaces.js';

@Injectable()
export class M6PersonalMockAdapter implements IPuertoM6Personal {
  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M6-01
  private readonly disponibilidadesMock: DisponibilidadPersonalM6[] = [
    {
      personalId: 'PROF-01',
      cargo: 'Entrenador Principal de Velocidad',
      estadoContrato: 'ACTIVO',
      disponibilidad: [
        { diaSemana: 'Lunes', horaInicio: '07:00', horaFin: '18:00' },
        { diaSemana: 'Martes', horaInicio: '07:00', horaFin: '18:00' },
        { diaSemana: 'Miercoles', horaInicio: '07:00', horaFin: '18:00' },
        { diaSemana: 'Jueves', horaInicio: '07:00', horaFin: '18:00' },
        { diaSemana: 'Viernes', horaInicio: '07:00', horaFin: '18:00' },
        { diaSemana: 'Sabado', horaInicio: '07:00', horaFin: '14:00' },
      ],
      bloquesOcupadosExternos: [],
    },
    {
      personalId: 'PROF-02',
      cargo: 'Entrenador de Iniciación (Profesor Person)',
      estadoContrato: 'ACTIVO',
      disponibilidad: [
        { diaSemana: 'Lunes', horaInicio: '08:00', horaFin: '18:00' },
        { diaSemana: 'Martes', horaInicio: '08:00', horaFin: '18:00' },
        { diaSemana: 'Miercoles', horaInicio: '08:00', horaFin: '18:00' },
        { diaSemana: 'Jueves', horaInicio: '08:00', horaFin: '18:00' },
      ],
      // Escenario BDD 3: Profesor Person ya tiene clase programada los lunes a las 14:00
      bloquesOcupadosExternos: [
        {
          diaSemana: 'Lunes',
          horaInicio: '14:00',
          horaFin: '16:00',
          motivo: 'Clase programada de fundamentación técnica (Lunes 14:00)',
        },
        {
          diaSemana: 'Martes',
          horaInicio: '14:00',
          horaFin: '16:00',
          motivo: 'Sesión técnica asignada (Martes 14:00)',
        },
      ],
    },
    {
      personalId: 'PROF-03',
      cargo: 'Entrenadora de Transición e Intermedio',
      estadoContrato: 'ACTIVO',
      disponibilidad: [
        { diaSemana: 'Lunes', horaInicio: '07:00', horaFin: '19:00' },
        { diaSemana: 'Martes', horaInicio: '07:00', horaFin: '19:00' },
        { diaSemana: 'Miercoles', horaInicio: '07:00', horaFin: '19:00' },
        { diaSemana: 'Jueves', horaInicio: '07:00', horaFin: '19:00' },
        { diaSemana: 'Viernes', horaInicio: '07:00', horaFin: '19:00' },
      ],
      bloquesOcupadosExternos: [],
    },
    {
      personalId: 'PROF-04',
      cargo: 'Entrenador de Velocidad Pura',
      estadoContrato: 'ACTIVO',
      disponibilidad: [
        { diaSemana: 'Lunes', horaInicio: '06:00', horaFin: '18:00' },
        { diaSemana: 'Martes', horaInicio: '06:00', horaFin: '18:00' },
        { diaSemana: 'Miercoles', horaInicio: '06:00', horaFin: '18:00' },
        { diaSemana: 'Jueves', horaInicio: '06:00', horaFin: '18:00' },
        { diaSemana: 'Viernes', horaInicio: '06:00', horaFin: '18:00' },
        { diaSemana: 'Sabado', horaInicio: '07:00', horaFin: '15:00' },
      ],
      bloquesOcupadosExternos: [],
    },
    {
      personalId: 'PROF-05',
      cargo: 'Entrenador Asistente',
      estadoContrato: 'ACTIVO',
      disponibilidad: [
        { diaSemana: 'Martes', horaInicio: '08:00', horaFin: '18:00' },
        { diaSemana: 'Jueves', horaInicio: '08:00', horaFin: '18:00' },
        { diaSemana: 'Viernes', horaInicio: '08:00', horaFin: '18:00' },
        { diaSemana: 'Sabado', horaInicio: '08:00', horaFin: '14:00' },
      ],
      bloquesOcupadosExternos: [],
    },
  ];

  obtenerDisponibilidadDocente(
    personalId: string,
  ): DisponibilidadPersonalM6 | undefined {
    return this.disponibilidadesMock.find((d) => d.personalId === personalId);
  }

  listarDisponibilidadesDocentes(): DisponibilidadPersonalM6[] {
    return this.disponibilidadesMock;
  }
}
