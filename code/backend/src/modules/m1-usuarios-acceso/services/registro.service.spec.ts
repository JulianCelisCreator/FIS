import { ConflictException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol } from '../../../common/auth/usuario-autenticado.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { RegistrarUsuarioDto } from '../dto/registrar-usuario.dto.js';
import {
  CorreoDuplicadoError,
  type NuevoUsuario,
  type UsuariosRepository,
} from '../repositories/usuarios.repository.js';
import { verificarContrasena } from '../utils/contrasena.js';
import { MENSAJE_CORREO_DUPLICADO, RegistroService } from './registro.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const dto: RegistrarUsuarioDto = {
  nombres: 'Carolina',
  apellidos: 'Ramírez',
  correo: 'carolina.ramirez@example.com',
  contrasena: 'Patines2026',
  rol: Rol.ACUDIENTE,
};

function crearServicio(opciones: { existe?: boolean; carrera?: boolean } = {}) {
  const creados: NuevoUsuario[] = [];
  const roles: [number, Rol][] = [];
  const usuarios = {
    existeCorreo: vi.fn().mockResolvedValue(opciones.existe ?? false),
    crear: vi.fn((_c: Consultor, nuevo: NuevoUsuario) => {
      if (opciones.carrera) return Promise.reject(new CorreoDuplicadoError());
      creados.push(nuevo);
      return Promise.resolve({ id: 7, nombres: nuevo.nombres, apellidos: nuevo.apellidos, correo: nuevo.correo, estado: 'ACTIVA' as const });
    }),
    asignarRol: vi.fn((_c: Consultor, id: number, rol: Rol) => {
      roles.push([id, rol]);
      return Promise.resolve();
    }),
  } as unknown as UsuariosRepository;
  const registrarAuditoria = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar: registrarAuditoria } as unknown as AuditoriaRepository;
  return { servicio: new RegistroService(baseDatos, usuarios, auditoria), creados, roles, registrarAuditoria };
}

describe('RegistroService.registrar (RF-M1-01)', () => {
  it('crea la cuenta con el rol elegido, el hash de la contraseña y auditoría', async () => {
    const { servicio, creados, roles, registrarAuditoria } = crearServicio();

    const cuenta = await servicio.registrar(dto);

    expect(cuenta).toEqual({
      id: 7,
      nombre: 'Carolina Ramírez',
      correo: 'carolina.ramirez@example.com',
      rol: Rol.ACUDIENTE,
      estado: 'ACTIVA',
      correoVerificado: false,
    });
    expect(JSON.stringify(cuenta)).not.toContain('Patines2026');
    expect(creados[0].creadoPor).toBeNull();
    expect(creados[0].contrasenaHash).not.toBe('Patines2026');
    await expect(verificarContrasena('Patines2026', creados[0].contrasenaHash)).resolves.toBe(true);
    expect(roles).toEqual([[7, Rol.ACUDIENTE]]);
    expect(registrarAuditoria).toHaveBeenCalledWith(
      consultor,
      expect.objectContaining({ modulo: 'M1', tabla: 'usuario', registroId: 7, accion: 'REGISTRAR' }),
    );
  });

  it('rechaza un correo que ya tiene cuenta', async () => {
    const { servicio, creados } = crearServicio({ existe: true });

    await expect(servicio.registrar(dto)).rejects.toThrow(new ConflictException(MENSAJE_CORREO_DUPLICADO));
    expect(creados).toHaveLength(0);
  });

  it('rechaza el duplicado aunque llegue entre la comprobación y el INSERT', async () => {
    const { servicio } = crearServicio({ carrera: true });

    await expect(servicio.registrar(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});
