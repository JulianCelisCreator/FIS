import { Injectable } from '@nestjs/common';
import type {
  CategoriaClubM2,
  IPuertoM2Deportivo,
  NivelTecnicoM2,
  PerfilDeportivoEstudianteM2,
} from '../interfaces/external-dependencies.interfaces.js';

@Injectable()
export class M2DeportivoMockAdapter implements IPuertoM2Deportivo {
  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M2-01
  private readonly nivelesTecnicosMock: NivelTecnicoM2[] = [
    {
      nivelId: 'NIV-01',
      nombre: 'Iniciación',
      descripcion:
        'Fundamentos de equilibrio, postura base, empuje inicial y frenado seguro',
      activo: true,
    },
    {
      nivelId: 'NIV-02',
      nombre: 'Transición',
      descripcion:
        'Técnica de cruce en curva, postura baja y coordinación de braceo',
      activo: true,
    },
    {
      nivelId: 'NIV-03',
      nombre: 'Intermedio',
      descripcion:
        'Rodaje en pelotón, series de resistencia y velocidad controlada en pista',
      activo: true,
    },
    {
      nivelId: 'NIV-04',
      nombre: 'Avanzado',
      descripcion:
        'Velocidad de competencia, relevos, sprints de 200m/500m y fondo de 1000m',
      activo: true,
    },
    {
      nivelId: 'NIV-05',
      nombre: 'Élite',
      descripcion:
        'Alto rendimiento competitivo para torneos distritales y nacionales',
      activo: true,
    },
  ];

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M2-02
  private readonly categoriasMock: CategoriaClubM2[] = [
    {
      categoriaId: 'CAT-01',
      nombre: 'Semillero (5 a 7 años)',
      edadMin: 5,
      edadMax: 7,
    },
    {
      categoriaId: 'CAT-02',
      nombre: 'Infantil A (8 a 10 años)',
      edadMin: 8,
      edadMax: 10,
    },
    {
      categoriaId: 'CAT-03',
      nombre: 'Infantil B (11 a 13 años)',
      edadMin: 11,
      edadMax: 13,
    },
    {
      categoriaId: 'CAT-04',
      nombre: 'Juvenil (14 a 17 años)',
      edadMin: 14,
      edadMax: 17,
    },
    {
      categoriaId: 'CAT-05',
      nombre: 'Mayores (18+ años)',
      edadMin: 18,
      edadMax: 65,
    },
  ];

  // TODO(INTEGRACION): Reemplazar arreglo temporal por consumo HTTP de DEP-M2-03
  private readonly perfilesEstudiantesMock: PerfilDeportivoEstudianteM2[] = [
    {
      estudianteId: 'EST-01',
      nombreCompleto: 'Sofía Ramírez',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-02',
      estadoDeportivo: 'ACTIVO',
    },
    {
      estudianteId: 'EST-02',
      nombreCompleto: 'Juan Pablo González',
      nivelId: 'NIV-03',
      categoriaId: 'CAT-05',
      estadoDeportivo: 'ACTIVO',
    },
    {
      estudianteId: 'EST-03',
      nombreCompleto: 'Mateo Valderrama',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-02',
      estadoDeportivo: 'ACTIVO',
    },
    {
      estudianteId: 'EST-04',
      nombreCompleto: 'Valentina Torres',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-03',
      estadoDeportivo: 'ACTIVO',
    },
  ];

  listarNivelesTecnicosActivos(): NivelTecnicoM2[] {
    return this.nivelesTecnicosMock.filter((n) => n.activo);
  }

  listarCategorias(): CategoriaClubM2[] {
    return this.categoriasMock;
  }

  obtenerPerfilDeportivo(estudianteId: string): PerfilDeportivoEstudianteM2 {
    return (
      this.perfilesEstudiantesMock.find(
        (p) => p.estudianteId === estudianteId,
      ) ?? {
        estudianteId,
        nombreCompleto: 'Estudiante',
        nivelId: 'NIV-01',
        categoriaId: 'CAT-02',
        estadoDeportivo: 'ACTIVO',
      }
    );
  }

  listarPerfilesDeportivos(): PerfilDeportivoEstudianteM2[] {
    return this.perfilesEstudiantesMock;
  }
}
