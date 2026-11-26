import { BadRequestException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { hashTokenSesion } from '../../../common/auth/token-sesion.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { SesionesRepository } from '../repositories/sesiones.repository.js';
import type { UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena, verificarContrasena } from '../utils/contrasena.js';
import {
  CambioContrasenaService,
  MENSAJE_ACTUAL_INCORRECTA,
  MENSAJE_IGUAL_A_ACTUAL,
} from './cambio-contrasena.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const usuario: UsuarioAutenticado = { id: 2, roles: [Rol.CONTADOR], permisos: [] };
let hashGuardado: string;

beforeAll(async () => {
  hashGuardado = await hashContrasena('Velora2026');
});

function crearServicio(sesionesCerradas = 1) {
  const actualizarContrasena = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    obtenerContrasenaHash: vi.fn().mockResolvedValue(hashGuardado),
    actualizarContrasena,
  } as unknown as UsuariosRepository;
  const cerrarDeUsuario = vi.fn().mockResolvedValue(sesionesCerradas);
  const sesiones = { cerrarDeUsuario } as unknown as SesionesRepository;
  const registrar = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar } as unknown as AuditoriaRepository;
  return {
    servicio: new CambioContrasenaService(baseDatos, usuarios, sesiones, auditoria),
    actualizarContrasena,
    cerrarDeUsuario,
    registrar,
  };
}

describe('CambioContrasenaService (HU-M1-08 CA-05)', () => {
  it('con la contraseña actual correcta la cambia y cierra las demás sesiones, no la actual', async () => {
    const { servicio, actualizarContrasena, cerrarDeUsuario, registrar } = crearServicio(1);

    const resultado = await servicio.cambiar(usuario, 'token-de-esta-sesion', 'Velora2026', 'Nueva2026x');

    const nuevoHash = actualizarContrasena.mock.calls[0][2] as string;
    await expect(verificarContrasena('Nueva2026x', nuevoHash)).resolves.toBe(true);
    expect(cerrarDeUsuario).toHaveBeenCalledWith(consultor, 2, hashTokenSesion('token-de-esta-sesion'));
    expect(registrar).toHaveBeenCalledWith(consultor, expect.objectContaining({ accion: 'CAMBIAR_CONTRASENA', registroId: 2 }));
    expect(resultado).toEqual({ mensaje: 'Tu contraseña se actualizó. Cerramos tu sesión en otro dispositivo.', sesionesCerradas: 1 });
  });

  it('rechaza una contraseña actual equivocada sin cambiar nada', async () => {
    const { servicio, actualizarContrasena } = crearServicio();
    await expect(servicio.cambiar(usuario, null, 'otra', 'Nueva2026x')).rejects.toThrow(
      new BadRequestException(MENSAJE_ACTUAL_INCORRECTA),
    );
    expect(actualizarContrasena).not.toHaveBeenCalled();
  });

  it('CA-04: dice qué condición le falta a la nueva', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.cambiar(usuario, null, 'Velora2026', 'corta1')).rejects.toThrow(
      new BadRequestException(['Debe tener al menos 8 caracteres', 'Falta una mayúscula']),
    );
  });

  it('pide que la nueva sea distinta de la actual', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.cambiar(usuario, null, 'Velora2026', 'Velora2026')).rejects.toThrow(
      new BadRequestException(MENSAJE_IGUAL_A_ACTUAL),
    );
  });
});
