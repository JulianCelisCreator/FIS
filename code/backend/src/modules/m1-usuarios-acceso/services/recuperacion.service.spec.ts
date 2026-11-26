import { BadRequestException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { CorreoSaliente, CorreoService } from '../../../common/correo/correo.service.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { SesionesRepository } from '../repositories/sesiones.repository.js';
import type { TokenVigente, TokensRepository } from '../repositories/tokens.repository.js';
import type { UsuarioParaIngreso, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { verificarContrasena } from '../utils/contrasena.js';
import {
  hashToken,
  MAX_SOLICITUDES,
  MENSAJE_ENLACE_INVALIDO,
  MENSAJE_SOLICITUD,
  RecuperacionService,
} from './recuperacion.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const TOKEN = 'a'.repeat(43);

function crearServicio(
  opciones: {
    usuario?: Partial<UsuarioParaIngreso> | null;
    recientes?: number;
    vigente?: TokenVigente | null;
    correoFalla?: boolean;
  } = {},
) {
  const enviados: CorreoSaliente[] = [];
  const tokensCreados: { usuarioId: number; hash: string; expira: Date }[] = [];
  const usuario =
    opciones.usuario === null
      ? null
      : { id: 5, nombre: 'Carolina Torres', estado: 'ACTIVA' as const, contrasenaHash: 'x', ...opciones.usuario };
  const actualizarContrasena = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    buscarParaIngreso: vi.fn().mockResolvedValue(usuario),
    actualizarContrasena,
  } as unknown as UsuariosRepository;
  const marcarUsado = vi.fn().mockResolvedValue(undefined);
  const anularPendientes = vi.fn().mockResolvedValue(undefined);
  const tokens = {
    contarRecientes: vi.fn().mockResolvedValue(opciones.recientes ?? 0),
    anularPendientes,
    crear: vi.fn((_c: Consultor, usuarioId: number, _t: string, hash: string, expira: Date) => {
      tokensCreados.push({ usuarioId, hash, expira });
      return Promise.resolve();
    }),
    buscarVigente: vi.fn().mockResolvedValue(opciones.vigente === undefined ? { id: 70, usuarioId: 5 } : opciones.vigente),
    marcarUsado,
  } as unknown as TokensRepository;
  const cerrarDeUsuario = vi.fn().mockResolvedValue(2);
  const sesiones = { cerrarDeUsuario } as unknown as SesionesRepository;
  const registrar = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar } as unknown as AuditoriaRepository;
  const enviar = vi.fn((correo: CorreoSaliente) => {
    enviados.push(correo);
    return opciones.correoFalla ? Promise.reject(new Error('Resend caído')) : Promise.resolve();
  });
  const correo = { enviar } as unknown as CorreoService;
  return {
    servicio: new RecuperacionService(baseDatos, usuarios, tokens, sesiones, auditoria, correo),
    enviados,
    tokensCreados,
    actualizarContrasena,
    marcarUsado,
    anularPendientes,
    cerrarDeUsuario,
    registrar,
  };
}

describe('RecuperacionService (HU-M1-08)', () => {
  describe('solicitar · CA-01', () => {
    it('envía un enlace de un solo uso y guarda solo el hash del token', async () => {
      const { servicio, enviados, tokensCreados, anularPendientes } = crearServicio();

      await expect(servicio.solicitar('carolina.torres@example.com')).resolves.toEqual({ mensaje: MENSAJE_SOLICITUD });

      expect(enviados).toHaveLength(1);
      expect(enviados[0].para).toBe('carolina.torres@example.com');
      const token = /token=([A-Za-z0-9_-]+)/.exec(enviados[0].texto)![1];
      expect(tokensCreados[0].hash).toBe(hashToken(token));
      expect(tokensCreados[0].hash).not.toContain(token);
      // Vence en 30 minutos.
      const minutos = (tokensCreados[0].expira.getTime() - Date.now()) / 60_000;
      expect(minutos).toBeGreaterThan(29);
      expect(minutos).toBeLessThanOrEqual(30);
      // Solo vale el último enlace pedido.
      expect(anularPendientes).toHaveBeenCalledWith(consultor, 5, 'RECUPERACION_CONTRASENA');
    });

    it.each([
      ['no existe', null],
      ['está desactivada', { estado: 'DESACTIVADA' as const }],
      ['está «Por registrar»', { estado: 'POR_REGISTRAR' as const }],
    ])('si la cuenta %s, responde lo mismo y no envía nada', async (_caso, usuario) => {
      const { servicio, enviados, tokensCreados } = crearServicio({ usuario });

      await expect(servicio.solicitar('alguien@example.com')).resolves.toEqual({ mensaje: MENSAJE_SOLICITUD });
      expect(enviados).toHaveLength(0);
      expect(tokensCreados).toHaveLength(0);
    });

    it('con el límite de solicitudes alcanzado responde lo mismo y no envía otro enlace', async () => {
      const { servicio, enviados } = crearServicio({ recientes: MAX_SOLICITUDES });
      await expect(servicio.solicitar('carolina.torres@example.com')).resolves.toEqual({ mensaje: MENSAJE_SOLICITUD });
      expect(enviados).toHaveLength(0);
    });

    it('si el proveedor de correo falla, la respuesta no cambia (no revela nada)', async () => {
      const { servicio } = crearServicio({ correoFalla: true });
      await expect(servicio.solicitar('carolina.torres@example.com')).resolves.toEqual({ mensaje: MENSAJE_SOLICITUD });
    });
  });

  describe('validar · CA-02', () => {
    it('dice si el enlace sigue sirviendo', async () => {
      await expect(crearServicio().servicio.validar(TOKEN)).resolves.toEqual({ valido: true });
      await expect(crearServicio({ vigente: null }).servicio.validar(TOKEN)).resolves.toEqual({ valido: false });
    });
  });

  describe('restablecer', () => {
    it('CA-03 y CA-06: cambia la contraseña de la cuenta dueña del enlace, lo gasta y cierra todas sus sesiones', async () => {
      const { servicio, actualizarContrasena, marcarUsado, cerrarDeUsuario, registrar } = crearServicio();

      await servicio.restablecer(TOKEN, 'Nueva2026x');

      expect(actualizarContrasena).toHaveBeenCalledWith(consultor, 5, expect.any(String));
      const hash = actualizarContrasena.mock.calls[0][2] as string;
      await expect(verificarContrasena('Nueva2026x', hash)).resolves.toBe(true);
      expect(marcarUsado).toHaveBeenCalledWith(consultor, 70);
      expect(cerrarDeUsuario).toHaveBeenCalledWith(consultor, 5);
      expect(registrar).toHaveBeenCalledWith(consultor, expect.objectContaining({ accion: 'RESTABLECER_CONTRASENA', registroId: 5 }));
    });

    it('CA-02: un enlace usado, vencido o inexistente se rechaza', async () => {
      const { servicio, actualizarContrasena } = crearServicio({ vigente: null });
      await expect(servicio.restablecer(TOKEN, 'Nueva2026x')).rejects.toThrow(new BadRequestException(MENSAJE_ENLACE_INVALIDO));
      expect(actualizarContrasena).not.toHaveBeenCalled();
    });

    it('CA-04: una contraseña que no cumple dice qué condición falta y no gasta el enlace', async () => {
      const { servicio, marcarUsado } = crearServicio();
      await expect(servicio.restablecer(TOKEN, 'nueva2026x')).rejects.toThrow(new BadRequestException(['Falta una mayúscula']));
      expect(marcarUsado).not.toHaveBeenCalled();
    });
  });
});
