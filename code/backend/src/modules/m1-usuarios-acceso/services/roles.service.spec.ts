import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import { CambiarRolDto } from '../dto/cambiar-rol.dto.js';
import type { CuentaListada, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { MENSAJE_CUENTA_NO_EXISTE } from './gestion-cuentas.service.js';
import { MENSAJE_MISMO_ROL, MENSAJE_PROPIO_ROL, RolesService } from './roles.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const administrador: UsuarioAutenticado = { id: 1, roles: [Rol.ADMINISTRADOR], permisos: [] };
const profesor: UsuarioAutenticado = { id: 8, roles: [Rol.PROFESOR], permisos: [] };

const cuenta = (roles: Rol[]): CuentaListada => ({
  id: 9,
  nombre: 'María Rojas',
  correo: 'maria.rojas@example.com',
  roles,
  estado: 'ACTIVA',
  ultimoIngresoEn: null,
});

function crearServicio(existente: CuentaListada | null = cuenta([Rol.PROFESOR])) {
  const reemplazarRoles = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    buscarParaActualizar: vi.fn().mockResolvedValue(existente),
    reemplazarRoles,
  } as unknown as UsuariosRepository;
  const registrar = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar } as unknown as AuditoriaRepository;
  return { servicio: new RolesService(baseDatos, usuarios, auditoria), reemplazarRoles, registrar };
}

describe('RolesService.cambiar (HU-M1-06)', () => {
  it('CA-01 y CA-02: el nuevo rol reemplaza al anterior y el cambio queda en la auditoría', async () => {
    const { servicio, reemplazarRoles, registrar } = crearServicio();

    const resultado = await servicio.cambiar(administrador, 9, Rol.CONTADOR);

    expect(resultado.roles).toEqual([Rol.CONTADOR]);
    expect(reemplazarRoles).toHaveBeenCalledWith(consultor, 9, Rol.CONTADOR, 1);
    expect(registrar).toHaveBeenCalledWith(
      consultor,
      expect.objectContaining({
        accion: 'CAMBIAR_ROL',
        registroId: 9,
        valorAnterior: { roles: [Rol.PROFESOR] },
        valorNuevo: { roles: [Rol.CONTADOR] },
        usuarioId: 1,
      }),
    );
  });

  it('puede nombrar a otro Administrador (decisión del equipo)', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.cambiar(administrador, 9, Rol.ADMINISTRADOR)).resolves.toMatchObject({ roles: [Rol.ADMINISTRADOR] });
  });

  it('una cuenta con varios roles queda con uno solo', async () => {
    const { servicio } = crearServicio(cuenta([Rol.ACUDIENTE, Rol.PROFESOR]));
    await expect(servicio.cambiar(administrador, 9, Rol.PROFESOR)).resolves.toMatchObject({ roles: [Rol.PROFESOR] });
  });

  it('no deja que el Administrador cambie su propio rol: el club nunca queda sin Administrador', async () => {
    const { servicio, reemplazarRoles } = crearServicio();
    await expect(servicio.cambiar(administrador, 1, Rol.PROFESOR)).rejects.toThrow(new ConflictException(MENSAJE_PROPIO_ROL));
    expect(reemplazarRoles).not.toHaveBeenCalled();
  });

  it('rechaza asignar el mismo rol y una cuenta inexistente', async () => {
    await expect(crearServicio().servicio.cambiar(administrador, 9, Rol.PROFESOR)).rejects.toThrow(
      new ConflictException(MENSAJE_MISMO_ROL),
    );
    await expect(crearServicio(null).servicio.cambiar(administrador, 99, Rol.PROFESOR)).rejects.toThrow(
      new NotFoundException(MENSAJE_CUENTA_NO_EXISTE),
    );
  });

  it('CA-05: un usuario que no es Administrador no cambia roles', async () => {
    const { servicio, reemplazarRoles } = crearServicio();
    await expect(servicio.cambiar(profesor, 9, Rol.ADMINISTRADOR)).rejects.toBeInstanceOf(ForbiddenException);
    expect(reemplazarRoles).not.toHaveBeenCalled();
  });
});

describe('CambiarRolDto · CA-04', () => {
  const validar = (datos: Record<string, unknown>) =>
    validateSync(plainToInstance(CambiarRolDto, datos), { whitelist: true, forbidNonWhitelisted: true }).map((e) => e.property);

  it.each(Object.values(Rol))('acepta el rol %s', (rol) => {
    expect(validar({ rol })).toEqual([]);
  });

  it.each(['SUPERADMIN', 'administrador', '', 7])('rechaza un rol que el sistema no define: %s', (rol) => {
    expect(validar({ rol })).toEqual(['rol']);
  });
});
