import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizarCorreo } from './crear-cuenta.dto.js';

// Entradas de HU-M1-08. La política de la contraseña nueva (CA-04) se revisa en
// el servicio para devolver cada condición que falta, no solo «inválida».

/** El token del enlace: 32 bytes en base64url (43 caracteres). */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export class SolicitarRecuperacionDto {
  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  correo: string;
}

export class TokenRecuperacionDto {
  @Matches(TOKEN, { message: 'El enlace no es válido: ya se usó, venció o no existe. Pide uno nuevo.' })
  @IsString({ message: 'Falta el enlace de recuperación' })
  token: string;
}

export class RestablecerContrasenaDto extends TokenRecuperacionDto {
  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @IsString({ message: 'Escribe la nueva contraseña' })
  contrasena: string;
}

export class CambiarContrasenaDto {
  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @MinLength(1, { message: 'Escribe tu contraseña actual' })
  @IsString({ message: 'Escribe tu contraseña actual' })
  contrasenaActual: string;

  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @IsString({ message: 'Escribe la nueva contraseña' })
  contrasenaNueva: string;
}
