import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Rol,
  type UsuarioAutenticado,
} from '../../../common/auth/usuario-autenticado.js';
import type { PatinadorConAutorizacion } from '../repositories/autorizaciones.repository.js';

export const MENSAJE_SIN_ACCESO =
  'No puedes consultar la autorización de este patinador.';
export const MENSAJE_YA_REGISTRADA =
  'El patinador ya tiene una autorización registrada.';
export const MENSAJE_SOLO_MENOR =
  'Solo los patinadores menores de edad requieren autorización del acudiente.';
export const MENSAJE_PATINADOR_INACTIVO =
  'El patinador está inactivo; no se puede registrar la autorización.';
export const MENSAJE_SIN_ACUDIENTE =
  'Vincula un acudiente al patinador antes de registrar la autorización.';
export const MENSAJE_ACUDIENTE_AJENO =
  'El acudiente indicado no está vinculado a este patinador.';
export const MENSAJE_ACUDIENTE_PROPIO =
  'Solo puedes registrar autorizaciones a tu nombre.';

function esAdministrador(usuario: UsuarioAutenticado): boolean {
  return usuario.roles.includes(Rol.ADMINISTRADOR);
}

function esAcudienteVinculado(
  usuario: UsuarioAutenticado,
  patinador: PatinadorConAutorizacion,
): boolean {
  return (
    usuario.roles.includes(Rol.ACUDIENTE) &&
    patinador.acudientes.some((acudiente) => acudiente.id === usuario.id)
  );
}

/**
 * CA-04 y privacidad de M1: el Administrador ve a todos y el Acudiente solo a
 * los patinadores vinculados a su cuenta. Un tercero recibe 403.
 */
export function validarConsultaAutorizacion(
  usuario: UsuarioAutenticado,
  patinador: PatinadorConAutorizacion | null,
): asserts patinador is PatinadorConAutorizacion {
  if (!patinador) {
    throw new NotFoundException('El patinador no existe.');
  }
  if (!esAdministrador(usuario) && !esAcudienteVinculado(usuario, patinador)) {
    throw new ForbiddenException(MENSAJE_SIN_ACCESO);
  }
}

/**
 * CA-01 y CA-05: solo un patinador menor, activo, vinculado a un acudiente y
 * sin autorización previa puede recibirla. Devuelve el acudiente que la otorga:
 * el de la sesión para un Acudiente y el indicado (o el principal) para el
 * Administrador que registra en su nombre.
 */
export function validarRegistroAutorizacion(
  usuario: UsuarioAutenticado,
  patinador: PatinadorConAutorizacion | null,
  acudienteId?: number,
): { acudienteId: number } {
  validarConsultaAutorizacion(usuario, patinador);

  if (!patinador.activo)
    throw new ConflictException(MENSAJE_PATINADOR_INACTIVO);
  if (!patinador.esMenor) throw new ConflictException(MENSAJE_SOLO_MENOR);
  if (patinador.autorizacion)
    throw new ConflictException(MENSAJE_YA_REGISTRADA);
  if (patinador.acudientes.length === 0) {
    throw new ConflictException(MENSAJE_SIN_ACUDIENTE);
  }

  if (!esAdministrador(usuario)) {
    if (acudienteId !== undefined && acudienteId !== usuario.id) {
      throw new ForbiddenException(MENSAJE_ACUDIENTE_PROPIO);
    }
    return { acudienteId: usuario.id };
  }

  const elegido =
    acudienteId ??
    patinador.acudientes.find((acudiente) => acudiente.esPrincipal)?.id ??
    patinador.acudientes[0].id;
  if (!patinador.acudientes.some((acudiente) => acudiente.id === elegido)) {
    throw new BadRequestException(MENSAJE_ACUDIENTE_AJENO);
  }
  return { acudienteId: elegido };
}
