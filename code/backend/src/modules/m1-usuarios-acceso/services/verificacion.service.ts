import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { CorreoService } from '../../../common/correo/correo.service.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { TokensRepository } from '../repositories/tokens.repository.js';
import { type UsuarioParaVerificacion, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { correoVerificacion } from '../utils/correo-verificacion.js';
import { hashToken, MAX_SOLICITUDES, urlAplicacion, VENTANA_SOLICITUDES_MS } from './recuperacion.service.js';

/** Vigencia del enlace (decisión del equipo): 24 horas y un solo uso. */
export const HORAS_VIGENCIA = 24;

export const MENSAJE_VERIFICADO = 'Tu correo quedó verificado.';
export const MENSAJE_ENLACE_USADO = 'Este enlace ya se usó. Si tu correo aún no aparece verificado, pide uno nuevo.';
export const MENSAJE_ENLACE_VENCIDO = `Este enlace venció: dura ${HORAS_VIGENCIA} horas. Pide uno nuevo.`;
export const MENSAJE_ENLACE_NO_VALIDO = 'Este enlace no es válido. Revisa que lo copiaste completo o pide uno nuevo.';
export const MENSAJE_REENVIO_PUBLICO =
  'Si el correo tiene una cuenta sin verificar, recibirás un enlace nuevo. Revisa también la carpeta de spam.';
export const MENSAJE_YA_VERIFICADO = 'Tu correo ya está verificado.';
export const MENSAJE_DEMASIADOS = 'Ya pediste varios enlaces. Espera 15 minutos antes de pedir otro.';

const TIPO = 'VERIFICACION_CORREO' as const;

/**
 * HU-M1-04 · Verificación de correo electrónico (RF-M1-04).
 *
 * - CA-01: al crear la cuenta se envía el enlace (decisión: al crearla, antes de activarla).
 * - CA-02: el enlace vigente marca el correo como verificado.
 * - CA-03: un enlace usado, vencido o inexistente se rechaza explicando el motivo, y se puede pedir otro.
 * - CA-04: el estado se consulta en «Mi cuenta» y en el listado del Administrador.
 * Igual que en HU-M1-08: token aleatorio, solo su hash en la base, el último
 * enlace anula los anteriores y hay un límite de 3 envíos cada 15 minutos.
 */
@Injectable()
export class VerificacionService {
  private readonly logger = new Logger(VerificacionService.name);

  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly tokens: TokensRepository,
    private readonly auditoria: AuditoriaRepository,
    private readonly correo: CorreoService,
  ) {}

  /** CA-01: primer enlace, justo después de que el Administrador crea la cuenta. */
  async enviarAlCrear(usuarioId: number): Promise<void> {
    const usuario = await this.usuarios.buscarParaVerificacion(this.baseDatos.consultor, { id: usuarioId });
    if (usuario && !usuario.correoVerificado) await this.emitir(usuario);
  }

  /** Reenvío desde la pantalla pública de fallo. Responde lo mismo exista o no la cuenta. */
  async reenviarPorCorreo(correo: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarios.buscarParaVerificacion(this.baseDatos.consultor, { correo });
    if (usuario && !usuario.correoVerificado && usuario.estado !== 'DESACTIVADA') {
      if (!(await this.emitir(usuario))) {
        this.logger.warn(`Límite de enlaces de verificación alcanzado para la cuenta ${usuario.id}`);
      }
    }
    return { mensaje: MENSAJE_REENVIO_PUBLICO };
  }

  /** «Reenviar enlace» del aviso del AppShell: la persona ya inició sesión. */
  async reenviarPropio(usuarioId: number): Promise<{ mensaje: string }> {
    const usuario = await this.usuarios.buscarParaVerificacion(this.baseDatos.consultor, { id: usuarioId });
    if (!usuario) throw new BadRequestException('La cuenta no existe.');
    if (usuario.correoVerificado) throw new ConflictException(MENSAJE_YA_VERIFICADO);
    if (!(await this.emitir(usuario))) throw new HttpException(MENSAJE_DEMASIADOS, HttpStatus.TOO_MANY_REQUESTS);
    return { mensaje: `Te enviamos un enlace nuevo a ${usuario.correo}. Revisa también la carpeta de spam.` };
  }

  /** CA-04: lo que ve la persona sobre su propia cuenta. */
  async estado(usuarioId: number): Promise<{ nombre: string; correo: string; correoVerificado: boolean }> {
    const usuario = await this.usuarios.buscarParaVerificacion(this.baseDatos.consultor, { id: usuarioId });
    if (!usuario) throw new BadRequestException('La cuenta no existe.');
    return { nombre: usuario.nombre, correo: usuario.correo, correoVerificado: usuario.correoVerificado };
  }

  /** CA-02 y CA-03: usa el enlace o explica por qué no sirve. */
  async confirmar(token: string): Promise<{ mensaje: string }> {
    await this.baseDatos.transaccion(async (consultor) => {
      const encontrado = await this.tokens.buscarPorHash(consultor, hashToken(token), TIPO);
      if (!encontrado) throw new BadRequestException(MENSAJE_ENLACE_NO_VALIDO);
      if (encontrado.usado) throw new BadRequestException(MENSAJE_ENLACE_USADO);
      if (encontrado.vencido) throw new BadRequestException(MENSAJE_ENLACE_VENCIDO);

      await this.tokens.marcarUsado(consultor, encontrado.id);
      await this.tokens.anularPendientes(consultor, encontrado.usuarioId, TIPO);
      await this.usuarios.marcarCorreoVerificado(consultor, encontrado.usuarioId);
      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: encontrado.usuarioId,
        accion: 'VERIFICAR_CORREO',
        usuarioId: encontrado.usuarioId,
      });
    });
    return { mensaje: MENSAJE_VERIFICADO };
  }

  /**
   * Crea un enlace nuevo (anulando los anteriores) y lo envía en segundo plano.
   * false si la cuenta ya pidió el máximo de enlaces en la ventana.
   */
  private async emitir(usuario: UsuarioParaVerificacion): Promise<boolean> {
    const token = await this.baseDatos.transaccion(async (consultor) => {
      const desde = new Date(Date.now() - VENTANA_SOLICITUDES_MS);
      if ((await this.tokens.contarRecientes(consultor, usuario.id, TIPO, desde)) >= MAX_SOLICITUDES) return null;
      const nuevo = randomBytes(32).toString('base64url');
      await this.tokens.anularPendientes(consultor, usuario.id, TIPO);
      await this.tokens.crear(consultor, usuario.id, TIPO, hashToken(nuevo), new Date(Date.now() + HORAS_VIGENCIA * 3_600_000));
      return nuevo;
    });
    if (!token) return false;

    const enlace = `${urlAplicacion()}/app/#/verificar?token=${token}`;
    // Sin await: la respuesta no espera al proveedor de correo.
    void this.correo
      .enviar(correoVerificacion({ para: usuario.correo, nombre: usuario.nombre, enlace, horas: HORAS_VIGENCIA }))
      .catch((error: Error) => this.logger.error(error.message));
    return true;
  }
}
