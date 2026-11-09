import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { CrearCuentaDto } from '../dto/crear-cuenta.dto.js';
import {
  CorreoDuplicadoError,
  type NuevoUsuario,
  type UsuariosRepository,
} from '../repositories/usuarios.repository.js';
import { verificarContrasena } from '../utils/contrasena.js';
import { CuentasService, MENSAJE_CORREO_DUPLICADO, MENSAJE_SOLO_ADMINISTRADOR } from './cuentas.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const administrador: UsuarioAutenticado = { id: 1, roles: [Rol.ADMINISTRADOR], permisos: [] };
const contador: UsuarioAutenticado = { id: 2, roles: [Rol.CONTADOR], permisos: [] };

const dto = {
  nombres: 'Laura',
  apellidos: 'Cubillos',
  correo: 'laura.cubillos@example.com',
  rol: Rol.PROFESOR as CrearCuentaDto['rol'],
};

function crearServicio(opciones: { existe?: boolean; carrera?: boolean } = {}) {
  const creados: NuevoUsuario[] = [];
  const roles: [number, Rol, number][] = [];
  const usuarios = {
    existeCorreo: vi.fn().mockResolvedValue(opciones.existe ?? false),
    crear: vi.fn((_c: Consultor, nuevo: NuevoUsuario) => {
      if (opciones.carrera) return Promise.reject(new CorreoDuplicadoError());
      creados.push(nuevo);
      return Promise.resolve({ id: 9, nombres: nuevo.nombres, apellidos: nuevo.apellidos, correo: nuevo.correo, estado: nuevo.estado });
    }),
    asignarRol: vi.fn((_c: Consultor, id: number, rol: Rol, por: number) => {
      roles.push([id, rol, por]);
      return Promise.resolve();
    }),
  } as unknown as UsuariosRepository;
  const registrarAuditoria = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar: registrarAuditoria } as unknown as AuditoriaRepository;
  return { servicio: new CuentasService(baseDatos, usuarios, auditoria), creados, roles, registrarAuditoria };
}

describe('CuentasService.crear (HU-M1-01)', () => {
  it('CA-01 y CA-04: guarda la cuenta con el rol elegido y la registra en auditoría', async () => {
    const { servicio, creados, roles, registrarAuditoria } = crearServicio();

    const cuenta = await servicio.crear(administrador, dto);

    expect(cuenta).toMatchObject({
      id: 9,
      nombre: 'Laura Cubillos',
      correo: 'laura.cubillos@example.com',
      rol: Rol.PROFESOR,
      estado: 'POR_REGISTRAR',
    });
    expect(creados[0].creadoPor).toBe(1);
    expect(roles).toEqual([[9, Rol.PROFESOR, 1]]);
    expect(registrarAuditoria).toHaveBeenCalledWith(
      consultor,
      expect.objectContaining({ modulo: 'M1', tabla: 'usuario', registroId: 9, accion: 'CREAR', usuarioId: 1 }),
    );
  });

  it('CA-05: toda cuenta nueva queda «Por registrar», también si no es Profesor', async () => {
    const { servicio, creados } = crearServicio();
    await servicio.crear(administrador, { ...dto, rol: Rol.ACUDIENTE });
    expect(creados[0].estado).toBe('POR_REGISTRAR');
  });

  it('genera una contraseña temporal y guarda solo su hash', async () => {
    const { servicio, creados } = crearServicio();

    const cuenta = await servicio.crear(administrador, dto);

    expect(cuenta.contrasenaTemporal).toHaveLength(12);
    expect(creados[0].contrasenaHash).not.toContain(cuenta.contrasenaTemporal);
    await expect(verificarContrasena(cuenta.contrasenaTemporal, creados[0].contrasenaHash)).resolves.toBe(true);
  });

  it('CA-02: rechaza un correo en uso y no crea ninguna cuenta', async () => {
    const { servicio, creados } = crearServicio({ existe: true });

    await expect(servicio.crear(administrador, dto)).rejects.toThrow(new ConflictException(MENSAJE_CORREO_DUPLICADO));
    expect(creados).toHaveLength(0);
  });

  it('CA-02: rechaza el duplicado aunque llegue entre la comprobación y el INSERT', async () => {
    const { servicio } = crearServicio({ carrera: true });
    await expect(servicio.crear(administrador, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('solo el Administrador puede crear cuentas', async () => {
    const { servicio, creados } = crearServicio();

    await expect(servicio.crear(contador, dto)).rejects.toThrow(new ForbiddenException(MENSAJE_SOLO_ADMINISTRADOR));
    expect(creados).toHaveLength(0);
  });
});
