import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { AuditoriaRepository, EntradaAuditoria } from '../../../common/auditoria/auditoria.repository.js';
import { Rol } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { SesionesRepository } from '../repositories/sesiones.repository.js';
import type { UsuarioParaIngreso, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena, verificarContrasena } from '../utils/contrasena.js';
import { ActivacionService, MENSAJE_IGUAL_A_TEMPORAL, MENSAJE_YA_ACTIVA } from './activacion.service.js';
import { IngresoService, MENSAJE_CREDENCIALES, MENSAJE_CUENTA_DESACTIVADA } from './ingreso.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const contexto = { ip: '127.0.0.1', userAgent: 'vitest' };
const TEMPORAL = 'k7Pq2mZx9aBc';
const NUEVA = 'Patines2026';
let hashTemporal: string;

beforeAll(async () => {
  hashTemporal = await hashContrasena(TEMPORAL);
});

function crearServicio(usuario: Partial<UsuarioParaIngreso> | null, { activada = true } = {}) {
  const activar = vi.fn().mockResolvedValue(activada);
  const usuarios = {
    buscarParaIngreso: vi.fn().mockResolvedValue(
      usuario && { id: 7, nombre: 'Diego Rincón', estado: 'POR_REGISTRAR', contrasenaHash: hashTemporal, ...usuario },
    ),
    activar,
    registrarIngreso: vi.fn().mockResolvedValue(undefined),
    rolesYPermisos: vi.fn().mockResolvedValue({ roles: [Rol.PROFESOR], permisos: [] }),
  } as unknown as UsuariosRepository;
  const crearSesion = vi.fn().mockResolvedValue(undefined);
  const sesiones = { crear: crearSesion } as unknown as SesionesRepository;
  const auditorias: EntradaAuditoria[] = [];
  const auditoria = {
    registrar: vi.fn((_c: Consultor, entrada: EntradaAuditoria) => {
      auditorias.push(entrada);
      return Promise.resolve();
    }),
  } as unknown as AuditoriaRepository;
  const ingreso = new IngresoService(baseDatos, usuarios, sesiones);
  return { servicio: new ActivacionService(baseDatos, usuarios, ingreso, auditoria), activar, crearSesion, auditorias };
}

const datos = { correo: 'diego.rincon@example.com', contrasenaTemporal: TEMPORAL, contrasenaNueva: NUEVA };

describe('ActivacionService.activar (HU-M1-12)', () => {
  it('CA-03: reemplaza la temporal, activa la cuenta, lo audita y deja la sesión abierta', async () => {
    const { servicio, activar, crearSesion, auditorias } = crearServicio({});

    const resultado = await servicio.activar(datos, contexto);

    expect(activar).toHaveBeenCalledOnce();
    const [, usuarioId, nuevoHash] = activar.mock.calls[0] as [Consultor, number, string];
    expect(usuarioId).toBe(7);
    expect(await verificarContrasena(NUEVA, nuevoHash)).toBe(true);
    expect(await verificarContrasena(TEMPORAL, nuevoHash)).toBe(false); // CA-06
    expect(auditorias).toEqual([expect.objectContaining({ accion: 'ACTIVAR_CUENTA', registroId: 7, usuarioId: 7 })]);
    expect(crearSesion).toHaveBeenCalledOnce();
    expect(resultado.sesion).toEqual({ id: 7, nombre: 'Diego Rincón', roles: [Rol.PROFESOR], permisos: [] });
  });

  it('aplica a cualquier rol: no depende de que la cuenta sea de un Profesor', async () => {
    const { servicio, activar } = crearServicio({ nombre: 'Laura Cubillos' });
    await servicio.activar({ ...datos, correo: 'laura.cubillos@example.com' }, contexto);
    expect(activar).toHaveBeenCalledOnce();
  });

  it('con una temporal equivocada o un correo sin cuenta da el mensaje del ingreso y no activa nada', async () => {
    const claveMala = crearServicio({});
    const sinCuenta = crearServicio(null);

    await expect(claveMala.servicio.activar({ ...datos, contrasenaTemporal: 'otra' }, contexto)).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    await expect(sinCuenta.servicio.activar(datos, contexto)).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    expect(claveMala.activar).not.toHaveBeenCalled();
  });

  it('CA-04: una cuenta ya activa no se vuelve a activar', async () => {
    const { servicio, activar } = crearServicio({ estado: 'ACTIVA' });
    await expect(servicio.activar(datos, contexto)).rejects.toThrow(new ConflictException(MENSAJE_YA_ACTIVA));
    expect(activar).not.toHaveBeenCalled();
  });

  it('CA-04: si otra solicitud la activó primero, no abre una segunda sesión', async () => {
    const { servicio, crearSesion, auditorias } = crearServicio({}, { activada: false });
    await expect(servicio.activar(datos, contexto)).rejects.toThrow(new ConflictException(MENSAJE_YA_ACTIVA));
    expect(crearSesion).not.toHaveBeenCalled();
    expect(auditorias).toHaveLength(0);
  });

  it('una cuenta desactivada no se puede activar', async () => {
    const { servicio, activar } = crearServicio({ estado: 'DESACTIVADA' });
    await expect(servicio.activar(datos, contexto)).rejects.toThrow(new ForbiddenException(MENSAJE_CUENTA_DESACTIVADA));
    expect(activar).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña nueva que no cumple la política e indica qué falta', async () => {
    const { servicio, activar } = crearServicio({});
    const error = await servicio.activar({ ...datos, contrasenaNueva: 'corta' }, contexto).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({ message: expect.arrayContaining([expect.any(String)]) });
    expect(activar).not.toHaveBeenCalled();
  });

  it('rechaza reutilizar la contraseña temporal como la nueva', async () => {
    const temporalValida = 'Temporal2026';
    const { servicio, activar } = crearServicio({ contrasenaHash: await hashContrasena(temporalValida) });
    await expect(
      servicio.activar({ ...datos, contrasenaTemporal: temporalValida, contrasenaNueva: temporalValida }, contexto),
    ).rejects.toThrow(new BadRequestException(MENSAJE_IGUAL_A_TEMPORAL));
    expect(activar).not.toHaveBeenCalled();
  });
});
