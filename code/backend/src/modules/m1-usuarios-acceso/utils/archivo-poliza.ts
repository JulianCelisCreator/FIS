import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

/**
 * Reglas del adjunto de la póliza (HU-M1-10, CA-01 y CA-05).
 *
 * El requisito deja [Por definir] los tipos y el tamaño. Se fijan PDF, JPG y
 * PNG con un máximo de 5 MB, que cubre una póliza escaneada sin aceptar
 * archivos pesados. El frontend valida lo mismo para dar el motivo antes de
 * subir; el backend vuelve a validar porque es la frontera de confianza.
 */
export const TAMANO_MAXIMO_POLIZA = 5 * 1024 * 1024;
export const LIMITE_DURO_POLIZA = TAMANO_MAXIMO_POLIZA + 1;

export const TIPOS_ARCHIVO_POLIZA: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export const MENSAJE_ARCHIVO_REQUERIDO =
  'Adjunta el documento de la póliza.';
export const MENSAJE_TIPO_ARCHIVO =
  'El archivo debe ser PDF, JPG o PNG.';
export const MENSAJE_TAMANO_ARCHIVO =
  'El archivo supera el tamaño máximo de 5 MB.';
export const MENSAJE_ARCHIVO_VACIO = 'El archivo está vacío.';
export const MENSAJE_ARCHIVO_INVALIDO =
  'El contenido del archivo no corresponde a un PDF, JPG o PNG válido.';

/** Archivo que entrega Multer en memoria (no se usa el tipo global de Express). */
export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ArchivoGuardado {
  /** Clave privada que se guarda en poliza.archivo_url. */
  clave: string;
  nombre: string;
  tipo: string;
  tamano: number;
}

/** CA-05: rechaza archivos ausentes, vacíos, de otro tipo o demasiado grandes. */
export function validarArchivoPoliza(
  archivo: ArchivoSubido | undefined,
): asserts archivo is ArchivoSubido {
  if (!archivo) throw new BadRequestException(MENSAJE_ARCHIVO_REQUERIDO);
  if (archivo.size <= 0 || archivo.buffer.length === 0) {
    throw new BadRequestException(MENSAJE_ARCHIVO_VACIO);
  }
  if (!TIPOS_ARCHIVO_POLIZA[archivo.mimetype]) {
    throw new BadRequestException(MENSAJE_TIPO_ARCHIVO);
  }
  if (archivo.size > TAMANO_MAXIMO_POLIZA) {
    throw new BadRequestException(MENSAJE_TAMANO_ARCHIVO);
  }
  if (!firmaValida(archivo)) {
    throw new BadRequestException(MENSAJE_ARCHIVO_INVALIDO);
  }
}

/** Comprueba los primeros bytes para que el MIME declarado no sea suficiente. */
function firmaValida(archivo: ArchivoSubido): boolean {
  const { buffer, mimetype } = archivo;
  if (mimetype === 'application/pdf') {
    return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  }
  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    const firma = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return firma.every((byte, indice) => buffer[indice] === byte);
  }
  return false;
}

/** Almacenamiento privado en disco: fuera de la carpeta pública y con nombre aleatorio. */
@Injectable()
export class AlmacenPolizas {
  private readonly directorio =
    process.env.POLIZAS_DIR ?? join(process.cwd(), 'uploads', 'polizas');

  async guardar(archivo: ArchivoSubido): Promise<ArchivoGuardado> {
    await mkdir(this.directorio, { recursive: true });
    const extension = TIPOS_ARCHIVO_POLIZA[archivo.mimetype];
    const clave = `${randomUUID()}.${extension}`;
    await writeFile(this.ruta(clave), archivo.buffer, { flag: 'wx', mode: 0o600 });
    return {
      clave,
      nombre: archivo.originalname,
      tipo: archivo.mimetype,
      tamano: archivo.size,
    };
  }

  leer(clave: string): Promise<Buffer> {
    return readFile(this.ruta(clave));
  }

  async eliminar(clave: string): Promise<void> {
    await rm(this.ruta(clave), { force: true });
  }

  /** path.basename evita que una clave manipulada salga del directorio privado. */
  private ruta(clave: string): string {
    return join(this.directorio, basename(clave));
  }
}

/** Nombre seguro para Content-Disposition; no se confía en el nombre original. */
export function nombreDescargaPoliza(
  nombreOriginal: string | null,
  numeroPoliza: string,
  tipo: string,
): string {
  const extension = TIPOS_ARCHIVO_POLIZA[tipo] ?? extensionDe(nombreOriginal) ?? 'bin';
  const base = `poliza-${numeroPoliza || 'adjunto'}`
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'poliza-adjunto'}.${extension}`;
}

function extensionDe(nombre: string | null): string | null {
  if (!nombre) return null;
  const extension = extname(nombre).replace('.', '').toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(extension) ? extension : null;
}
