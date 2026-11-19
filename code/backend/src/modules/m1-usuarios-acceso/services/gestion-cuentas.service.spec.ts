import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { FiltrosCuentasDto } from '../dto/filtros-cuentas.dto.js';
import type {
  CuentaListada,
  EstadoUsuario,
  FiltrosListadoCuentas,
  UsuariosRepository,
} from '../repositories/usuarios.repository.js';
import {
  GestionCuentasService,
  MENSAJE_CUENTA_NO_EXISTE,
  MENSAJE_NO_DESACTIVADA,
  MENSAJE_PROPIA_CUENTA,
  MENSAJE_YA_DESACTIVADA,
} from './gestion-cuentas.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const administrador: UsuarioAutenticado = { id: 1, roles: [Rol.ADMINISTRADOR], permisos: [] };
const contador: UsuarioAutenticado = { id: 2, roles: [Rol.CONTADOR], permisos: [] };

const cuenta = (estado: EstadoUsuario): CuentaListada => ({
  id: 9,
  nombre: 'Laura Cubillos',
  correo: 'laura.cubillos@example.com',
  roles: [Rol.PROFESOR],
  estado,
  ultimoIngresoEn: null,
});

function crearServicio(opciones: { cuenta?: CuentaListada | null; estadoPrevio?: EstadoUsuario | null } = {}) {
  const listar = vi.fn((_c: Consultor, _f: FiltrosListadoCuentas) =>
    Promise.resolve({ cuentas: [cuenta('ACTIVA')], total: 41 }),
  );
  const cambiarEstado = vi.fn().mockResolvedValue(undefined);
  const usuarios = {
    listar,
    buscarParaActualizar: vi.fn().mockResolvedValue(opciones.cuenta === undefined ? cuenta('ACTIVA') : opciones.cuenta),
    cambiarEstado,
    estadoAntesDeDesactivar: vi.fn().mockResolvedValue(opciones.estadoPrevio ?? null),
  } as unknown as UsuariosRepository;
  const registrar = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar } as unknown as AuditoriaRepository;
  return { servicio: new GestionCuentasService(baseDatos, usuarios, auditoria), listar, cambiarEstado, registrar };
}

const filtros = (parcial: Partial<FiltrosCuentasDto> = {}) =>
  ({ pagina: 1, tamano: 20, ...parcial }) as FiltrosCuentasDto;

describe('GestionCuentasService (HU-M1-05)', () => {
  describe('listar · CA-01', () => {
    it('pasa los filtros al repositorio y calcula el desplazamiento de la página', async () => {
      const { servicio, listar } = crearServicio();

      const pagina = await servicio.listar(
        administrador,
        filtros({ buscar: 'laura', rol: Rol.PROFESOR, estado: 'ACTIVA', pagina: 3, tamano: 20 }),
      );

      expect(listar).toHaveBeenCalledWith(consultor, {
        buscar: 'laura',
        rol: Rol.PROFESOR,
        estado: 'ACTIVA',
        limite: 20,
        desplazamiento: 40,
      });
      expect(pagina).toMatchObject({ total: 41, pagina: 3, tamano: 20 });
      expect(pagina.cuentas).toHaveLength(1);
    });

    it('una búsqueda vacía no filtra', async () => {
      const { servicio, listar } = crearServicio();
      await servicio.listar(administrador, filtros({ buscar: '' }));
      expect(listar.mock.calls[0][1].buscar).toBeUndefined();
    });
  });

  describe('desactivar · CA-03', () => {
    it('cambia el estado a desactivada (sin borrar) y registra el estado anterior en auditoría', async () => {
      const { servicio, cambiarEstado, registrar } = crearServicio({ cuenta: cuenta('POR_REGISTRAR') });

      const resultado = await servicio.desactivar(administrador, 9);

      expect(resultado.estado).toBe('DESACTIVADA');
      expect(cambiarEstado).toHaveBeenCalledWith(consultor, 9, 'DESACTIVADA');
      expect(registrar).toHaveBeenCalledWith(
        consultor,
        expect.objectContaining({
          accion: 'DESACTIVAR',
          registroId: 9,
          valorAnterior: { estado: 'POR_REGISTRAR' },
          usuarioId: 1,
        }),
      );
    });

    it('no deja que el Administrador se desactive a sí mismo', async () => {
      const { servicio, cambiarEstado } = crearServicio();
      await expect(servicio.desactivar(administrador, 1)).rejects.toThrow(new ConflictException(MENSAJE_PROPIA_CUENTA));
      expect(cambiarEstado).not.toHaveBeenCalled();
    });

    it('rechaza una cuenta ya desactivada o inexistente', async () => {
      await expect(crearServicio({ cuenta: cuenta('DESACTIVADA') }).servicio.desactivar(administrador, 9)).rejects.toThrow(
        new ConflictException(MENSAJE_YA_DESACTIVADA),
      );
      await expect(crearServicio({ cuenta: null }).servicio.desactivar(administrador, 99)).rejects.toThrow(
        new NotFoundException(MENSAJE_CUENTA_NO_EXISTE),
      );
    });
  });

  describe('reactivar · CA-04', () => {
    it.each<[EstadoUsuario, EstadoUsuario]>([
      ['ACTIVA', 'ACTIVA'],
      ['POR_REGISTRAR', 'POR_REGISTRAR'],
    ])('si antes estaba %s, vuelve a %s', async (previo, esperado) => {
      const { servicio, cambiarEstado, registrar } = crearServicio({ cuenta: cuenta('DESACTIVADA'), estadoPrevio: previo });

      const resultado = await servicio.reactivar(administrador, 9);

      expect(resultado.estado).toBe(esperado);
      expect(cambiarEstado).toHaveBeenCalledWith(consultor, 9, esperado);
      expect(registrar).toHaveBeenCalledWith(consultor, expect.objectContaining({ accion: 'REACTIVAR', valorNuevo: { estado: esperado } }));
    });

    it('sin registro en la auditoría vuelve a «Activa»', async () => {
      const { servicio } = crearServicio({ cuenta: cuenta('DESACTIVADA'), estadoPrevio: null });
      await expect(servicio.reactivar(administrador, 9)).resolves.toMatchObject({ estado: 'ACTIVA' });
    });

    it('solo reactiva cuentas desactivadas', async () => {
      await expect(crearServicio({ cuenta: cuenta('ACTIVA') }).servicio.reactivar(administrador, 9)).rejects.toThrow(
        new ConflictException(MENSAJE_NO_DESACTIVADA),
      );
    });
  });

  it('CA-06: un usuario que no es Administrador no lista, ni desactiva, ni reactiva', async () => {
    const { servicio, listar, cambiarEstado } = crearServicio();
    await expect(servicio.listar(contador, filtros())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.desactivar(contador, 9)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.reactivar(contador, 9)).rejects.toBeInstanceOf(ForbiddenException);
    expect(listar).not.toHaveBeenCalled();
    expect(cambiarEstado).not.toHaveBeenCalled();
  });
});
