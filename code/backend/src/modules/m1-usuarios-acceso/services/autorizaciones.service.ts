import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import {
  Rol,
  type UsuarioAutenticado,
} from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import { UsuariosRepository } from '../repositories/usuarios.repository.js';
import type { RegistrarAutorizacionDto } from '../dto/registrar-autorizacion.dto.js';
import {
  AutorizacionesRepository,
  type PatinadorConAutorizacion,
} from '../repositories/autorizaciones.repository.js';
import {
  MENSAJE_PATINADOR_INACTIVO,
  MENSAJE_SIN_ACCESO,
  MENSAJE_SIN_ACUDIENTE,
  MENSAJE_SOLO_MENOR,
  validarConsultaAutorizacion,
  validarRegistroAutorizacion,
} from '../validators/autorizacion.validator.js';
import {
  TEXTO_AUTORIZACION,
  VERSION_TEXTO_AUTORIZACION,
} from '../utils/texto-autorizacion.js';

export const MENSAJE_TEXTO_ACTUALIZADO =
  'El texto de la autorización cambió. Vuelve a abrirlo y acéptalo de nuevo.';
/** HU-M1-04 CA-05 (decisión del equipo): firmar autorizaciones exige el correo verificado. */
export const MENSAJE_CORREO_SIN_VERIFICAR =
  'Para registrar autorizaciones primero verifica tu correo: abre el enlace que te enviamos o usa «Reenviar enlace» en el aviso de arriba.';

/** Detalle que abre la Card «Autorización del acudiente» (HU-M1-09). */
export interface DetalleAutorizacion extends PatinadorConAutorizacion {
  puedeRegistrar: boolean;
  motivoNoRegistra: string | null;
  texto: { version: string; contenido: string };
}

/**
 * HU-M1-09 · Autorización del acudiente (RF-M1-09).
 *
 * El Acudiente registra la autorización de sus patinadores menores y el
 * Administrador puede hacerlo en su nombre. La autorización no se edita: se
 * guarda una sola vez con la identidad del acudiente, la fecha y hora y la
 * versión del texto aceptado. El estado del perfil se deriva de
 * v_perfil_patinador, que también exige póliza vigente (HU-M1-10).
 */
@Injectable()
export class AutorizacionesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly autorizaciones: AutorizacionesRepository,
    private readonly auditoria: AuditoriaRepository,
    private readonly usuarios: UsuariosRepository,
  ) {}

  /**
   * HU-M1-04 CA-05: el Acudiente que firma por sí mismo necesita el correo
   * verificado. El Administrador que registra en nombre del acudiente no.
   */
  private async faltaVerificarCorreo(consultor: Consultor, usuario: UsuarioAutenticado): Promise<boolean> {
    if (usuario.roles.includes(Rol.ADMINISTRADOR)) return false;
    const cuenta = await this.usuarios.buscarParaVerificacion(consultor, { id: usuario.id });
    return !cuenta?.correoVerificado;
  }

  /** Patinadores del acudiente (o todos, si es Administrador) con su estado. */
  listar(usuario: UsuarioAutenticado): Promise<PatinadorConAutorizacion[]> {
    if (
      !usuario.roles.includes(Rol.ADMINISTRADOR) &&
      !usuario.roles.includes(Rol.ACUDIENTE)
    ) {
      throw new ForbiddenException(MENSAJE_SIN_ACCESO);
    }
    return this.autorizaciones.listar(this.baseDatos.consultor, {
      todos: usuario.roles.includes(Rol.ADMINISTRADOR),
      usuarioId: usuario.id,
    });
  }

  async detalle(
    usuario: UsuarioAutenticado,
    patinadorId: number,
  ): Promise<DetalleAutorizacion> {
    const patinador = await this.autorizaciones.obtenerDetalle(
      this.baseDatos.consultor,
      patinadorId,
    );
    validarConsultaAutorizacion(usuario, patinador);
    return this.conAcciones(patinador, await this.faltaVerificarCorreo(this.baseDatos.consultor, usuario));
  }

  /**
   * CA-01: registra la autorización una sola vez. El bloqueo del patinador y
   * el índice único de la base impiden duplicados si llegan dos solicitudes.
   */
  async registrar(
    usuario: UsuarioAutenticado,
    patinadorId: number,
    dto: RegistrarAutorizacionDto,
  ): Promise<DetalleAutorizacion> {
    return this.baseDatos.transaccion(async (consultor) => {
      await this.autorizaciones.bloquear(consultor, patinadorId);
      const patinador = await this.autorizaciones.obtenerDetalle(
        consultor,
        patinadorId,
      );
      const { acudienteId } = validarRegistroAutorizacion(
        usuario,
        patinador,
        dto.acudienteId,
      );

      if (await this.faltaVerificarCorreo(consultor, usuario)) {
        throw new ForbiddenException(MENSAJE_CORREO_SIN_VERIFICAR);
      }
      if (dto.versionTexto !== VERSION_TEXTO_AUTORIZACION) {
        throw new BadRequestException(MENSAJE_TEXTO_ACTUALIZADO);
      }

      const fechaAutorizacion = hoyEnClub();
      const autorizacionId = await this.autorizaciones.crear(consultor, {
        patinadorId,
        acudienteId,
        fechaAutorizacion,
        versionTexto: dto.versionTexto,
        registradoPor: usuario.id,
      });

      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'autorizacion_acudiente',
        registroId: autorizacionId,
        accion: 'REGISTRAR_AUTORIZACION',
        valorNuevo: {
          patinadorId,
          acudienteId,
          fechaAutorizacion,
          versionTexto: dto.versionTexto,
        },
        usuarioId: usuario.id,
      });

      const actualizado = await this.autorizaciones.obtenerDetalle(
        consultor,
        patinadorId,
      );
      if (!actualizado) throw new NotFoundException('El patinador no existe.');
      return this.conAcciones(actualizado);
    });
  }

  /**
   * Servicio reutilizable por M4 (RF-M4-09): indica si el menor tiene una
   * autorización vigente sin acoplar el módulo de competencias a la pantalla.
   */
  async estaVigente(patinadorId: number): Promise<boolean> {
    return this.autorizaciones.estaVigente(
      this.baseDatos.consultor,
      patinadorId,
    );
  }

  private conAcciones(
    patinador: PatinadorConAutorizacion,
    faltaVerificarCorreo = false,
  ): DetalleAutorizacion {
    const motivoNoRegistra =
      motivoParaNoRegistrar(patinador) ??
      (faltaVerificarCorreo && !patinador.autorizacion ? MENSAJE_CORREO_SIN_VERIFICAR : null);
    return {
      ...patinador,
      puedeRegistrar:
        patinador.autorizacion === null && motivoNoRegistra === null,
      motivoNoRegistra,
      texto: {
        version: VERSION_TEXTO_AUTORIZACION,
        contenido: TEXTO_AUTORIZACION,
      },
    };
  }
}

/** Explica por qué no se muestra el botón «Registrar autorización» (CA-05). */
function motivoParaNoRegistrar(
  patinador: PatinadorConAutorizacion,
): string | null {
  if (patinador.autorizacion) return null;
  if (!patinador.activo) return MENSAJE_PATINADOR_INACTIVO;
  if (!patinador.esMenor) return MENSAJE_SOLO_MENOR;
  if (patinador.acudientes.length === 0) return MENSAJE_SIN_ACUDIENTE;
  return null;
}
