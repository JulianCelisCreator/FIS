import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearPrestamoDto, RecibirPrestamoDto } from '../dto/prestamos.dto.js';
import { PrestamosRepository } from '../repositories/prestamos.repository.js';
import {
  calcularCobroPrestamo,
  ErrorReglaPrestamo,
  validarPrestamo,
  validarRecepcion,
} from '../utils/reglas-prestamo.js';

/** Ejecuta una regla de préstamo y traduce su error a la respuesta HTTP. */
function aplicarRegla<T>(regla: () => T): T {
  try {
    return regla();
  } catch (error) {
    if (!(error instanceof ErrorReglaPrestamo)) throw error;
    throw error.motivo === 'NO_ENCONTRADO'
      ? new NotFoundException(error.message)
      : new BadRequestException(error.message);
  }
}

/** Préstamo y devolución de implementos (HU-6.8 / RF-M6-08). */
@Injectable()
export class PrestamosService {
  constructor(
    private readonly prestamos: PrestamosRepository,
    private readonly baseDatos: BaseDatosService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar() {
    return this.prestamos.listar();
  }

  listarPatinadores() {
    return this.prestamos.listarPatinadores();
  }

  /**
   * Registra el préstamo, su cobro en M5 (tarifa × cantidad × días), el
   * descuento de stock y el Kardex en una sola transacción.
   */
  async crear(usuario: UsuarioAutenticado, dto: CrearPrestamoDto) {
    const id = await this.baseDatos.transaccion(async (consultor) => {
      if (!await this.prestamos.participantesValidos(dto.patinadorId, dto.responsableId, consultor)) {
        throw new BadRequestException(
          'El patinador debe estar activo y el responsable debe ser él mismo o un acudiente vinculado',
        );
      }
      const encontrado = await this.prestamos.uniformeApto(dto.uniformeId, consultor);
      const uniforme = aplicarRegla(() => validarPrestamo(encontrado, dto.cantidad));
      const tarifaDia = dto.valorPorUnidad ?? uniforme.tarifaPrestamoDia;
      const hoy = await this.prestamos.hoy(consultor);
      const cobro = aplicarRegla(() =>
        calcularCobroPrestamo(tarifaDia, dto.cantidad, hoy, dto.fechaDevolucionPrevista),
      );
      const descripcion =
        `Préstamo de ${uniforme.referencia} · ${dto.cantidad} ` +
        `unidad${dto.cantidad === 1 ? '' : 'es'} · ${cobro.dias} día${cobro.dias === 1 ? '' : 's'}`;
      const creado = await this.prestamos.crear(dto, tarifaDia, cobro, descripcion, usuario.id, consultor);
      await this.auditoria.registrar(consultor, {
        modulo: 'M6',
        tabla: 'prestamo_uniforme',
        registroId: creado.id,
        accion: 'CREAR',
        valorNuevo: { ...dto, tarifaDia, dias: cobro.dias, valorCobro: cobro.valor, cobroId: creado.cobroId },
        usuarioId: usuario.id,
      });
      return creado.id;
    });
    return this.detalle(id);
  }

  async detalle(id: number) {
    const [prestamo] = await this.prestamos.listar(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    return prestamo;
  }

  async recibir(id: number, usuario: UsuarioAutenticado, dto: RecibirPrestamoDto) {
    await this.baseDatos.transaccion(async (consultor) => {
      aplicarRegla(() => validarRecepcion(dto));
      const recibido = await this.prestamos.recibir(id, dto, usuario.id, consultor);
      if (!recibido) throw new NotFoundException('Préstamo activo no encontrado');
      await this.auditoria.registrar(consultor, {
        modulo: 'M6',
        tabla: 'prestamo_uniforme',
        registroId: id,
        accion: dto.estado === 'DEVUELTO' ? 'DEVOLVER' : 'PERDIDA_DANO',
        valorNuevo: dto,
        usuarioId: usuario.id,
      });
    });
    return this.detalle(id);
  }
}
