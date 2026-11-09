import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hashTokenSesion, rolDelToken } from '../../../common/auth/token-sesion.js';
import { Rol } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { NuevaSesion, SesionesRepository } from '../repositories/sesiones.repository.js';
import type { UsuarioParaIngreso, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena } from '../utils/contrasena.js';
import {
  IngresoService,
  MENSAJE_CREDENCIALES,
  MENSAJE_CUENTA_DESACTIVADA,
  MENSAJE_CUENTA_POR_ACTIVAR,
  mensajeSinRol,
} from './ingreso.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const contexto = { ip: '127.0.0.1', userAgent: 'vitest' };
let hashGuardado: string;

beforeAll(async () => {
  hashGuardado = await hashContrasena('Patines2026');
});

function crearServicio(usuario: Partial<UsuarioParaIngreso> | null) {
  const sesionesCreadas: NuevaSesion[] = [];
  const cerradas: string[] = [];
  const registrarIngreso = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    buscarParaIngreso: vi.fn().mockResolvedValue(
      usuario && {
        id: 3,
        nombre: 'Carolina Torres',
        estado: 'ACTIVA',
        contrasenaHash: hashGuardado,
        roles: [Rol.ACUDIENTE],
        ...usuario,
      },
    ),
    registrarIngreso,
    permisosDeRol: vi.fn().mockResolvedValue(['M5_PLAN_ASIGNAR', 'M5_PLAN_CONSULTAR']),
  } as unknown as UsuariosRepository;
  const sesiones = {
    crear: vi.fn((_c: Consultor, nueva: NuevaSesion) => {
      sesionesCreadas.push(nueva);
      return Promise.resolve(40);
    }),
    cerrarPorToken: vi.fn((_c: Consultor, hash: string) => {
      cerradas.push(hash);
      return Promise.resolve();
    }),
  } as unknown as SesionesRepository;
  return { servicio: new IngresoService(baseDatos, usuarios, sesiones), sesionesCreadas, cerradas, registrarIngreso };
}

const ingreso = { correo: 'carolina.torres@example.com', contrasena: 'Patines2026', rol: Rol.ACUDIENTE };

describe('IngresoService.iniciar (RF-M1-02)', () => {
  it('crea la sesión con el rol elegido y guarda solo el hash del token', async () => {
    const { servicio, sesionesCreadas, registrarIngreso } = crearServicio({});

    const resultado = await servicio.iniciar(ingreso, contexto);

    expect(resultado.sesion).toEqual({
      id: 3,
      nombre: 'Carolina Torres',
      roles: [Rol.ACUDIENTE],
      permisos: ['M5_PLAN_ASIGNAR', 'M5_PLAN_CONSULTAR'],
    });
    expect(rolDelToken(resultado.token)).toBe(Rol.ACUDIENTE);
    expect(sesionesCreadas).toHaveLength(1);
    expect(sesionesCreadas[0].tokenHash).toBe(hashTokenSesion(resultado.token));
    expect(sesionesCreadas[0].tokenHash).not.toBe(resultado.token);
    expect(resultado.expiraEn.getTime()).toBeGreaterThan(Date.now());
    expect(registrarIngreso).toHaveBeenCalledWith(consultor, 3);
  });

  it('da el mismo mensaje para un correo sin cuenta y una contraseña equivocada', async () => {
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

  it('rechaza el ingreso con un rol que la cuenta no tiene', async () => {
    const { servicio, sesionesCreadas } = crearServicio({});

    await expect(servicio.iniciar({ ...ingreso, rol: Rol.ADMINISTRADOR }, contexto)).rejects.toThrow(
      new ForbiddenException(mensajeSinRol(Rol.ADMINISTRADOR)),
    );
    expect(sesionesCreadas).toHaveLength(0);
  });

  it('permite elegir cualquiera de los roles de una cuenta con varios', async () => {
    const { servicio } = crearServicio({ roles: [Rol.ACUDIENTE, Rol.PROFESOR] });

    const resultado = await servicio.iniciar({ ...ingreso, rol: Rol.PROFESOR }, contexto);
    expect(resultado.sesion.roles).toEqual([Rol.PROFESOR]);
  });

  it('no deja ingresar a una cuenta desactivada ni a una por activar', async () => {
    await expect(crearServicio({ estado: 'DESACTIVADA' }).servicio.iniciar(ingreso, contexto)).rejects.toThrow(
      new ForbiddenException(MENSAJE_CUENTA_DESACTIVADA),
    );
    await expect(crearServicio({ estado: 'POR_REGISTRAR' }).servicio.iniciar(ingreso, contexto)).rejects.toThrow(
      new ForbiddenException(MENSAJE_CUENTA_POR_ACTIVAR),
    );
  });
});

describe('IngresoService.cerrar (RF-M1-03)', () => {
  it('cierra la sesión por el hash del token', async () => {
    const { servicio, cerradas } = crearServicio({});
    await servicio.cerrar('ACUDIENTE.secreto');
    expect(cerradas).toEqual([hashTokenSesion('ACUDIENTE.secreto')]);
  });

  it('no hace nada sin token', async () => {
    const { servicio, cerradas } = crearServicio({});
    await servicio.cerrar(null);
    expect(cerradas).toEqual([]);
  });
});
