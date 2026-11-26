import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AlmacenPolizas,
  MENSAJE_ARCHIVO_INVALIDO,
  MENSAJE_ARCHIVO_REQUERIDO,
  MENSAJE_TAMANO_ARCHIVO,
  MENSAJE_TIPO_ARCHIVO,
  TAMANO_MAXIMO_POLIZA,
  nombreDescargaPoliza,
  validarArchivoPoliza,
  type ArchivoSubido,
} from './archivo-poliza.js';

const pdf = (contenido = '%PDF-1.7\npóliza'): ArchivoSubido => ({
  originalname: 'poliza.pdf',
  mimetype: 'application/pdf',
  size: Buffer.byteLength(contenido),
  buffer: Buffer.from(contenido),
});

describe('validarArchivoPoliza (HU-M1-10, CA-05)', () => {
  it('acepta un PDF con firma válida', () => {
    expect(() => validarArchivoPoliza(pdf())).not.toThrow();
  });

  it('rechaza que no se adjunte archivo', () => {
    expect(() => validarArchivoPoliza(undefined)).toThrow(MENSAJE_ARCHIVO_REQUERIDO);
  });

  it('rechaza un tipo que no es PDF, JPG o PNG', () => {
    const archivo = { ...pdf(), mimetype: 'text/plain' };
    expect(() => validarArchivoPoliza(archivo)).toThrow(MENSAJE_TIPO_ARCHIVO);
  });

  it('rechaza un archivo que supera 5 MB', () => {
    const archivo = { ...pdf(), size: TAMANO_MAXIMO_POLIZA + 1 };
    expect(() => validarArchivoPoliza(archivo)).toThrow(MENSAJE_TAMANO_ARCHIVO);
  });

  it('rechaza un archivo cuya firma no corresponde al tipo declarado', () => {
    const archivo = { ...pdf('no es un pdf'), mimetype: 'application/pdf' };
    expect(() => validarArchivoPoliza(archivo)).toThrow(MENSAJE_ARCHIVO_INVALIDO);
  });
});

describe('nombreDescargaPoliza', () => {
  it('usa el número de póliza y una extensión segura', () => {
    expect(nombreDescargaPoliza('Póliza final.pdf', 'POL/882341', 'application/pdf')).toBe(
      'poliza-POL-882341.pdf',
    );
  });
});

describe('AlmacenPolizas', () => {
  it('guarda, lee y elimina el archivo en un directorio privado', async () => {
    const directorio = await mkdtemp(join(tmpdir(), 'polizas-'));
    const anterior = process.env.POLIZAS_DIR;
    process.env.POLIZAS_DIR = directorio;
    try {
      const almacen = new AlmacenPolizas();
      const guardado = await almacen.guardar(pdf());

      expect(guardado.clave).toMatch(/^[a-f0-9-]+\.pdf$/);
      expect((await almacen.leer(guardado.clave)).toString()).toContain('%PDF-');

      await almacen.eliminar(guardado.clave);
      await expect(almacen.leer(guardado.clave)).rejects.toThrow();
    } finally {
      if (anterior === undefined) delete process.env.POLIZAS_DIR;
      else process.env.POLIZAS_DIR = anterior;
      await rm(directorio, { recursive: true, force: true });
    }
  });
});
