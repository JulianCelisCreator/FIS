import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Rol,
  type UsuarioAutenticado,
} from '../../../common/auth/usuario-autenticado.js';

/** Lo que hace falta saber del patinador para decidir quién puede actuar sobre él. */
export interface ContextoPatinador {
  id: number;
  usuarioId: number | null;
  activo: boolean;
  esMenor: boolean;
  acudienteIds: number[];
}

function esAcudienteDe(usuario: UsuarioAutenticado, patinador: ContextoPatinador): boolean {
  return usuario.roles.includes(Rol.ACUDIENTE) && patinador.acudienteIds.includes(usuario.id);
}

function esElPatinador(usuario: UsuarioAutenticado, patinador: ContextoPatinador): boolean {
  return usuario.roles.includes(Rol.PATINADOR) && patinador.usuarioId === usuario.id;
}

/**
 * Asignar o cambiar plan (M5-06, M5-07): el Administrador sobre cualquier
 * patinador, el Acudiente sobre los suyos y el patinador mayor de edad sobre sí
 * mismo. Un menor no confirma su plan por sí mismo y necesita acudiente
 * asociado (M2-04).
 */
export function validarGestionDePlan(
  usuario: UsuarioAutenticado,
  patinador: ContextoPatinador | null,
): asserts patinador is ContextoPatinador {
  if (!patinador) {
    throw new NotFoundException('El patinador no existe');
  }

  const actuaPorOtro =
    usuario.roles.includes(Rol.ADMINISTRADOR) || esAcudienteDe(usuario, patinador);
  if (!actuaPorOtro && !esElPatinador(usuario, patinador)) {
    throw new ForbiddenException('No puedes gestionar el plan de este patinador');
  }
  if (!actuaPorOtro && patinador.esMenor) {
    throw new ForbiddenException(
      'Un patinador menor de edad no puede asignar ni cambiar su plan; debe hacerlo su acudiente',
    );
  }
  if (!patinador.activo) {
    throw new ConflictException('El patinador está inactivo');
  }
  if (patinador.esMenor && patinador.acudienteIds.length === 0) {
    throw new ConflictException('Asocia un acudiente antes de asignar un plan');
  }
}

/**
 * Consultar plan y cobros (§5.4 de REQUIREMENTS): Administrador y Contador ven
 * a todos, el Acudiente solo a sus patinadores y el patinador solo a sí mismo
 * si es mayor de edad (el menor no ve pagos, M5-18).
 */
export function validarConsultaDePagos(
  usuario: UsuarioAutenticado,
  patinador: ContextoPatinador | null,
): asserts patinador is ContextoPatinador {
  if (!patinador) {
    throw new NotFoundException('El patinador no existe');
  }
  if (usuario.roles.includes(Rol.ADMINISTRADOR) || usuario.roles.includes(Rol.CONTADOR)) {
    return;
  }
  if (esAcudienteDe(usuario, patinador)) {
    return;
  }
  if (esElPatinador(usuario, patinador) && !patinador.esMenor) {
    return;
  }
  throw new ForbiddenException('No puedes consultar los pagos de este patinador');
}
