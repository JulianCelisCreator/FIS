import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { FiltrosCarteraDto } from '../dto/consultas.dto.js';
import { CarteraRepository } from '../repositories/cartera.repository.js';

/**
 * Consulta del estado de cartera de los patinadores (RF-M5-13), para el
 * Administrador y el Contador. El estado lo calcula la base (RF-M5-12): nadie
 * lo edita y siempre está al día con los cobros y pagos registrados.
 */
@Injectable()
export class CarteraService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly cartera: CarteraRepository,
  ) {}

  async consultar(filtros: FiltrosCarteraDto) {
    if (filtros.venceDesde && filtros.venceHasta && filtros.venceDesde > filtros.venceHasta) {
      throw new BadRequestException('«Vence desde» no puede ser posterior a «Vence hasta»');
    }
    const consultor = this.baseDatos.consultor;
    const [resumen, patinadores] = await Promise.all([
      this.cartera.resumen(consultor),
      this.cartera.listar(consultor, filtros),
    ]);
    return { resumen, patinadores };
  }
}
