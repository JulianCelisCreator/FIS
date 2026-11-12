import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hashTokenSesion } from '../../../common/auth/token-sesion.js';
import { Rol } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { NuevaSesion, SesionesRepository } from '../repositories/sesiones.repository.js';
import type { UsuarioParaIngreso, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena } from '../utils/contrasena.js';
import {
  IngresoService,
  MENSAJE_CREDENCIALES,
  MENSAJE_CUENTA_DESACTIVADA,
  MENSAJE_CUENTA_POR_REGISTRAR,
} from './ingreso.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const contexto = { ip: '127.0.0.1', userAgent: 'vitest' };
let hashGuardado: string;

beforeAll(async () => {
  hashGuardado = await hashContrasena('Velora2026');
});

function crearServicio(usuario: Partial<UsuarioParaIngreso> | null) {
  const sesionesCreadas: NuevaSesion[] = [];
  const registrarIngreso = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    buscarParaIngreso: vi.fn().mockResolvedValue(
      usuario && { id: 2, nombre: 'Martha Gómez', estado: 'ACTIVA', contrasenaHash: hashGuardado, ...usuario },
    ),
    registrarIngreso,
    rolesYPermisos: vi.fn().mockResolvedValue({ roles: [Rol.CONTADOR], permisos: ['M5_PAGO_REGISTRAR'] }),
  } as unknown as UsuariosRepository;
  const sesiones = {
    crear: vi.fn((_c: Consultor, nueva: NuevaSesion) => {
      sesionesCreadas.push(nueva);
      return Promise.resolve();
    }),
  } as unknown as SesionesRepository;
  return { servicio: new IngresoService(baseDatos, usuarios, sesiones), sesionesCreadas, registrarIngreso };
}

const ingreso = { correo: 'martha.gomez@escuela.com', contrasena: 'Velora2026' };

describe('IngresoService.iniciar (HU-M1-02)', () => {
  it('CA-01 y CA-04: autentica, identifica los roles y sus permisos, y guarda solo el hash del token', async () => {
    const { servicio, sesionesCreadas, registrarIngreso } = crearServicio({});

    const resultado = await servicio.iniciar(ingreso, contexto);

    expect(resultado.sesion).toEqual({
      id: 2,
      nombre: 'Martha Gómez',
      roles: [Rol.CONTADOR],
      permisos: ['M5_PAGO_REGISTRAR'],
    });
    expect(sesionesCreadas).toHaveLength(1);
    expect(sesionesCreadas[0].tokenHash).toBe(hashTokenSesion(resultado.token));
    expect(sesionesCreadas[0].tokenHash).not.toBe(resultado.token);
    expect(resultado.expiraEn.getTime()).toBeGreaterThan(Date.now());
    expect(registrarIngreso).toHaveBeenCalledWith(consultor, 2);
  });

  it('CA-02: el mismo mensaje para un correo sin cuenta y una contraseña equivocada, sin crear sesión', async () => {
    const sinCuenta = crearServicio(null);
    const claveMala = crearServicio({});

    await expect(sinCuenta.servicio.iniciar(ingreso, contexto)).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    await expect(claveMala.servicio.iniciar({ ...ingreso, contrasena: 'otra' }, contexto)).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
    expect(sinCuenta.sesionesCreadas).toHaveLength(0);
    expect(claveMala.sesionesCreadas).toHaveLength(0);
  });

  it('CA-03: una cuenta desactivada no ingresa y se le pide contactar al Administrador', async () => {
    const { servicio, sesionesCreadas } = crearServicio({ estado: 'DESACTIVADA' });
    await expect(servicio.iniciar(ingreso, contexto)).rejects.toThrow(
      new ForbiddenException(MENSAJE_CUENTA_DESACTIVADA),
    );
    expect(sesionesCreadas).toHaveLength(0);
  });

  it('una cuenta «Por registrar» no ingresa hasta activarse (precondición: cuenta habilitada)', async () => {
    const { servicio, sesionesCreadas } = crearServicio({ estado: 'POR_REGISTRAR' });
    await expect(servicio.iniciar(ingreso, contexto)).rejects.toThrow(
      new ForbiddenException(MENSAJE_CUENTA_POR_REGISTRAR),
    );
    expect(sesionesCreadas).toHaveLength(0);
  });

  it('una contraseña equivocada en una cuenta desactivada no revela su estado', async () => {
    const { servicio } = crearServicio({ estado: 'DESACTIVADA' });
    await expect(servicio.iniciar({ ...ingreso, contrasena: 'otra' }, contexto)).rejects.toThrow(
      new UnauthorizedException(MENSAJE_CREDENCIALES),
    );
  });
});
