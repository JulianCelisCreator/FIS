import { BadRequestException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import {
  Rol,
  type UsuarioAutenticado,
} from '../../../common/auth/usuario-autenticado.js';
import type {
  BaseDatosService,
  Consultor,
} from '../../../common/database/base-datos.service.js';
import type {
  AutorizacionesRepository,
  NuevaAutorizacion,
  PatinadorConAutorizacion,
} from '../repositories/autorizaciones.repository.js';
import {
  AutorizacionesService,
  MENSAJE_TEXTO_ACTUALIZADO,
} from './autorizaciones.service.js';

const consultor = {} as Consultor;
const baseDatos = {
  consultor,
  transaccion: <T>(trabajo: (c: Consultor) => Promise<T>) => trabajo(consultor),
} as unknown as BaseDatosService;

const acudiente: UsuarioAutenticado = {
  id: 10,
  roles: [Rol.ACUDIENTE],
  permisos: [],
};

const pendiente = (): PatinadorConAutorizacion => ({
  id: 100,
  nombre: 'Sofía Ramírez',
  tipoDocumento: 'TI',
  numeroDocumento: '1023456789',
  edad: 12,
  esMenor: true,
  activo: true,
  acudientes: [
    {
      id: 10,
      nombre: 'Carolina Torres',
      parentesco: 'madre',
      esPrincipal: true,
    },
  ],
  autorizacion: null,
  perfil: {
    estado: 'BLOQUEADO',
    tienePolizaVigente: true,
    requisitosFaltantes: ['AUTORIZACION'],
  },
});

function crearServicio() {
  let ficha = pendiente();
  const creadas: NuevaAutorizacion[] = [];
  const bloquear = vi.fn().mockResolvedValue(undefined);
  const autorizaciones = {
    bloquear,
    obtenerDetalle: vi.fn(() => Promise.resolve(ficha)),
    crear: vi.fn((_c: Consultor, nueva: NuevaAutorizacion) => {
      creadas.push(nueva);
      ficha = {
        ...ficha,
        autorizacion: {
          id: 7,
          fechaAutorizacion: nueva.fechaAutorizacion,
          registradaEn: `${nueva.fechaAutorizacion}T15:00:00.000Z`,
          versionTexto: nueva.versionTexto,
          acudiente: { id: nueva.acudienteId, nombre: 'Carolina Torres' },
        },
        perfil: {
          ...ficha.perfil,
          estado: 'HABILITADO',
          requisitosFaltantes: [],
        },
      };
      return Promise.resolve(7);
    }),
  } as unknown as AutorizacionesRepository;
  const registrar = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar } as unknown as AuditoriaRepository;
  return {
    servicio: new AutorizacionesService(baseDatos, autorizaciones, auditoria),
    creadas,
    registrar,
    bloquear,
  };
}

describe('AutorizacionesService.registrar (HU-M1-09)', () => {
  it('CA-01: guarda identidad, fecha, versión y auditoría, y actualiza el estado del requisito', async () => {
    const { servicio, creadas, registrar, bloquear } = crearServicio();

    const detalle = await servicio.registrar(acudiente, 100, {
      acepta: true,
      versionTexto: 'v1',
    });

    expect(bloquear).toHaveBeenCalledWith(consultor, 100);
    expect(creadas[0]).toMatchObject({
      patinadorId: 100,
      acudienteId: 10,
      versionTexto: 'v1',
      registradoPor: 10,
    });
    expect(creadas[0].fechaAutorizacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(registrar).toHaveBeenCalledWith(
      consultor,
      expect.objectContaining({
        modulo: 'M1',
        tabla: 'autorizacion_acudiente',
        registroId: 7,
        accion: 'REGISTRAR_AUTORIZACION',
        usuarioId: 10,
      }),
    );
    expect(detalle.autorizacion?.acudiente.id).toBe(10);
    expect(detalle.puedeRegistrar).toBe(false);
    expect(detalle.perfil.estado).toBe('HABILITADO');
  });

  it('no guarda nada si la versión del texto ya no es la vigente', async () => {
    const { servicio, creadas, registrar } = crearServicio();

    await expect(
      servicio.registrar(acudiente, 100, { acepta: true, versionTexto: 'v0' }),
    ).rejects.toThrow(new BadRequestException(MENSAJE_TEXTO_ACTUALIZADO));
    expect(creadas).toHaveLength(0);
    expect(registrar).not.toHaveBeenCalled();
  });
});
