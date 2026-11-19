import { Injectable } from '@nestjs/common';
import type {
  EstadoPlanCarteraG4,
  IPuertoG4SedesCartera,
  SedePistaG4,
} from '../interfaces/external-dependencies.interfaces.js';

@Injectable()
export class G4SedesCarteraMockAdapter implements IPuertoG4SedesCartera {
  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-G4-01
  private readonly sedesYPistasMock: SedePistaG4[] = [
    {
      sedeId: 'SEDE-NORTE-P1',
      nombreSede: 'Norte',
      pista: 'Pista 1 · Norte',
      aforoMaximoFisico: 25,
    },
    {
      sedeId: 'SEDE-SUR-P2',
      nombreSede: 'Sur',
      pista: 'Pista 2 · Sur',
      aforoMaximoFisico: 20,
    },
    {
      sedeId: 'SEDE-SALITRE-P1',
      nombreSede: 'El Salitre',
      pista: 'Pista Principal - El Salitre',
      aforoMaximoFisico: 30,
    },
  ];

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-G4-02
  private readonly planesYCarteraMock: EstadoPlanCarteraG4[] = [
    {
      estudianteId: 'EST-01',
      nombrePlan: 'Mensual 3 días/semana',
      planActivo: true,
      alDiaEnPagos: true,
      estadoCartera: 'AL_DIA',
      limiteClasesSemanales: 3,
    },
    {
      estudianteId: 'EST-02',
      nombrePlan: 'Mensual 6 días/semana',
      planActivo: true,
      alDiaEnPagos: true,
      estadoCartera: 'AL_DIA',
      limiteClasesSemanales: 6,
    },
    {
      estudianteId: 'EST-03',
      nombrePlan: 'Mensual 3 días/semana',
      planActivo: true,
      alDiaEnPagos: true,
      estadoCartera: 'AL_DIA',
      limiteClasesSemanales: 3,
    },
    {
      estudianteId: 'EST-04',
      nombrePlan: 'Mensual 3 días/semana',
      planActivo: true,
      alDiaEnPagos: false,
      estadoCartera: 'VENCIDO',
      limiteClasesSemanales: 3,
    },
  ];

  listarSedesYPistas(): SedePistaG4[] {
    return this.sedesYPistasMock;
  }

  obtenerSedePorId(sedeId: string): SedePistaG4 | undefined {
    return this.sedesYPistasMock.find(
      (s) =>
        s.sedeId === sedeId ||
        s.nombreSede.toLowerCase() === sedeId.toLowerCase(),
    );
  }

  obtenerEstadoPlanYCartera(estudianteId: string): EstadoPlanCarteraG4 {
    return (
      this.planesYCarteraMock.find((p) => p.estudianteId === estudianteId) ?? {
        estudianteId,
        nombrePlan: 'Sin plan activo',
        planActivo: false,
        alDiaEnPagos: false,
        estadoCartera: 'VENCIDO',
        limiteClasesSemanales: 0,
      }
    );
  }

  listarEstadosPlanYCartera(): EstadoPlanCarteraG4[] {
    return this.planesYCarteraMock;
  }
}
