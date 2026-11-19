import { Injectable } from '@nestjs/common';
import type {
  CompetenciaEventoM4,
  IPuertoM4Competencias,
} from '../interfaces/external-dependencies.interfaces.js';

@Injectable()
export class M4CompetenciasMockAdapter implements IPuertoM4Competencias {
  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M4-01
  private readonly competenciasMock: CompetenciaEventoM4[] = [
    {
      competenciaId: 'COMP-01',
      titulo: 'Torneo Regional de Velocidad',
      fechaInicio: '2026-10-10T09:00:00Z',
      fechaFin: '2026-10-10T16:00:00Z',
      sedeId: 'SEDE-NORTE-P1',
      categorias: ['CAT-02', 'CAT-03', 'CAT-04'],
      tipoEvento: 'COMPETENCIA',
    },
    {
      competenciaId: 'COMP-02',
      titulo: 'Festival Distrital de Escuelas',
      fechaInicio: '2026-10-24T08:00:00Z',
      fechaFin: '2026-10-24T14:00:00Z',
      sedeId: 'SEDE-SALITRE-P1',
      categorias: ['CAT-01', 'CAT-02'],
      tipoEvento: 'COMPETENCIA',
    },
    {
      competenciaId: 'COMP-03',
      titulo: 'Chequeo Técnico Clasificatorio',
      fechaInicio: '2026-10-17T08:30:00Z',
      fechaFin: '2026-10-17T12:30:00Z',
      sedeId: 'SEDE-SUR-P2',
      categorias: ['CAT-03', 'CAT-04', 'CAT-05'],
      tipoEvento: 'COMPETENCIA',
    },
  ];

  listarCompetenciasPublicadas(
    fechaInicio?: string,
    fechaFin?: string,
  ): CompetenciaEventoM4[] {
    return this.competenciasMock.filter((c) => {
      if (fechaInicio && c.fechaFin < fechaInicio) return false;
      if (fechaFin && c.fechaInicio > fechaFin) return false;
      return true;
    });
  }
}
