// Reglas de negocio del registro de personal (HU-6.2 / RF-M6-02), sin acceso a
// base de datos para poder probarlas de forma aislada.

export class ErrorReglaPersonal extends Error {
  constructor(
    mensaje: string,
    /** NO_ENCONTRADO → 404, DUPLICADO → 409, INVALIDO → 400. */
    readonly motivo: 'NO_ENCONTRADO' | 'DUPLICADO' | 'INVALIDO' = 'INVALIDO',
  ) {
    super(mensaje);
    this.name = 'ErrorReglaPersonal';
  }
}

export interface DatosPersonales {
  numeroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
}

const espacios = (texto: string) => texto.trim().replace(/\s+/g, ' ');

/**
 * Limpia los datos antes de guardarlos: sin espacios sobrantes, documento en
 * mayúsculas, correo en minúsculas y teléfono sin espacios. Así la unicidad
 * de documento y correo no depende de cómo se escribieron.
 */
export function normalizarPersonal<T extends DatosPersonales>(datos: T): T {
  const limpio = { ...datos };
  if (limpio.numeroDocumento !== undefined) {
    limpio.numeroDocumento = limpio.numeroDocumento.trim().toUpperCase();
  }
  if (limpio.nombres !== undefined) limpio.nombres = espacios(limpio.nombres);
  if (limpio.apellidos !== undefined) limpio.apellidos = espacios(limpio.apellidos);
  if (limpio.correo !== undefined) limpio.correo = limpio.correo.trim().toLowerCase();
  if (limpio.telefono !== undefined) limpio.telefono = limpio.telefono.replace(/\s+/g, '');
  for (const campo of ['nombres', 'apellidos'] as const) {
    if (limpio[campo] === '') {
      throw new ErrorReglaPersonal(
        `${campo === 'nombres' ? 'Los nombres' : 'Los apellidos'} no pueden quedar vacíos`,
      );
    }
  }
  return limpio;
}

/** Mensaje para cada restricción de unicidad de la tabla personal. */
const DUPLICADOS: Record<string, string> = {
  personal_tipo_documento_numero_documento_key:
    'Ya existe una persona registrada con ese tipo y número de documento',
  personal_correo_uk: 'Ya existe una persona registrada con ese correo',
  personal_usuario_id_key: 'Esa cuenta ya está vinculada a otra persona del personal',
};

/**
 * Traduce un error de PostgreSQL por valor duplicado (23505) al campo que falla.
 * Devuelve null si el error no es de unicidad de personal.
 */
export function mensajeDuplicado(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const { code, constraint } = error as { code?: string; constraint?: string };
  if (code !== '23505' || !constraint) return null;
  return DUPLICADOS[constraint] ?? null;
}

export interface CuentaVinculable {
  id: number;
  estado: string;
  /** Persona del personal que ya tiene la cuenta, si la hay. */
  personalId: number | null;
}

/**
 * Una cuenta de M1 se puede vincular si existe, no está desactivada y no
 * pertenece a otra persona del personal. M6 no crea cuentas: solo las vincula.
 */
export function validarCuentaVinculable(
  cuenta: CuentaVinculable | null,
  personalId: number | null,
): void {
  if (!cuenta) {
    throw new ErrorReglaPersonal('La cuenta de usuario no existe', 'NO_ENCONTRADO');
  }
  if (cuenta.estado === 'DESACTIVADA') {
    throw new ErrorReglaPersonal('No se puede vincular una cuenta desactivada');
  }
  if (cuenta.personalId !== null && cuenta.personalId !== personalId) {
    throw new ErrorReglaPersonal(
      'Esa cuenta ya está vinculada a otra persona del personal',
      'DUPLICADO',
    );
  }
}
