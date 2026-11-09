import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ROLES_AUTORREGISTRO, type RolAutorregistro } from '../enums/rol-autorregistro.enum.js';

export const LONGITUD_MINIMA_CONTRASENA = 8;

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** El correo es único sin distinguir mayúsculas (índice usuario_correo_uk); se guarda en minúsculas. */
export const normalizarCorreo = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Entrada de RF-M1-01: una persona crea su propia cuenta desde la pantalla de acceso. */
export class RegistrarUsuarioDto {
  @Transform(recortar)
  @MaxLength(80, { message: 'Los nombres no pueden superar 80 caracteres' })
  @Matches(/\S/, { message: 'Escribe tus nombres' })
  @IsString({ message: 'Escribe tus nombres' })
  nombres: string;

  @Transform(recortar)
  @MaxLength(80, { message: 'Los apellidos no pueden superar 80 caracteres' })
  @Matches(/\S/, { message: 'Escribe tus apellidos' })
  @IsString({ message: 'Escribe tus apellidos' })
  apellidos: string;

  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido, por ejemplo sofia@example.com' })
  correo: string;

  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @Matches(/(?=.*\p{L})(?=.*\d)/u, { message: 'La contraseña debe tener al menos una letra y un número' })
  @MinLength(LONGITUD_MINIMA_CONTRASENA, {
    message: `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres`,
  })
  @IsString({ message: 'Escribe una contraseña' })
  contrasena: string;

  @IsIn(ROLES_AUTORREGISTRO, { message: 'Elige si te registras como patinador, acudiente, profesor o visitante' })
  rol: RolAutorregistro;
}
