
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { CobrosService } from './cobros.service.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { CobrosRepository } from '../repositories/cobros.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';

describe('CobrosService - revisión diaria de cartera', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('consulta los estados de cartera y registra sus cantidades', async () => {
    const resultado = {
      vencidos: 2,
      pendientes: 3,
      alDia: 5,
    };

    const consultar = vi.fn().mockResolvedValue([resultado]);

    const baseDatos = {
      consultar,
    } as unknown as BaseDatosService;

    const cobros = {} as CobrosRepository;
    const patinadores = {} as PatinadoresRepository;

    const servicio = new CobrosService(
      baseDatos,
      cobros,
      patinadores,
    );

    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});

    await servicio.revisarEstadoCartera();

    expect(consultar).toHaveBeenCalledOnce();
    expect(consultar.mock.calls[0][0]).toContain(
      'FROM v_estado_cartera',
    );

    expect(logSpy).toHaveBeenCalledWith(
      'Revisión diaria de cartera: 2 vencidos, 3 pendientes, 5 al día',
    );
  });
});
