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
import type { RegistrarPolizaDto } from '../dto/registrar-poliza.dto.js';

export const MENSAJE_SIN_ACCESO_POLIZA =
  'No puedes consultar la póliza de este patinador.';
export const MENSAJE_POLIZA_PATINADOR_INACTIVO =
  'El patinador está inactivo; no se puede registrar la póliza.';
export const MENSAJE_POLIZA_SOLO_MENOR =
  'Solo los patinadores menores de edad requieren póliza médica.';
export const MENSAJE_POLIZA_SIN_ACUDIENTE =
  'Vincula un acudiente al patinador antes de registrar la póliza.';
export const MENSAJE_FECHA_INVALIDA =
  'La fecha de la póliza no es válida.';
export const MENSAJE_FECHAS_INVERTIDAS =
  'La fecha de fin no puede ser anterior a la fecha de inicio.';
export const MENSAJE_POLIZA_DUPLICADA =
  'Ya existe una póliza con ese número para este patinador.';

export interface DatosPoliza {
  aseguradora: string;
  numeroPoliza: string;
  vigenteDesde: string;
  vigenteHasta: string;
}

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
 * Privacidad de M1: el Administrador ve a todos y el Acudiente solo a los
 * patinadores vinculados a su cuenta. Un tercero recibe 403.
 */
export function validarConsultaPoliza(
  usuario: UsuarioAutenticado,
  patinador: PatinadorConAutorizacion | null,
): asserts patinador is PatinadorConAutorizacion {
  if (!patinador) throw new NotFoundException('El patinador no existe.');
  if (!esAdministrador(usuario) && !esAcudienteVinculado(usuario, patinador)) {
    throw new ForbiddenException(MENSAJE_SIN_ACCESO_POLIZA);
  }
}

/**
 * CA-01 y CA-04: solo un patinador menor, activo y vinculado a un acudiente
 * puede recibir una póliza. No se limita el número de pólizas: «reemplazar»
 * conserva el historial.
 */
export function validarRegistroPoliza(
  usuario: UsuarioAutenticado,
  patinador: PatinadorConAutorizacion | null,
): asserts patinador is PatinadorConAutorizacion {
  validarConsultaPoliza(usuario, patinador);
  if (!patinador.activo) {
    throw new ConflictException(MENSAJE_POLIZA_PATINADOR_INACTIVO);
  }
  if (!patinador.esMenor) {
    throw new ConflictException(MENSAJE_POLIZA_SOLO_MENOR);
  }
  if (patinador.acudientes.length === 0) {
    throw new ConflictException(MENSAJE_POLIZA_SIN_ACUDIENTE);
  }
}

/** CA-02: exige fechas reales y que el fin no sea anterior al inicio. */
export function validarDatosPoliza(dto: RegistrarPolizaDto): DatosPoliza {
  const aseguradora = dto.aseguradora.trim();
  const numeroPoliza = dto.numeroPoliza.trim();
  const vigenteDesde = dto.vigenteDesde.trim();
  const vigenteHasta = dto.vigenteHasta.trim();

  if (!esFechaValida(vigenteDesde) || !esFechaValida(vigenteHasta)) {
    throw new BadRequestException(MENSAJE_FECHA_INVALIDA);
  }
  if (vigenteHasta < vigenteDesde) {
    throw new BadRequestException(MENSAJE_FECHAS_INVERTIDAS);
  }
  return { aseguradora, numeroPoliza, vigenteDesde, vigenteHasta };
}

/** Comprueba que 'AAAA-MM-DD' exista en el calendario (rechaza 2026-02-31). */
export function esFechaValida(iso: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) return false;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}
