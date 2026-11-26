import { BadRequestException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import type { AuditoriaRepository, EntradaAuditoria } from '../../../common/auditoria/auditoria.repository.js';
import type { CorreoSaliente, CorreoService } from '../../../common/correo/correo.service.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { TokenEncontrado, TokensRepository } from '../repositories/tokens.repository.js';
import type { UsuarioParaVerificacion, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashToken } from './recuperacion.service.js';
import {
  HORAS_VIGENCIA,
  MENSAJE_DEMASIADOS,
  MENSAJE_ENLACE_NO_VALIDO,
  MENSAJE_ENLACE_USADO,
  MENSAJE_ENLACE_VENCIDO,
  MENSAJE_REENVIO_PUBLICO,
  MENSAJE_VERIFICADO,
  MENSAJE_YA_VERIFICADO,
  VerificacionService,
} from './verificacion.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const cuentaBase: UsuarioParaVerificacion = {
  id: 4,
  nombre: 'Carolina Torres',
  correo: 'carolina.torres@example.com',
  estado: 'ACTIVA',
  correoVerificado: false,
};

interface Opciones {
  cuenta?: Partial<UsuarioParaVerificacion> | null;
  token?: Partial<TokenEncontrado> | null;
  recientes?: number;
}

function crearServicio({ cuenta = {}, token = {}, recientes = 0 }: Opciones = {}) {
  const marcarCorreoVerificado = vi.fn().mockResolvedValue(undefined);
  const marcarUsado = vi.fn().mockResolvedValue(undefined);
  const anularPendientes = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    buscarParaVerificacion: vi.fn().mockResolvedValue(cuenta && { ...cuentaBase, ...cuenta }),
    marcarCorreoVerificado,
  } as unknown as UsuariosRepository;
  const creados: { hash: string; expiraEn: Date }[] = [];
  const tokens = {
    contarRecientes: vi.fn().mockResolvedValue(recientes),
    anularPendientes,
    crear: vi.fn((_c: Consultor, _u: number, _t: string, hash: string, expiraEn: Date) => {
      creados.push({ hash, expiraEn });
      return Promise.resolve();
    }),
    buscarPorHash: vi.fn().mockResolvedValue(token && { id: 30, usuarioId: 4, usado: false, vencido: false, ...token }),
    marcarUsado,
  } as unknown as TokensRepository;
  const auditorias: EntradaAuditoria[] = [];
  const auditoria = {
    registrar: vi.fn((_c: Consultor, e: EntradaAuditoria) => {
      auditorias.push(e);
      return Promise.resolve();
    }),
  } as unknown as AuditoriaRepository;
  const enviados: CorreoSaliente[] = [];
  const correo = {
    enviar: vi.fn((c: CorreoSaliente) => {
      enviados.push(c);
      return Promise.resolve();
    }),
  } as unknown as CorreoService;
  return {
    servicio: new VerificacionService(baseDatos, usuarios, tokens, auditoria, correo),
    marcarCorreoVerificado,
    marcarUsado,
    anularPendientes,
    creados,
    enviados,
    auditorias,
  };
}

/** El token que viaja en el enlace del correo enviado. */
function tokenDelEnlace(correo: CorreoSaliente): string {
  return /token=([A-Za-z0-9_-]{43})/.exec(correo.texto)?.[1] ?? '';
}

