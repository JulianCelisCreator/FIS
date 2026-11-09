import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GruposService } from './grupos.service';

describe('GruposService', () => {
  let service: GruposService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GruposService],
    }).compile();

    service = module.get<GruposService>(GruposService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear un grupo correctamente', () => {
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
});
