import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearPrestamoDto, RecibirPrestamoDto } from '../dto/prestamos.dto.js';
import { PrestamosRepository } from '../repositories/prestamos.repository.js';

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
      if (!uniforme) throw new NotFoundException('El implemento no está disponible');
      if (uniforme.tipo !== 'IMPLEMENTO') {
        throw new BadRequestException('Solo se pueden prestar implementos; las prendas quedan disponibles para venta');
      }
      if (uniforme.cantidadDisponible < dto.cantidad) {
        throw new BadRequestException('No hay cantidad suficiente para realizar el préstamo');
      }
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
      if (dto.estado === 'PERDIDA_DANO' && !dto.observacion?.trim()) {
        throw new BadRequestException('Debes explicar la pérdida o el daño');
      }
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
