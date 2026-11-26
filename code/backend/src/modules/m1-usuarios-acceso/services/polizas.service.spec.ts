import { ConflictException } from '@nestjs/common';
import type { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type {
  BaseDatosService,
  Consultor,
} from '../../../common/database/base-datos.service.js';
import type {
  AutorizacionesRepository,
  PatinadorConAutorizacion,
} from '../repositories/autorizaciones.repository.js';
import type {
  NuevaPoliza,
  PolizaRegistrada,
  PolizasRepository,
} from '../repositories/polizas.repository.js';
import {
  MENSAJE_FECHAS_INVERTIDAS,
  MENSAJE_POLIZA_DUPLICADA,
} from '../validators/poliza.validator.js';
import type { AlmacenPolizas, ArchivoGuardado, ArchivoSubido } from '../utils/archivo-poliza.js';
import { PolizasService } from './polizas.service.js';

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

const patinador = (): PatinadorConAutorizacion => ({
  id: 100,
  nombre: 'Sofía Ramírez',
  tipoDocumento: 'TI',
  numeroDocumento: '1023456789',
  edad: 9,
  esMenor: true,
  activo: true,
  acudientes: [
    { id: 10, nombre: 'Carolina Ramírez', parentesco: 'madre', esPrincipal: true },
  ],
  autorizacion: null,
  perfil: {
    estado: 'BLOQUEADO',
    tienePolizaVigente: false,
    requisitosFaltantes: ['AUTORIZACION', 'POLIZA'],
  },
});

const poliza = (): PolizaRegistrada => ({
  id: 7,
  aseguradora: 'Sura',
  numeroPoliza: 'POL-882341',
  vigenteDesde: '2026-01-01',
  vigenteHasta: '2026-12-31',
  estado: 'VIGENTE',
  estadoRevision: 'APROBADA',
  archivo: { nombre: 'poliza.pdf', tipo: 'application/pdf', tamano: 14 },
  registradaEn: '2026-11-25T15:00:00.000Z',
  registradaPor: { id: 10, nombre: 'Carolina Ramírez' },
});

const archivo: ArchivoSubido = {
  originalname: 'poliza.pdf',
  mimetype: 'application/pdf',
  size: 14,
  buffer: Buffer.from('%PDF-1.7\npóliza'),
};

const dto = {
  aseguradora: 'Sura',
  numeroPoliza: 'POL-882341',
  vigenteDesde: '2026-01-01',
  vigenteHasta: '2026-12-31',
};

function crearServicio() {
  const guardado: ArchivoGuardado = {
    clave: 'archivo.pdf',
    nombre: 'poliza.pdf',
    tipo: 'application/pdf',
    tamano: 14,
  };
  const obtenerDetalle = vi.fn(() => Promise.resolve(patinador()));
  const bloquear = vi.fn().mockResolvedValue(undefined);
  const autorizaciones = { obtenerDetalle, bloquear } as unknown as AutorizacionesRepository;
  const listar = vi.fn(() => Promise.resolve([poliza()]));
  const crear = vi.fn((_c: Consultor, _nueva: NuevaPoliza) => Promise.resolve(7));
  const obtenerArchivo = vi.fn();
  const polizas = { listar, crear, obtenerArchivo } as unknown as PolizasRepository;
  const guardar = vi.fn(() => Promise.resolve(guardado));
  const leer = vi.fn(() => Promise.resolve(Buffer.from('%PDF-1.7')));
  const eliminar = vi.fn().mockResolvedValue(undefined);
  const almacen = { guardar, leer, eliminar } as unknown as AlmacenPolizas;
  const registrarAuditoria = vi.fn().mockResolvedValue(undefined);
  const auditoria = { registrar: registrarAuditoria } as unknown as AuditoriaRepository;

  return {
    servicio: new PolizasService(baseDatos, autorizaciones, polizas, almacen, auditoria),
    obtenerDetalle,
    listar,
    crear,
    obtenerArchivo,
    guardar,
    leer,
    eliminar,
    registrarAuditoria,
    guardado,
  };
}

describe('PolizasService.registrar (HU-M1-10)', () => {
  it('CA-01 y CA-02: guarda el adjunto, la póliza y la auditoría', async () => {
    const { servicio, guardar, crear, registrarAuditoria, guardado } = crearServicio();

    const detalle = await servicio.registrar(acudiente, 100, dto, archivo);

    expect(guardar).toHaveBeenCalledWith(archivo);
    expect(crear).toHaveBeenCalledWith(
      consultor,
      expect.objectContaining({
        patinadorId: 100,
        aseguradora: 'Sura',
        numeroPoliza: 'POL-882341',
        archivo: guardado,
        registradoPor: 10,
      }),
    );
    expect(registrarAuditoria).toHaveBeenCalledWith(
      consultor,
      expect.objectContaining({
        modulo: 'M1',
        tabla: 'poliza',
        registroId: 7,
        accion: 'REGISTRAR_POLIZA',
        usuarioId: 10,
      }),
    );
    expect(detalle.polizaActual?.id).toBe(7);
    expect(detalle.historial).toHaveLength(1);
    expect(detalle.puedeRegistrar).toBe(true);
  });

  it('CA-02: rechaza fechas invertidas antes de guardar el archivo', async () => {
    const { servicio, guardar, crear } = crearServicio();

    await expect(
      servicio.registrar(
        acudiente,
        100,
        { ...dto, vigenteDesde: '2026-12-31', vigenteHasta: '2026-01-01' },
        archivo,
      ),
    ).rejects.toThrow(MENSAJE_FECHAS_INVERTIDAS);
    expect(guardar).not.toHaveBeenCalled();
    expect(crear).not.toHaveBeenCalled();
  });

  it('CA-05: rechaza un archivo inválido', async () => {
    const { servicio, guardar } = crearServicio();

    await expect(
      servicio.registrar(acudiente, 100, dto, { ...archivo, mimetype: 'text/plain' }),
    ).rejects.toThrow('El archivo debe ser PDF, JPG o PNG.');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('elimina el archivo y responde conflicto si la póliza ya existe', async () => {
    const { servicio, crear, eliminar } = crearServicio();
    crear.mockRejectedValueOnce({ code: '23505' });

    let error: unknown;
    try {
      await servicio.registrar(acudiente, 100, dto, archivo);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as Error).message).toBe(MENSAJE_POLIZA_DUPLICADA);
    expect(eliminar).toHaveBeenCalled();
  });
});

describe('PolizasService.detalle (HU-M1-10, CA-03 y CA-04)', () => {
  it('no ofrece registrar para un mayor de edad', async () => {
    const { servicio, obtenerDetalle, listar } = crearServicio();
    obtenerDetalle.mockResolvedValue({
      ...patinador(),
      edad: 20,
      esMenor: false,
    });
    listar.mockResolvedValue([]);

    const detalle = await servicio.detalle(acudiente, 100);

    expect(detalle.polizaActual).toBeNull();
    expect(detalle.puedeRegistrar).toBe(false);
    expect(detalle.motivoNoRegistra).toContain('menores de edad');
  });
});

describe('PolizasService.obtenerArchivo (HU-M1-10)', () => {
  it('devuelve el contenido y un nombre de descarga seguro', async () => {
    const { servicio, obtenerArchivo, leer } = crearServicio();
    obtenerArchivo.mockResolvedValue({
      numeroPoliza: 'POL-882341',
      archivoUrl: 'archivo.pdf',
      archivoNombre: 'Póliza final.pdf',
      archivoTipo: 'application/pdf',
    });

    const descarga = await servicio.obtenerArchivo(acudiente, 100, 7);

    expect(leer).toHaveBeenCalledWith('archivo.pdf');
    expect(descarga.contenido.toString()).toContain('%PDF-');
    expect(descarga.nombre).toBe('poliza-POL-882341.pdf');
  });
});
