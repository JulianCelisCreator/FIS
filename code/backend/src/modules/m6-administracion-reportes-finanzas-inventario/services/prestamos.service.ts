import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearPrestamoDto, RecibirPrestamoDto } from '../dto/prestamos.dto.js';
import { PrestamosRepository } from '../repositories/prestamos.repository.js';
import { ErrorReglaPrestamo, validarPrestamo, validarRecepcion } from '../utils/reglas-prestamo.js';

/** Ejecuta una regla de préstamo y traduce su error a la respuesta HTTP. */
function aplicarRegla(regla: () => void): void {
  try {
    regla();
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

  async crear(usuario: UsuarioAutenticado, dto: CrearPrestamoDto) {
    return this.baseDatos.transaccion(async (consultor) => {
      if (!await this.prestamos.participantesValidos(dto.patinadorId, dto.responsableId, consultor)) {
        throw new BadRequestException('El responsable debe ser el patinador o un acudiente vinculado');
      }
      if (!await this.prestamos.fechaDevolucionValida(dto.fechaDevolucionPrevista, consultor)) {
        throw new BadRequestException('La fecha prevista debe ser hoy o posterior');
      }
      const uniforme = await this.prestamos.uniformeApto(dto.uniformeId, consultor);
      aplicarRegla(() => validarPrestamo(uniforme, dto.cantidad));
      const creado = await this.prestamos.crear(dto, usuario.id, consultor);
      await this.auditoria.registrar(consultor, {
        modulo: 'M6',
        tabla: 'prestamo_uniforme',
        registroId: creado.id,
        accion: 'CREAR',
        valorNuevo: dto,
        usuarioId: usuario.id,
      });
      return creado;
    });
  }

  async recibir(id: number, usuario: UsuarioAutenticado, dto: RecibirPrestamoDto) {
    return this.baseDatos.transaccion(async (consultor) => {
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
      return recibido;
    });
  }
}
