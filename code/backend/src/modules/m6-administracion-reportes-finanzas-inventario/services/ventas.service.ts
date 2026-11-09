import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { RegistrarVentaDto } from '../dto/ventas.dto.js';
import { RegistroFinancieroVentaRepository } from '../repositories/registro-financiero-venta.repository.js';
import { VentasRepository } from '../repositories/ventas.repository.js';
import { construirLineas, consolidarItems, describirVenta, ErrorReglaVenta } from '../utils/reglas-venta.js';

/** Venta de uniformes (HU-6.7 / RF-M6-07). */
@Injectable()
export class VentasService {
  constructor(
    private readonly ventas: VentasRepository,
    private readonly registroFinanciero: RegistroFinancieroVentaRepository,
    private readonly baseDatos: BaseDatosService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar(buscar?: string) {
    return this.ventas.listar(buscar);
  }

  listarCompradores() {
    return this.ventas.listarCompradores();
  }

  async detalle(id: number) {
    const venta = await this.ventas.detalle(id);
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return venta;
  }

  /**
   * Registra la venta, su asiento financiero en M5 y el descuento del inventario
   * en una sola transacción: si cualquier paso falla no queda nada registrado.
   */
  async registrar(usuario: UsuarioAutenticado, dto: RegistrarVentaDto) {
    try {
      const ventaId = await this.baseDatos.transaccion(async (consultor) => {
        const comprador = await this.ventas.resolverComprador(
          dto.patinadorId,
          dto.compradorTipo,
          dto.acudienteId,
          consultor,
        );
        if (!comprador) {
          throw new BadRequestException(
            dto.compradorTipo === 'PATINADOR'
              ? 'El patinador no existe o no está activo'
              : 'El acudiente no está vinculado a ese patinador o su cuenta no está activa',
          );
        }

        const items = consolidarItems(dto.items);
        const uniformes = await this.ventas.bloquearUniformes(
          items.map((item) => item.uniformeId),
          consultor,
        );
        const { lineas, total } = construirLineas(items, uniformes);

        const asiento = await this.registroFinanciero.registrar(consultor, {
          patinadorId: dto.patinadorId,
          total,
          descripcion: describirVenta(lineas),
          medioPago: dto.medioPago,
          referenciaPago: dto.referenciaPago?.trim() || null,
          usuarioId: usuario.id,
        });

        const id = await this.ventas.crear(
          {
            patinadorId: dto.patinadorId,
            compradorTipo: dto.compradorTipo,
            compradorId: comprador.compradorId,
            total,
            medioPago: dto.medioPago,
            cobroId: asiento.cobroId,
            pagoId: asiento.pagoId,
            usuarioId: usuario.id,
          },
          lineas,
          consultor,
        );

        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'venta_uniforme',
          registroId: id,
          accion: 'CREAR',
          valorNuevo: {
            patinadorId: dto.patinadorId,
            compradorTipo: dto.compradorTipo,
            compradorId: comprador.compradorId,
            medioPago: dto.medioPago,
            total,
            comprobante: asiento.comprobanteNumero,
            items: lineas,
          },
          usuarioId: usuario.id,
        });
        return id;
      });
      return this.detalle(ventaId);
    } catch (error: unknown) {
      throw this.traducirError(error);
    }
  }

  private traducirError(error: unknown): unknown {
    if (error instanceof ErrorReglaVenta) return new BadRequestException(error.message);
    if (error instanceof Error && error.message === 'STOCK_INSUFICIENTE') {
      return new BadRequestException('Las existencias cambiaron mientras se registraba la venta; vuelve a intentarlo');
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23514') {
      return new BadRequestException('La venta no cumple las reglas de inventario o de pago');
    }
    return error;
  }
}