describe('VerificacionService (HU-M1-04)', () => {
  describe('CA-01 · envío', () => {
    it('envía al correo de la cuenta un enlace de un solo uso que vence en 24 horas, guardando solo su hash', async () => {
      const { servicio, creados, enviados } = crearServicio();
      const antes = Date.now();

      await servicio.enviarAlCrear(4);

      expect(enviados).toHaveLength(1);
      expect(enviados[0].para).toBe(cuentaBase.correo);
      const token = tokenDelEnlace(enviados[0]);
      expect(enviados[0].texto).toContain('/app/#/verificar?token=');
      expect(creados[0].hash).toBe(hashToken(token));
      expect(creados[0].hash).not.toBe(token);
      const horas = (creados[0].expiraEn.getTime() - antes) / 3_600_000;
      expect(horas).toBeGreaterThan(HORAS_VIGENCIA - 0.01);
      expect(horas).toBeLessThan(HORAS_VIGENCIA + 0.01);
    });

    it('no envía nada si el correo ya está verificado', async () => {
      const { servicio, enviados } = crearServicio({ cuenta: { correoVerificado: true } });
      await servicio.enviarAlCrear(4);
      expect(enviados).toHaveLength(0);
    });
  });

  describe('CA-02 · confirmación', () => {
    it('marca el correo como verificado, usa el enlace, anula los demás y lo audita', async () => {
      const { servicio, marcarUsado, anularPendientes, marcarCorreoVerificado, auditorias } = crearServicio();

      await expect(servicio.confirmar('x'.repeat(43))).resolves.toEqual({ mensaje: MENSAJE_VERIFICADO });

      expect(marcarUsado).toHaveBeenCalledWith(consultor, 30);
      expect(anularPendientes).toHaveBeenCalledWith(consultor, 4, 'VERIFICACION_CORREO');
      expect(marcarCorreoVerificado).toHaveBeenCalledWith(consultor, 4);
      expect(auditorias).toEqual([expect.objectContaining({ accion: 'VERIFICAR_CORREO', registroId: 4 })]);
    });
  });

  describe('CA-03 · enlace inválido, usado o vencido', () => {
    it.each([
      ['no existe', null, MENSAJE_ENLACE_NO_VALIDO],
      ['ya se usó', { usado: true }, MENSAJE_ENLACE_USADO],
      ['venció', { vencido: true }, MENSAJE_ENLACE_VENCIDO],
    ])('si %s, lo rechaza explicando el motivo y no verifica nada', async (_caso, token, mensaje) => {
      const { servicio, marcarCorreoVerificado } = crearServicio({ token });
      await expect(servicio.confirmar('x'.repeat(43))).rejects.toThrow(new BadRequestException(mensaje));
      expect(marcarCorreoVerificado).not.toHaveBeenCalled();
    });

    it('el reenvío público responde lo mismo exista o no la cuenta', async () => {
      const existe = crearServicio();
      const noExiste = crearServicio({ cuenta: null });

      await expect(existe.servicio.reenviarPorCorreo(cuentaBase.correo)).resolves.toEqual({ mensaje: MENSAJE_REENVIO_PUBLICO });
      await expect(noExiste.servicio.reenviarPorCorreo('nadie@example.com')).resolves.toEqual({
        mensaje: MENSAJE_REENVIO_PUBLICO,
      });
      expect(existe.enviados).toHaveLength(1);
      expect(noExiste.enviados).toHaveLength(0);
    });

    it('el reenvío público no envía a cuentas desactivadas', async () => {
      const { servicio, enviados } = crearServicio({ cuenta: { estado: 'DESACTIVADA' } });
      await servicio.reenviarPorCorreo(cuentaBase.correo);
      expect(enviados).toHaveLength(0);
    });

    it('respeta el límite de 3 enlaces cada 15 minutos', async () => {
      const { servicio, enviados } = crearServicio({ recientes: 3 });
      await expect(servicio.reenviarPorCorreo(cuentaBase.correo)).resolves.toEqual({ mensaje: MENSAJE_REENVIO_PUBLICO });
      expect(enviados).toHaveLength(0);
    });
  });

  describe('«Reenviar enlace» desde la aplicación', () => {
    it('envía un enlace nuevo a la cuenta con sesión', async () => {
      const { servicio, enviados } = crearServicio();
      const { mensaje } = await servicio.reenviarPropio(4);
      expect(mensaje).toContain(cuentaBase.correo);
      expect(enviados).toHaveLength(1);
    });

    it('avisa si el correo ya está verificado', async () => {
      const { servicio } = crearServicio({ cuenta: { correoVerificado: true } });
      await expect(servicio.reenviarPropio(4)).rejects.toThrow(new ConflictException(MENSAJE_YA_VERIFICADO));
    });

    it('avisa cuando se alcanzó el límite de enlaces', async () => {
      const { servicio } = crearServicio({ recientes: 3 });
      await expect(servicio.reenviarPropio(4)).rejects.toThrow(
        new HttpException(MENSAJE_DEMASIADOS, HttpStatus.TOO_MANY_REQUESTS),
      );
    });
  });

  it('CA-04 · estado: devuelve si el correo de la cuenta está verificado', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.estado(4)).resolves.toEqual({
      nombre: cuentaBase.nombre,
      correo: cuentaBase.correo,
      correoVerificado: false,
    });
  });
});
