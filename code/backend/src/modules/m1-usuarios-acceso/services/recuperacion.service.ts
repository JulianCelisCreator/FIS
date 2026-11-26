import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { CorreoService } from '../../../common/correo/correo.service.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { SesionesRepository } from '../repositories/sesiones.repository.js';
import { TokensRepository } from '../repositories/tokens.repository.js';
import { UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena } from '../utils/contrasena.js';
import { correoRecuperacion } from '../utils/correo-recuperacion.js';
import { reglasIncumplidas } from '../utils/politica-contrasena.js';

/** Vigencia del enlace (decisión del equipo): 30 minutos y un solo uso. */
export const MINUTOS_VIGENCIA = 30;
/** Límite de solicitudes por cuenta: 3 enlaces cada 15 minutos. */
export const MAX_SOLICITUDES = 3;
export const VENTANA_SOLICITUDES_MS = 15 * 60 * 1000;

export const MENSAJE_SOLICITUD =
  'Si el correo está registrado y la cuenta está activa, recibirás un enlace para crear una nueva contraseña. Revisa también la carpeta de spam. Si no te llega, contacta al Administrador de la escuela.';
export const MENSAJE_ENLACE_INVALIDO =
  'El enlace no es válido: ya se usó, venció o no existe. Pide uno nuevo.';

const TIPO = 'RECUPERACION_CONTRASENA' as const;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * HU-M1-08 · Recuperación de contraseña (RF-M1-08).
 *
 * CA-01: la respuesta es la misma exista o no la cuenta, y el correo se envía
 * en segundo plano para que el tiempo de respuesta tampoco lo delate.
 * CA-02 y CA-06: el enlace es aleatorio, de un solo uso, vence en 30 minutos y
 * solo sirve para la cuenta que lo pidió; en la base solo queda su hash.
 * CA-03: al restablecer, las credenciales y las sesiones anteriores dejan de valer.
 */
@Injectable()
export class RecuperacionService {
  private readonly logger = new Logger(RecuperacionService.name);

  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly tokens: TokensRepository,
    private readonly sesiones: SesionesRepository,
    private readonly auditoria: AuditoriaRepository,
    private readonly correo: CorreoService,
  ) {}

  /** CA-01: siempre responde lo mismo; si la cuenta existe y está activa, envía el enlace. */
  async solicitar(correo: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarios.buscarParaIngreso(this.baseDatos.consultor, correo);
    // Solo cuentas activas: una desactivada no debe volver a entrar, y una «Por
    // registrar» se activa en su primer ingreso (HU-M1-12).
    if (usuario?.estado === 'ACTIVA') {
      const token = await this.baseDatos.transaccion(async (consultor) => {
        const desde = new Date(Date.now() - VENTANA_SOLICITUDES_MS);
        if ((await this.tokens.contarRecientes(consultor, usuario.id, TIPO, desde)) >= MAX_SOLICITUDES) return null;
        const nuevo = randomBytes(32).toString('base64url');
        await this.tokens.anularPendientes(consultor, usuario.id, TIPO);
        await this.tokens.crear(consultor, usuario.id, TIPO, hashToken(nuevo), new Date(Date.now() + MINUTOS_VIGENCIA * 60_000));
        return nuevo;
      });
      if (token) {
        const enlace = `${urlAplicacion()}/app/#/restablecer?token=${token}`;
        // Sin await: la respuesta no espera al proveedor de correo (CA-01, mismo tiempo exista o no).
        void this.correo
          .enviar(correoRecuperacion({ para: correo, nombre: usuario.nombre, enlace, minutos: MINUTOS_VIGENCIA }))
          .catch((error: Error) => this.logger.error(error.message));
      } else {
        this.logger.warn(`Límite de solicitudes de recuperación alcanzado para la cuenta ${usuario.id}`);
      }
    }
    return { mensaje: MENSAJE_SOLICITUD };
  }

  /** CA-02: la pantalla «Nueva contraseña» consulta primero si el enlace sirve. */
  async validar(token: string): Promise<{ valido: boolean }> {
    const vigente = await this.tokens.buscarVigente(this.baseDatos.consultor, hashToken(token), TIPO);
    return { valido: vigente !== null };
  }

  /** CA-03, CA-04 y CA-06: define la nueva contraseña de la cuenta dueña del enlace. */
  async restablecer(token: string, contrasena: string): Promise<{ mensaje: string }> {
    const faltan = reglasIncumplidas(contrasena);
    if (faltan.length > 0) throw new BadRequestException(faltan);
    const contrasenaHash = await hashContrasena(contrasena);

    await this.baseDatos.transaccion(async (consultor) => {
      const vigente = await this.tokens.buscarVigente(consultor, hashToken(token), TIPO);
      if (!vigente) throw new BadRequestException(MENSAJE_ENLACE_INVALIDO);

      await this.usuarios.actualizarContrasena(consultor, vigente.usuarioId, contrasenaHash);
      await this.tokens.marcarUsado(consultor, vigente.id);
      await this.tokens.anularPendientes(consultor, vigente.usuarioId, TIPO);
      const cerradas = await this.sesiones.cerrarDeUsuario(consultor, vigente.usuarioId);
      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: vigente.usuarioId,
        accion: 'RESTABLECER_CONTRASENA',
        valorNuevo: { sesionesCerradas: cerradas },
        usuarioId: vigente.usuarioId,
      });
    });
    return { mensaje: 'Tu contraseña se actualizó. Ya puedes ingresar con la nueva.' };
  }
}

/** Dirección de la aplicación para los enlaces del correo (APP_URL en .env). */
function urlAplicacion(): string {
  return (process.env.APP_URL?.trim() || 'http://localhost:5173').replace(/\/+$/, '');
}
